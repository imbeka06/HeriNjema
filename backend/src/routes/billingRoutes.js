// File: src/routes/billingRoutes.js
const express = require('express');
const router = express.Router();

const requireAuth = require('../middlewares/authMiddleware');
const { processPayment, mpesaCallback } = require('../controllers/billingController');

// Secure this route so only authenticated patients can trigger payments
router.post('/pay', requireAuth, processPayment);

// Webhook for Safaricom to hit with the final transaction result
// 🚨 CRITICAL: Do NOT put requireAuth here! Safaricom's servers do not have your user's JWT token.
router.post('/mpesa-callback', mpesaCallback);

module.exports = router;