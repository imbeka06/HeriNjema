// ============================================================================
// File: src/routes/authRoutes.js
// Authentication routes (Register, Login, OTP, Biometric)
// ============================================================================

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Register a new patient/user
router.post('/register', AuthController.register);

// Login with phone + password
router.post('/login', AuthController.login);

// Verify OTP (phone verification)
router.post('/verify-otp', AuthController.verifyOTP);

// Send OTP (resend)
router.post('/send-otp', AuthController.sendOTP);

// Biometric enrollment (link fingerprint/face to account)
router.post('/biometric/enroll', verifyToken, AuthController.enrollBiometric);

// Biometric login (fingerprint recognition)
router.post('/biometric/login', AuthController.biometricLogin);

// Logout
router.post('/logout', verifyToken, AuthController.logout);

// Get current user profile
router.get('/profile', verifyToken, AuthController.getProfile);

// Update profile
router.put('/profile', verifyToken, AuthController.updateProfile);

// Change password
router.post('/change-password', verifyToken, AuthController.changePassword);

module.exports = router;
