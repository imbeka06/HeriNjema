// ============================================================================
// File: src/models/Patient.js
// Database model for Patient operations
// ============================================================================

const pool = require('../config/db');

class Patient {
    // Create a new patient record
    static async create(patient_data) {
        const {
            user_id,
            date_of_birth,
            gender,
            blood_type,
            emergency_contact_phone,
            emergency_contact_name,
            insurance_provider,
            insurance_number,
            medical_allergies,
            chronic_conditions
        } = patient_data;

        const query = `
            INSERT INTO Patients 
            (user_id, date_of_birth, gender, blood_type, emergency_contact_phone, 
             emergency_contact_name, insurance_provider, insurance_number, 
             medical_allergies, chronic_conditions)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            user_id, date_of_birth, gender, blood_type, emergency_contact_phone,
            emergency_contact_name, insurance_provider, insurance_number,
            medical_allergies, chronic_conditions
        ];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error creating patient: ${error.message}`);
        }
    }

    // Find patient by patient_id
    static async findById(patient_id) {
        const query = `
            SELECT p.*, u.phone_number, u.email, u.first_name, u.last_name
            FROM Patients p
            JOIN Users u ON p.user_id = u.user_id
            WHERE p.patient_id = $1
        `;

        try {
            const result = await pool.query(query, [patient_id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error finding patient: ${error.message}`);
        }
    }

    // Find patient by phone number
    static async findByPhone(phone_number) {
        const query = `
            SELECT p.*, u.phone_number, u.email, u.first_name, u.last_name, u.user_id
            FROM Patients p
            JOIN Users u ON p.user_id = u.user_id
            WHERE u.phone_number = $1
        `;

        try {
            const result = await pool.query(query, [phone_number]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error finding patient by phone: ${error.message}`);
        }
    }

    // Update patient record
    static async update(patient_id, updates) {
        const allowed_fields = [
            'date_of_birth', 'gender', 'blood_type', 'emergency_contact_phone',
            'emergency_contact_name', 'insurance_provider', 'insurance_number',
            'medical_allergies', 'chronic_conditions'
        ];

        const fields = Object.keys(updates).filter(key => allowed_fields.includes(key));
        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        const set_clause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
        const values = fields.map(field => updates[field]);
        values.push(patient_id);

        const query = `
            UPDATE Patients
            SET ${set_clause}, updated_at = CURRENT_TIMESTAMP
            WHERE patient_id = $${values.length}
            RETURNING *
        `;

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error updating patient: ${error.message}`);
        }
    }
}

module.exports = Patient;
