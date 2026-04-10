// File: src/controllers/billingController.js
const { verifySHACoverage } = require('../services/shaService');
const { initiateSTKPush } = require('../services/mpesaService');
// Assume you have a DB model for invoices/transactions
// const Invoice = require('../models/Invoice'); 
// const Transaction = require('../models/Transaction');

const processPayment = async (req, res) => {
    // 1. Inputs should include an identifier, not just the raw amount
    const { appointment_id, patient_phone, sha_number } = req.body;

    if (!appointment_id || !patient_phone) {
        return res.status(400).json({ 
            success: false, 
            message: "Missing required fields: appointment_id and patient_phone." 
        });
    }

    try {
        // 2. SECURITY: Always fetch the actual bill from your database.
        // Never trust req.body.total_bill from the frontend.
        /* const invoice = await Invoice.findOne({ appointment_id });
        if (!invoice) throw new Error("Invoice not found");
        const total_bill = invoice.amount; 
        */
        const total_bill = 5000; // Mocked for now: Fetch this from DB!
        
        console.log(`[Billing] Processing HeriNjema payment of KSh ${total_bill} for appointment ${appointment_id}.`);

        let outOfPocketBalance = total_bill;
        let shaCoveredAmount = 0;

        // 3. Process SHA Insurance
        if (sha_number) {
            try {
                const shaStatus = await verifySHACoverage(sha_number);
                
                if (shaStatus.success && shaStatus.status === 'ACTIVE') {
                    shaCoveredAmount = Math.min(shaStatus.coverageLimit, total_bill);
                    outOfPocketBalance = total_bill - shaCoveredAmount;
                    
                    console.log(`[Billing] SHA applied! Covered: KSh ${shaCoveredAmount}. Remaining: KSh ${outOfPocketBalance}`);
                } else {
                    console.log(`[Billing] SHA validation failed or inactive. Proceeding with full out-of-pocket.`);
                }
            } catch (shaError) {
                // Log SHA error but don't crash the whole payment process
                console.warn("[Billing] SHA Service unavailable. Defaulting to full cash payment.", shaError.message);
            }
        }

        // 4. Process M-Pesa STK Push
        let mpesaResponse = null;
        if (outOfPocketBalance > 0) {
            // Initiate the push
            mpesaResponse = await initiateSTKPush(patient_phone, outOfPocketBalance, `HeriNjema_Copay_${appointment_id}`);
            
            if (!mpesaResponse || !mpesaResponse.CheckoutRequestID) {
                throw new Error("Failed to get CheckoutRequestID from Safaricom.");
            }

            // 5. CRITICAL: Save the pending transaction to the database
            // You MUST do this so your callback URL knows what to update when Safaricom replies
            /*
            await Transaction.create({
                appointment_id,
                checkout_request_id: mpesaResponse.CheckoutRequestID,
                amount: outOfPocketBalance,
                status: 'PENDING',
                payment_method: 'MPESA'
            });
            */
        } else {
            // 5b. If SHA covered everything, mark invoice as paid immediately
            /*
            await Invoice.updateOne({ appointment_id }, { status: 'PAID', paid_via: 'SHA' });
            */
        }

        // 6. Return the digital receipt
        return res.status(200).json({
            success: true,
            message: outOfPocketBalance > 0 
                ? "Please check your phone to enter your M-Pesa PIN." 
                : "Bill fully covered by SHA. You are cleared to go!",
            receipt: {
                total_bill,
                sha_deduction: shaCoveredAmount,
                amount_due_via_mpesa: outOfPocketBalance,
                mpesa_tracking_id: mpesaResponse ? mpesaResponse.CheckoutRequestID : null,
                status: outOfPocketBalance > 0 ? "PENDING_MPESA" : "PAID"
            }
        });

    } catch (error) {
        console.error("[Billing Flow Error]:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to process payment. Please try again or contact administration.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const mpesaCallback = async (req, res) => {
    console.log("------- M-PESA CALLBACK RECEIVED -------");
    
    try {
        // Safaricom wraps the important data inside Body.stkCallback
        const callbackData = req.body?.Body?.stkCallback;
        
        if (!callbackData) {
            console.error("Invalid M-Pesa payload received:", req.body);
            return res.status(400).json({ ResultCode: 1, ResultDesc: "Invalid Payload" });
        }

        const resultCode = callbackData.ResultCode;
        const resultDesc = callbackData.ResultDesc;
        const checkoutRequestID = callbackData.CheckoutRequestID;

        console.log(`[Webhook] CheckoutRequestID: ${checkoutRequestID}`);
        console.log(`[Webhook] Result: ${resultDesc} (Code: ${resultCode})`);

        if (resultCode === 0) {
            // Transaction was SUCCESSFUL
            // We need to dig into the CallbackMetadata array to find the actual M-Pesa Receipt Number
            const callbackMetadata = callbackData.CallbackMetadata.Item;
            const receiptItem = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber');
            const mpesaReceiptNumber = receiptItem ? receiptItem.Value : 'UNKNOWN';

            console.log(`[Webhook] ✅ Payment successful! Receipt: ${mpesaReceiptNumber}`);

            // TODO: Database Updates
            // 1. Find the Transaction where checkout_request_id === checkoutRequestID
            // 2. Update its status to 'SUCCESS' and save the mpesaReceiptNumber
            // 3. Update the associated Invoice status to 'PAID'

        } else {
            // Transaction FAILED, TIMED OUT, or CANCELLED by user (Code 1032)
            console.log(`[Webhook] ❌ Payment failed or cancelled.`);
            
            // TODO: Database Updates
            // 1. Find the Transaction where checkout_request_id === checkoutRequestID
            // 2. Update its status to 'FAILED' or 'CANCELLED'
        }

        // Safaricom expects a simple success acknowledgment. 
        // If you don't send this, they will keep retrying the webhook.
        res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });

    } catch (error) {
        console.error("[Webhook Error]:", error);
        // Even if your DB logic fails, acknowledge Safaricom so they stop hammering your server
        res.status(200).json({ ResultCode: 1, ResultDesc: "Internal Error, but received" });
    }
};

module.exports = { processPayment, mpesaCallback };