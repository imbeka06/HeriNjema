// File: src/routes/billingRoutes.js
const express = require('express');
const router = express.Router();

const requireAuth = require('../middlewares/authMiddleware');
const { processPayment } = require('../controllers/billingController');

// Secure this route so only authenticated patients can trigger payments
router.post('/pay', requireAuth, processPayment);

module.exports = router;