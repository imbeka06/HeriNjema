// ============================================================================
// File: src/models/User.js
// Database model for User authentication & management
// ============================================================================

const pool = require('../config/db');
const bcrypt = require('bcrypt');

class User {
    // Create a new user (register)
    static async create(user_data) {
        const {
            phone_number,
            email,
            password,
            first_name,
            last_name,
            user_type
        } = user_data;

        // Hash the password
        const password_hash = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO Users
            (phone_number, email, password_hash, first_name, last_name, user_type, is_verified)
            VALUES ($1, $2, $3, $4, $5, $6, false)
            RETURNING user_id, phone_number, email, first_name, last_name, user_type, is_verified, created_at
        `;

        const values = [phone_number, email, password_hash, first_name, last_name, user_type];

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('User with this phone number or email already exists');
            }
            throw new Error(`Database error creating user: ${error.message}`);
        }
    }

    // Find user by phone number
    static async findByPhone(phone_number) {
        const query = `
            SELECT * FROM Users WHERE phone_number = $1
        `;

        try {
            const result = await pool.query(query, [phone_number]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error finding user: ${error.message}`);
        }
    }

    // Find user by email
    static async findByEmail(email) {
        const query = `
            SELECT * FROM Users WHERE email = $1
        `;

        try {
            const result = await pool.query(query, [email]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error finding user: ${error.message}`);
        }
    }

    // Find user by user_id
    static async findById(user_id) {
        const query = `
            SELECT user_id, phone_number, email, first_name, last_name, user_type, is_verified, is_active, created_at
            FROM Users 
            WHERE user_id = $1
        `;

        try {
            const result = await pool.query(query, [user_id]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Database error finding user: ${error.message}`);
        }
    }

    // Verify password (for login)
    static async verifyPassword(plain_password, password_hash) {
        try {
            return await bcrypt.compare(plain_password, password_hash);
        } catch (error) {
            throw new Error(`Error verifying password: ${error.message}`);
        }
    }

    // Mark user as verified (after OTP verification)
    static async markAsVerified(user_id) {
        const query = `
            UPDATE Users
            SET is_verified = true, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
            RETURNING user_id, phone_number, email, is_verified
        `;

        try {
            const result = await pool.query(query, [user_id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error verifying user: ${error.message}`);
        }
    }

    // Update user profile
    static async updateProfile(user_id, updates) {
        const allowed_fields = ['first_name', 'last_name', 'email', 'biometric_id'];
        const fields = Object.keys(updates).filter(key => allowed_fields.includes(key));

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        const set_clause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
        const values = fields.map(field => updates[field]);
        values.push(user_id);

        const query = `
            UPDATE Users
            SET ${set_clause}, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $${values.length}
            RETURNING user_id, phone_number, email, first_name, last_name, is_verified
        `;

        try {
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Database error updating user: ${error.message}`);
        }
    }
}

module.exports = User;
