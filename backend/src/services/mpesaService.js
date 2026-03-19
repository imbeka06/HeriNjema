// File: src/services/mpesaService.js
const axios = require('axios');

// Helper function to generate Safaricom's required timestamp (YYYYMMDDHHMMSS)
const getTimestamp = () => {
    const date = new Date();
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
};

const initiateSTKPush = async (phoneNumber, amount, reference) => {
    // Safaricom strictly requires the 254 format (e.g., 254712345678)
    const formattedPhone = phoneNumber.startsWith('0') ? `254${phoneNumber.slice(1)}` : phoneNumber;
    
    console.log(`[M-Pesa Service] Sending STK Push to ${formattedPhone} for KSh ${amount}`);

    try {
        // ====================================================================
        // REAL DARAJA API CALL (Ready for when you create a Safaricom Dev Account)
        // ====================================================================
        /*
        const shortCode = process.env.MPESA_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;
        const timestamp = getTimestamp();
        const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

        // Note: You must first get an OAuth Token from Daraja before making this call
        // const token = await getMpesaToken(); 

        const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            "BusinessShortCode": shortCode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": formattedPhone,
            "PartyB": shortCode,
            "PhoneNumber": formattedPhone,
            "CallBackURL": `${process.env.SERVER_URL}/api/billing/mpesa-webhook`, // Where M-Pesa sends the success receipt
            "AccountReference": reference, // e.g., "Consultation"
            "TransactionDesc": "HeriNjema Medical Bill"
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
        */

        // ====================================================================
        // SIMULATED RESPONSE (For testing our backend today)
        // ====================================================================
        return {
            success: true,
            MerchantRequestID: "req_29384729",
            CheckoutRequestID: "ws_CO_19032026131927",
            ResponseCode: "0",
            ResponseDescription: "Success. Request accepted for processing",
            CustomerMessage: "Success. Request accepted for processing"
        };
    } catch (error) {
        console.error('[M-Pesa Service Error]', error.message);
        throw new Error('Failed to initiate M-Pesa STK Push');
    }
};

module.exports = { initiateSTKPush };