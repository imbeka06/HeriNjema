// ============================================================================
// File: src/routes/ussdRoutes.js
// USSD routing for Africa's Talking integration
// ============================================================================

const express = require('express');
const router = express.Router();
const USSDController = require('../controllers/ussdController');

/**
 * USSD GATEWAY FLOW:
 * Africa's Talking receives USSD request -> POST to /api/ussd/callback
 * We parse the menu level and return the appropriate response back to their API
 * Africa's Talking then displays it on the user's phone
 */

// Main USSD callback endpoint (Africa's Talking will POST here)
router.post('/callback', USSDController.handleUSSDRequest);

// Webhook for payment status updates from Africa's Talking / M-Pesa
router.post('/payment-notification', USSDController.handlePaymentNotification);

// Build session restoration (if a USSD session times out and needs to resume)
router.get('/session/:session_id', USSDController.getSessionData);

module.exports = router;
