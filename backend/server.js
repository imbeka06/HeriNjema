const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allows the frontend app & dashboard to communicate with this API
app.use(express.json()); // Parses incoming JSON payloads
app.use(express.urlencoded({ extended: true })); // Crucial for parsing USSD payload structures

// Database Connection Pool (Connects to our PostgreSQL schema)
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test DB Connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('HeriNjema Core Database Connected Successfully.');
    release();
});

//  API ROUTES WILL GO HERE 

// Start the server
app.listen(PORT, () => {
    console.log(`HeriNjema API Server is running on port ${PORT}`);
});

// Route: Book a new appointment via Smartphone App
app.post('/api/appointments/book', async (req, res) => {
    const { patient_id, doctor_id, appointment_time, is_emergency, priority_type } = req.body;

    try {
        const newAppointment = await pool.query(
            `INSERT INTO Appointments (patient_id, doctor_id, appointment_time, is_emergency, priority_type) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [patient_id, doctor_id, appointment_time, is_emergency, priority_type]
        );

        // If it's an emergency, trigger real-time alert to Reception Dashboard (e.g., via WebSockets)
        if (is_emergency) {
            console.log(`EMERGENCY ALERT TRIGGERED: Priority - ${priority_type}`);
            // Logic to ping the hospital dashboard goes here
        }

        res.status(201).json({
            success: true,
            message: 'Appointment confirmed.',
            data: newAppointment.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error during booking');
    }
});