// ============================================================================
// File: server.js (The Main Entry Point for HeriNjema Backend)
// ============================================================================

const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Loads your secret variables from the .env file

// Initialize the Express App
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// 1. GLOBAL MIDDLEWARE
// ============================================================================
app.use(cors()); // Allows your mobile app and dashboard to talk to this API
app.use(express.json()); // Allows the server to understand JSON data
app.use(express.urlencoded({ extended: true })); // Required for parsing USSD inputs

// ============================================================================
// 2. DATABASE CONNECTION
// ============================================================================
//  import the database connection logic from config folder
// (Make sure to create db.js inside src/config/ later!)
const db = require('./src/config/db'); 

// ============================================================================
// 3. IMPORT ROUTES
// ============================================================================
//  uncommenting as I build the actual files in src/routes/
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
// const authRoutes = require('./src/routes/authRoutes');
// const ussdRoutes = require('./src/routes/ussdRoutes');
// const whatsappRoutes = require('./src/routes/whatsappRoutes');

// ============================================================================
// 4. MOUNT ROUTES (Directing the traffic)
// ============================================================================
// When a request comes to '/api/appointments', send it to the appointmentRoutes file
app.use('/api/appointments', appointmentRoutes);
app.use('/api/billing', billingRoutes);

// Future routes to be mounted:
// app.use('/api/auth', authRoutes);
// app.use('/api/ussd', ussdRoutes);
// app.use('/api/whatsapp', whatsappRoutes);

// ============================================================================
// 5. HEALTH CHECK ROUTE 
// ============================================================================
app.get('/', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'HeriNjema API Server is running and healthy!' 
    });
});

// ============================================================================
// 6. START THE SERVER
// ============================================================================
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 HeriNjema Backend running on http://localhost:${PORT}`);
    console.log(`=======================================================`);
});