// File: src/controllers/appointmentController.js
const pool = require('../config/db');

const bookAppointment = async (req, res) => {
    // Extract data sent from the mobile app
    const { patient_id, doctor_id, appointment_time, is_emergency, priority_type } = req.body;

    try {
        // NOTE: We are just sending a success response for now to test the server.
        // Once your PostgreSQL tables are built, we will uncomment the real SQL query below!
        
        /* const newAppointment = await pool.query(
            `INSERT INTO Appointments (patient_id, doctor_id, appointment_time, is_emergency, priority_type) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [patient_id, doctor_id, appointment_time, is_emergency, priority_type]
        );
        */

        console.log(`New booking request received for patient: ${patient_id}`);

        res.status(201).json({
            success: true,
            message: 'Appointment booking endpoint reached successfully! Server is routing correctly.',
            // data: newAppointment.rows[0]
        });

    } catch (error) {
        console.error("Booking Error:", error.message);
        res.status(500).json({ success: false, message: 'Server Error during booking' });
    }
};

// Export the function so your routes file can find it
module.exports = { bookAppointment };