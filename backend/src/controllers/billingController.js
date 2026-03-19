// File: src/controllers/billingController.js
const { verifySHACoverage } = require('../services/shaService');
const { initiateSTKPush } = require('../services/mpesaService');

const processPayment = async (req, res) => {
    // In a real app, you would fetch the total_bill from the database using the appointment_id
    const { patient_phone, sha_number, total_bill } = req.body;

    console.log(`[Billing] Processing payment of KSh ${total_bill} for patient.`);

    try {
        let outOfPocketBalance = total_bill;
        let shaApplied = false;
        let shaCoveredAmount = 0;

        // 1. Check Social Health Authority (SHA) Insurance First
        if (sha_number) {
            const shaStatus = await verifySHACoverage(sha_number);
            
            if (shaStatus.success && shaStatus.status === 'ACTIVE') {
                shaApplied = true;
                // Determine how much SHA covers vs the total bill
                shaCoveredAmount = Math.min(shaStatus.coverageLimit, total_bill);
                outOfPocketBalance = total_bill - shaCoveredAmount;
                
                console.log(`[Billing] SHA applied! Covered: KSh ${shaCoveredAmount}. Remaining: KSh ${outOfPocketBalance}`);
            }
        }

        // 2. Process M-Pesa Payment if there is a remaining balance
        let mpesaResponse = null;
        if (outOfPocketBalance > 0) {
            // Trigger the green pop-up on the patient's phone!
            mpesaResponse = await initiateSTKPush(patient_phone, outOfPocketBalance, "HeriNjema_Copay");
        }

        // 3. Send the transparent digital receipt back to the mobile app
        res.status(200).json({
            success: true,
            message: outOfPocketBalance > 0 
                ? "Please check your phone to enter your M-Pesa PIN." 
                : "Bill fully covered by SHA. You are cleared to go!",
            receipt: {
                total_bill: total_bill,
                sha_deduction: shaCoveredAmount,
                amount_due_via_mpesa: outOfPocketBalance,
                mpesa_tracking_id: mpesaResponse ? mpesaResponse.CheckoutRequestID : null
            }
        });

    } catch (error) {
        console.error("Billing Flow Error:", error.message);
        res.status(500).json({ success: false, message: 'Failed to process payment. Please try again.' });
    }
};

module.exports = { processPayment };