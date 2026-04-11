// ============================================================================
// File: src/routes/fhirRoutes.js
// FHIR Data Exchange Endpoints for Hospital EMR Integration
// ============================================================================

const express = require('express');
const router = express.Router();
const FHIRController = require('../controllers/fhirController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

// All FHIR routes require authentication
router.use(verifyToken);

// ============================================================================
// PATIENT RESOURCE ENDPOINTS
// ============================================================================

// Push patient data to hospital EMR
router.post('/patients/:patient_id/push-to-emr', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    FHIRController.pushPatientToEMR);

// Get patient FHIR representation
router.get('/patients/:patient_id/fhir', 
    FHIRController.getPatientFHIR);

// ============================================================================
// OBSERVATION (VITALS) ENDPOINTS
// ============================================================================

// Push patient vitals to EMR
router.post('/observations/vitals/:vital_id/push-to-emr', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    FHIRController.pushVitalsToEMR);

// Get vitals in FHIR format
router.get('/observations/vitals/:patient_id', 
    FHIRController.getVitalsFHIR);

// ============================================================================
// APPOINTMENT ENDPOINTS
// ============================================================================

// Push appointment to EMR
router.post('/appointments/:appointment_id/push-to-emr', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    FHIRController.pushAppointmentToEMR);

// Get appointment in FHIR format
router.get('/appointments/:appointment_id/fhir', 
    FHIRController.getAppointmentFHIR);

// ============================================================================
// ENCOUNTER ENDPOINTS
// ============================================================================

// Push encounter (hospital visit) to EMR
router.post('/encounters/:appointment_id/push-to-emr', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    FHIRController.pushEncounterToEMR);

// Pull encounter data from EMR
router.get('/encounters/patient/:patient_id/pull-from-emr', 
    FHIRController.pullEncounterFromEMR);

// ============================================================================
// BULK SYNC ENDPOINTS
// ============================================================================

// Sync all patient data to EMR (complete record)
router.post('/sync/patient/:patient_id/full', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    FHIRController.syncFullPatientRecord);

// Bidirectional sync (HeriNjema ↔ EMR)
router.post('/sync/bidirectional', 
    authorize('HOSPITAL_STAFF', 'ADMIN'), 
    FHIRController.bidirectionalSync);

module.exports = router;
