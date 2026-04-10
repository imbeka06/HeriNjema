// ============================================================================
// File: src/models/Transaction.js
// Database model for Payment Transaction tracking
// ============================================================================

const pool = require('../config/db');

class Transaction {
    // Create a new transaction (M-Pesa, Card, etc.)
    static async create(transaction_data) {
        const {
            invoice_id,
            patient_id,
            appointment_id,
            amount,
            payment_method,
            checkout_request_id,
            merchant_request_id,
            transaction_reference
        } = transaction_data;

        const query = `
            INSERT INTO Transactions
            (invoice_id, patient_id, appointment_id, amount, payment_method, 
             checkout_request_id, merchant_request_id, transaction_reference, payment_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
            RETURNING *
        `;

        const values = [
            invoice_id, patient_id, appointment_id, amount, payment_method,
            checkout_request_id, merchant_request_id, transaction_reference
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error creating transaction: ${error.message}`);
        }
    }

    // Find transaction by checkout_request_id (from M-Pesa callback)
    static async findByCheckoutRequestId(checkout_request_id) {
        const query = `
            SELECT t.*, i.appointment_id, i.patient_id
            FROM Transactions t
            JOIN Invoices i ON t.invoice_id = i.invoice_id
            WHERE t.checkout_request_id = $1
        `;

        try {
            const result = await pool.query(query, [checkout_request_id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error finding transaction: ${error.message}`);
        }
    }

    // Update transaction with M-Pesa callback response
    static async updateWithCallback(transaction_id, callback_data) {
        const {
            payment_status,
            mpesa_receipt_number,
            payment_timestamp
        } = callback_data;

        const query = `
            UPDATE Transactions
            SET payment_status = $1, 
                mpesa_receipt_number = $2,
                payment_timestamp = $3,
                verified_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE transaction_id = $4
            RETURNING *
        `;

        const values = [payment_status, mpesa_receipt_number, payment_timestamp, transaction_id];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error updating transaction: ${error.message}`);
        }
    }

    // Get transaction history for a patient
    static async getHistoryForPatient(patient_id, limit = 10) {
        const query = `
            SELECT t.*, 
                   i.total_amount, i.invoice_status,
                   a.appointment_time,
                   h.name as hospital_name
            FROM Transactions t
            JOIN Invoices i ON t.invoice_id = i.invoice_id
            JOIN Appointments a ON i.appointment_id = a.appointment_id
            JOIN Hospitals h ON a.hospital_id = h.hospital_id
            WHERE t.patient_id = $1
            ORDER BY t.created_at DESC
            LIMIT $2
        `;

        try {
            const result = await pool.query(query, [patient_id, limit]);
            return result.rows;
        } catch (error) {
            throw new Error(`Database error fetching transaction history: ${error.message}`);
        }
    }
}

module.exports = Transaction;
