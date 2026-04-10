// ============================================================================
// File: src/utils/qrGenerator.js
// QR Code generation for digital receipts (eTIMS compliance)
// ============================================================================

// QR Code URL generator (using qrserver.com API)
const generateQRCode = (data) => {
    const encoded_data = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded_data}`;
};

// Format receipt data for QR code
const formatReceiptForQR = (transaction_data) => {
    return JSON.stringify({
        receipt_id: transaction_data.transaction_id,
        receipt_number: transaction_data.mpesa_receipt_number,
        hospital: transaction_data.hospital_name,
        patient_name: `${transaction_data.first_name} ${transaction_data.last_name}`,
        patient_phone: transaction_data.phone_number,
        total_amount: parseFloat(transaction_data.total_amount),
        sha_coverage: parseFloat(transaction_data.sha_coverage),
        patient_responsibility: parseFloat(transaction_data.patient_responsibility),
        amount_paid: parseFloat(transaction_data.amount),
        payment_method: transaction_data.payment_method,
        payment_timestamp: transaction_data.payment_timestamp,
        verification_code: `HERINJEMA-${Date.now()}`,
        etims_compliance: true
    });
};

module.exports = {
    generateQRCode,
    formatReceiptForQR
};
