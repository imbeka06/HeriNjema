// ============================================================================
// File: src/routes/hospitalRoutes.js
// Hospital Dashboard API (for staff/admin viewing)
// Live Triage Queue, Emergency Console, Billing Hub
// ============================================================================

const express = require('express');
const router = express.Router();
const HospitalController = require('../controllers/hospitalController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

// All hospital routes require authentication
router.use(verifyToken);

// ============================================================================
// LIVE TRIAGE QUEUE (Receptionist/Nurse View)
// ============================================================================

// Get live triage queue for hospital
router.get('/triage-queue/:hospital_id', authorize('HOSPITAL_STAFF', 'ADMIN'), 
    HospitalController.getLiveTriageQueue);

// Update patient admission status (Direct Admit toggle)
router.put('/triage-queue/:appointment_id/direct-admit', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    HospitalController.updateDirectAdmitStatus);

// Get patient pre-visit vitals
router.get('/patient/:patient_id/vitals', HospitalController.getPatientVitals);

// ============================================================================
// EMERGENCY CONSOLE (ER Staff View)
// ============================================================================

// Get active emergency alerts for hospital
router.get('/emergency-alerts/:hospital_id', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    HospitalController.getEmergencyAlerts);

// Respond to emergency alert
router.post('/emergency-alerts/:alert_id/respond', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    HospitalController.respondToEmergency);

// Get emergency patient context (vitals, location, history)
router.get('/emergency-alerts/:alert_id/context', 
    HospitalController.getEmergencyContext);

// ============================================================================
// BILLING & CLAIMS HUB (Finance/Admin View)
// ============================================================================

// Get billing reconciliation summary for hospital
router.get('/billing/reconciliation/:hospital_id', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    HospitalController.getBillingReconciliation);

// Get detailed billing breakdown for a specific appointment/invoice
router.get('/billing/invoice/:invoice_id', 
    HospitalController.getInvoiceDetails);

// Digital audit trail for a transaction
router.get('/billing/audit-trail/:transaction_id', 
    HospitalController.getAuditTrail);

// Generate digital receipt with QR code (eTIMS compliance)
router.get('/billing/receipt/:transaction_id/generate-qr', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    HospitalController.generateQRReceipt);

// ============================================================================
// APPOINTMENT MANAGEMENT
// ============================================================================

// Update appointment status (PENDING -> CONFIRMED -> COMPLETED)
router.put('/appointments/:appointment_id/status', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    HospitalController.updateAppointmentStatus);

// Mark appointment as completed (after seeing doctor)
router.post('/appointments/:appointment_id/complete', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    HospitalController.completeAppointment);

module.exports = router;
