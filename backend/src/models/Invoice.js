// ============================================================================
// File: src/models/Invoice.js
// Database model for Invoice & Billing operations
// ============================================================================

const pool = require('../config/db');

class Invoice {
    // Create invoice for an appointment
    static async create(invoice_data) {
        const {
            appointment_id,
            patient_id,
            hospital_id,
            total_amount,
            sha_coverage = 0,
            patient_responsibility,
            notes
        } = invoice_data;

        const query = `
            INSERT INTO Invoices
            (appointment_id, patient_id, hospital_id, total_amount, sha_coverage, patient_responsibility, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [appointment_id, patient_id, hospital_id, total_amount, sha_coverage, patient_responsibility, notes];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error creating invoice: ${error.message}`);
        }
    }

    // Get invoice by appointment_id
    static async getByAppointment(appointment_id) {
        const query = `
            SELECT i.*, 
                   a.appointment_time,
                   u.phone_number, u.first_name, u.last_name,
                   h.name as hospital_name
            FROM Invoices i
            JOIN Appointments a ON i.appointment_id = a.appointment_id
            JOIN Patients p ON i.patient_id = p.patient_id
            JOIN Users u ON p.user_id = u.user_id
            JOIN Hospitals h ON i.hospital_id = h.hospital_id
            WHERE i.appointment_id = $1
        `;

        try {
            const result = await pool.query(query, [appointment_id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error fetching invoice: ${error.message}`);
        }
    }

    // Get billing summary for hospital (auto-reconciliation)
    static async getBillingReconciliationForHospital(hospital_id, date_from, date_to) {
        const query = `
            SELECT 
                COUNT(*) as total_invoices,
                SUM(i.total_amount) as total_billing,
                SUM(i.sha_coverage) as total_sha_coverage,
                SUM(i.patient_responsibility) as total_patient_responsibility,
                SUM(CASE WHEN t.payment_status = 'SUCCESS' THEN t.amount ELSE 0 END) as total_mpesa_received,
                SUM(CASE WHEN i.invoice_status = 'PAID' THEN 1 ELSE 0 END) as invoices_paid,
                SUM(CASE WHEN i.invoice_status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END) as invoices_partial,
                SUM(CASE WHEN i.invoice_status = 'PENDING' THEN 1 ELSE 0 END) as invoices_pending,
                SUM(CASE WHEN i.invoice_status = 'OVERDUE' THEN 1 ELSE 0 END) as invoices_overdue
            FROM Invoices i
            LEFT JOIN Transactions t ON i.invoice_id = t.invoice_id
            JOIN Appointments a ON i.appointment_id = a.appointment_id
            WHERE i.hospital_id = $1
              AND a.appointment_time BETWEEN $2 AND $3
        `;

        try {
            const result = await pool.query(query, [hospital_id, date_from, date_to]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error fetching reconciliation: ${error.message}`);
        }
    }

    // Update invoice status
    static async updateStatus(invoice_id, new_status) {
        const query = `
            UPDATE Invoices
            SET invoice_status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE invoice_id = $2
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [new_status, invoice_id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error updating invoice: ${error.message}`);
        }
    }
}

module.exports = Invoice;
