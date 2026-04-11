// ============================================================================
// File: src/routes/realtimeRoutes.js
// Real-time WebSocket Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const RealtimeService = require('../services/realtimeService');

// ============================================================================
// INFO ENDPOINT: Connection Statistics
// ============================================================================

router.get('/stats', (req, res) => {
    const stats = RealtimeService.getConnectionStats();
    res.json({
        success: true,
        stats
    });
});

// ============================================================================
// TEST ENDPOINTS: For Postman/Testing
// ============================================================================

// Test emergency alert broadcast
router.post('/test/emergency-alert', (req, res) => {
    const { hospital_id, patient_id, patient_name, symptoms, priority_level } = req.body;

    RealtimeService.broadcastEmergencyAlert({
        alert_id: `alert-${Date.now()}`,
        patient_id: patient_id || 'test-patient-1',
        patient_name: patient_name || 'Test Patient',
        phone_number: '+254712345678',
        gps_location: { latitude: -1.2921, longitude: 36.8219 },
        vital_signs: {
            heart_rate: 120,
            temperature: 38.5,
            blood_pressure: '140/90',
            oxygen_saturation: 92
        },
        symptoms: symptoms || ['Chest pain', 'Shortness of breath'],
        priority_level: priority_level || 'CRITICAL',
        hospital_id: hospital_id || 'hospital-knh',
        created_at: new Date()
    });

    res.json({
        success: true,
        message: 'Emergency alert broadcasted to hospital staff'
    });
});

// Test triage queue update
router.post('/test/triage-queue', (req, res) => {
    const { hospital_id } = req.body;

    const mock_queue = [
        {
            appointment_id: 'apt-101',
            patient_id: 'pat-001',
            patient_name: 'Alice Kamau',
            priority_level: 'CRITICAL',
            wait_time_minutes: 2,
            chief_complaint: 'Severe chest pain'
        },
        {
            appointment_id: 'apt-102',
            patient_id: 'pat-002',
            patient_name: 'Bob Omondi',
            priority_level: 'HIGH',
            wait_time_minutes: 15,
            chief_complaint: 'High fever'
        }
    ];

    RealtimeService.broadcastTriageQueueUpdate(hospital_id || 'hospital-knh', mock_queue);

    res.json({
        success: true,
        message: 'Triage queue update broadcasted'
    });
});

// Test appointment status update
router.post('/test/appointment-status', (req, res) => {
    const { appointment_id, status, patient_id, hospital_id } = req.body;

    RealtimeService.broadcastAppointmentStatusUpdate(
        appointment_id || 'apt-123',
        status || 'IN_CONSULTATION',
        patient_id || 'pat-001',
        hospital_id || 'hospital-knh'
    );

    res.json({
        success: true,
        message: 'Appointment status update broadcasted'
    });
});

// Test billing notification
router.post('/test/billing-notification', (req, res) => {
    const { patient_id, amount, status } = req.body;

    RealtimeService.broadcastBillingNotification({
        invoice_id: `inv-${Date.now()}`,
        patient_id: patient_id || 'pat-001',
        amount: amount || 5000,
        status: status || 'PENDING',
        description: 'Consultation and tests',
        payment_link: 'https://safaricom-daraja.co.ke/stk-push/invoice-123'
    });

    res.json({
        success: true,
        message: 'Billing notification broadcasted'
    });
});

// Test direct admittance confirmation
router.post('/test/direct-admittance', (req, res) => {
    const { patient_id, hospital_id } = req.body;

    RealtimeService.broadcastDirectAdmittance(
        `apt-${Date.now()}`,
        patient_id || 'pat-001',
        hospital_id || 'hospital-knh',
        `ADM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    );

    res.json({
        success: true,
        message: 'Direct admittance confirmation broadcasted'
    });
});

module.exports = router;
