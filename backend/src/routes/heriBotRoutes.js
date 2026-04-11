// ============================================================================
// File: src/routes/heriBotRoutes.js
// HeriBot AI Triage System API Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const HeriBotController = require('../controllers/heriBotController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Most HeriBot routes work without authentication (for USSD/emergency)
// But we'll verify when coming from mobile app

// ============================================================================
// TRIAGE ANALYSIS ENDPOINTS
// ============================================================================

// Analyze symptoms and generate triage recommendation
router.post('/analyze', HeriBotController.analyzeTriage);

// Detailed triage with vitals
router.post('/analyze/with-vitals', HeriBotController.analyzeTriageWithVitals);

// Get triage history for patient
router.get('/history/:patient_id', verifyToken, HeriBotController.getTriageHistory);

// Get latest triage for patient
router.get('/latest/:patient_id', verifyToken, HeriBotController.getLatestTriage);

// ============================================================================
// INTERVIEW FLOW (Multi-step questionnaire)
// ============================================================================

// Start automated symptom interview
router.post('/interview/start', HeriBotController.startSymptomInterview);

// Continue symptom interview
router.post('/interview/continue', HeriBotController.continueInterview);

// Cancel interview
router.post('/interview/:session_id/cancel', HeriBotController.cancelInterview);

// ========================================================================
// RISK SCORING
// ========================================================================

// Calculate patient risk score for queue prioritization
router.post('/risk-score', verifyToken, HeriBotController.calculateRiskScore);

// Get hospital queue priority recommendations
router.get('/queue-priority/:hospital_id', HeriBotController.getQueuePriorityRecommendations);

module.exports = router;
