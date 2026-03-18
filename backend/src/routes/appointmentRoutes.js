// File: src/routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();

// 1. Import your security middleware
const requireAuth = require('../middlewares/authMiddleware');

// 2. Import your controller (the actual logic for booking)

const { bookAppointment } = require('../controllers/appointmentController');

// 3. THE ROUTE WITH SECURITY APPLIED

router.post('/book', requireAuth, bookAppointment);


// router.get('/doctors', getAvailableDoctors);

module.exports = router;