// File: src/routes/whatsappRoutes.js
const express = require('express');
const router = express.Router();
const { verifyWebhook, receiveMessage } = require('../controllers/whatsappController');

// GET request is used by Meta to verify the connection
router.get('/webhook', verifyWebhook);

// POST request is used when a patient actually sends a message
router.post('/webhook', receiveMessage);

module.exports = router;