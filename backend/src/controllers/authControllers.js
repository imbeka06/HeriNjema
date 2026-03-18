// src/controllers/authController.js
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// In a real app, this comes from src/config/db.js
const pool = new Pool(); 

// 1. REGISTER BIOMETRIC DEVICE (Called once when the user sets up the app)
const registerDevice = async (req, res) => {
    const { phone_number, first_name, last_name, dob, device_public_key } = req.body;

    try {
        // We hash the public key or a secure PIN to store it safely
        const hashedKey = await bcrypt.hash(device_public_key, 10);

        const newPatient = await pool.query(
            `INSERT INTO Patients (first_name, last_name, phone_number, date_of_birth, biometric_hash) 
             VALUES ($1, $2, $3, $4, $5) RETURNING patient_id, first_name`,
            [first_name, last_name, phone_number, dob, hashedKey]
        );

        res.status(201).json({
            success: true,
            message: "Device and Biometrics registered successfully.",
            patient: newPatient.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error during registration" });
    }
};

// 2. BIOMETRIC LOGIN (Called every time they scan their finger to use the app)
const loginWithBiometric = async (req, res) => {
    const { phone_number, device_signature } = req.body;

    try {
        // Find the patient
        const patientRecord = await pool.query(
            `SELECT * FROM Patients WHERE phone_number = $1`,
            [phone_number]
        );

        if (patientRecord.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }

        const patient = patientRecord.rows[0];

        // Verify the device signature matches the stored hash
        const isMatch = await bcrypt.compare(device_signature, patient.biometric_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Biometric authentication failed." });
        }

        // BIOMETRIC SUCCESS Issue a secure JWT Session Token
        // This token is like a digital wristband allowing them to book/pay without logging in again
        const sessionToken = jwt.sign(
            { patient_id: patient.patient_id, phone: patient.phone_number },
            process.env.JWT_SECRET, // Make sure to add JWT_SECRET="your_secret_key" to your .env file
            { expiresIn: '1h' } // Token expires in 1 hour for medical security
        );

        res.status(200).json({
            success: true,
            message: "Authentication successful.",
            token: sessionToken
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Login error" });
    }
};

module.exports = { registerDevice, loginWithBiometric };