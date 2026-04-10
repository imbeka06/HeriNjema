// ============================================================================
// File: src/models/Appointment.js
// Database model for Appointment operations
// ============================================================================

const pool = require('../config/db');

class Appointment {
    // Create an appointment
    static async create(appointment_data) {
        const {
            patient_id,
            doctor_id,
            hospital_id,
            appointment_time,
            is_emergency,
            priority_level,
            chief_complaint,
            triage_score,
            booking_method,
            notes,
            created_via_app
        } = appointment_data;

        const query = `
            INSERT INTO Appointments
            (patient_id, doctor_id, hospital_id, appointment_time, is_emergency, 
             priority_level, chief_complaint, triage_score, booking_method, notes, created_via_app)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            patient_id, doctor_id, hospital_id, appointment_time, is_emergency,
            priority_level, chief_complaint, triage_score, booking_method, notes, created_via_app
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error creating appointment: ${error.message}`);
        }
    }

    // Get upcoming appointments for a patient
    static async getUpcomingForPatient(patient_id, limit = 5) {
        const query = `
            SELECT a.*, 
                   d.specialty, u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                   h.name as hospital_name
            FROM Appointments a
            JOIN Doctors d ON a.doctor_id = d.doctor_id
            JOIN Users u ON d.user_id = u.user_id
            JOIN Hospitals h ON a.hospital_id = h.hospital_id
            WHERE a.patient_id = $1 
              AND a.appointment_time > CURRENT_TIMESTAMP
              AND a.appointment_status IN ('PENDING', 'CONFIRMED')
            ORDER BY a.appointment_time ASC
            LIMIT $2
        `;

        try {
            const result = await pool.query(query, [patient_id, limit]);
            return result.rows;
        } catch (error) {
            throw new Error(`Database error fetching appointments: ${error.message}`);
        }
    }

    // Get all appointments for a hospital with live queue sorting
    static async getLiveTriageQueueForHospital(hospital_id, limit = 50) {
        const query = `
            SELECT a.*, 
                   u.phone_number, u.first_name, u.last_name,
                   p.blood_type, p.emergency_contact_phone,
                   tr.recommended_priority, tr.ai_assessment,
                   d.specialty, 
                   i.invoice_status, i.total_amount, i.sha_coverage,
                   t.payment_status
            FROM Appointments a
            JOIN Patients p ON a.patient_id = p.patient_id
            JOIN Users u ON p.user_id = u.user_id
            LEFT JOIN Doctors d ON a.doctor_id = d.doctor_id
            LEFT JOIN TriageRecords tr ON a.appointment_id = tr.appointment_id
            LEFT JOIN Invoices i ON a.appointment_id = i.appointment_id
            LEFT JOIN Transactions t ON i.invoice_id = t.invoice_id
            WHERE a.hospital_id = $1 
              AND a.appointment_status IN ('CONFIRMED', 'PENDING')
              AND a.appointment_time <= NOW() + INTERVAL '2 hours'
            ORDER BY a.priority_level DESC, a.appointment_time ASC
            LIMIT $2
        `;

        try {
            const result = await pool.query(query, [hospital_id, limit]);
            return result.rows;
        } catch (error) {
            throw new Error(`Database error fetching live queue: ${error.message}`);
        }
    }

    // Update appointment status
    static async updateStatus(appointment_id, new_status) {
        const query = `
            UPDATE Appointments
            SET appointment_status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE appointment_id = $2
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [new_status, appointment_id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error updating appointment: ${error.message}`);
        }
    }

    // Find by appointment_id
    static async findById(appointment_id) {
        const query = `
            SELECT a.*, 
                   u.phone_number, u.first_name, u.last_name,
                   h.name as hospital_name
            FROM Appointments a
            JOIN Patients p ON a.patient_id = p.patient_id
            JOIN Users u ON p.user_id = u.user_id
            JOIN Hospitals h ON a.hospital_id = h.hospital_id
            WHERE a.appointment_id = $1
        `;

        try {
            const result = await pool.query(query, [appointment_id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error finding appointment: ${error.message}`);
        }
    }
}

module.exports = Appointment;
