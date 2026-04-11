// ============================================================================
// File: server.js (The Main Entry Point for HeriNjema Backend)
// ============================================================================

const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config(); // Loads your secret variables from the .env file

// Initialize the Express App
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
// 2.5 SWAGGER CONFIGURATION
// ============================================================================
const { swaggerUi, specs } = require('../swagger'); 

// ============================================================================
// 3. IMPORT ROUTES
// ============================================================================
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const authRoutes = require('./src/routes/authRoutes');
const ussdRoutes = require('./src/routes/ussdRoutes');
const whatsappRoutes = require('./src/routes/whatsappRoutes');
const hospitalRoutes = require('./src/routes/hospitalRoutes');
const fhirRoutes = require('./src/routes/fhirRoutes');
const heriBotRoutes = require('./src/routes/heriBotRoutes');
const realtimeRoutes = require('./src/routes/realtimeRoutes');
const { handleWebSocketConnection } = require('./src/services/websocketHandler');

// ============================================================================
// 4. MOUNT ROUTES (Directing the traffic)
// ============================================================================
app.use('/api/appointments', appointmentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ussd', ussdRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/fhir', fhirRoutes);
app.use('/api/heribot', heriBotRoutes);
app.use('/api/realtime', realtimeRoutes);

// ============================================================================
// 4.6 SWAGGER DOCUMENTATION
// ============================================================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { 
    swaggerOptions: { 
        url: '/api/swagger.json'
    }
}));

app.get('/api/swagger.json', (req, res) => {
    res.json(specs);
});

// ============================================================================
// 4.5 WEBSOCKET SETUP
// ============================================================================
wss.on('connection', handleWebSocketConnection);
console.log('[WS] WebSocket server initialized');

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
// 6. ERROR HANDLING MIDDLEWARE
// ============================================================================
const { errorHandler } = require('./src/utils/errorHandler');
app.use(errorHandler);

// ============================================================================
// 7. START THE SERVER
// ============================================================================
server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` HeriNjema Backend running on http://localhost:${PORT}`);
    console.log(` WebSocket available at ws://localhost:${PORT}`);
    console.log(`=======================================================`);
});