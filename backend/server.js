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

// Route: USSD Endpoint (e.g., Africa's Talking integration)
app.post('/api/ussd', (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;
    let response = '';

    // 'text' contains the user's input (e.g., '1*2' means they pressed 1 then 2)
    if (text === '') {
        // First screen when dialing *384*123#
        response = `CON Welcome to HeriNjema
        1. Book Appointment
        2. View Last Visit Summary
        3. Check Billing Balance`;
    } else if (text === '1') {
        // User selected Book Appointment
        response = `CON Select Service:
        1. General Consultation
        2. Priority (Pregnancy/Diabetes)`;
    } else if (text === '3') {
        // Example: User selected Billing Balance
        response = `END Your outstanding balance is KSh 0.00. NHIF applied successfully to last visit.`;
    } else {
        response = `END Invalid input. Please try again.`;
    }

    // Send response back to the telecom provider in plain text
    res.set('Content-Type', 'text/plain');
    res.send(response);
});

// Route: WhatsApp Webhook (Meta/Twilio API integration)
app.post('/api/whatsapp/webhook', async (req, res) => {
    // 1. Extract the incoming message and phone number
    const incomingMsg = req.body.Body; 
    const senderPhone = req.body.From;

    console.log(`Message received on HeriNjema Bot from ${senderPhone}: ${incomingMsg}`);

    // 2. Pass message to AI Logic (e.g., Dialogflow or custom prompt)
    // const aiResponse = await processWithHeriBot(incomingMsg);
    
    // 3. Example static routing for now
    let reply = "Hello! I am HeriBot. How can I assist with your health today?";
    if (incomingMsg.toLowerCase().includes("emergency") || incomingMsg.includes("pain")) {
        reply = "[SERIOUS] Please go to the nearest emergency room immediately, or press the red button on the HeriNjema app.";
    }

    // 4. Send the reply back via the WhatsApp API provider
    res.status(200).json({ reply: reply }); 
});    
          