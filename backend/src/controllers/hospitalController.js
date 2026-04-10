// ============================================================================
// File: src/controllers/hospitalController.js
// Hospital Dashboard Controller (for TaifaCare/EMR Integration)
// Manages Live Triage Queue, Emergency Console, Billing Hub
// ============================================================================

const pool = require('../config/db');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const { generateQRCode } = require('../utils/qrGenerator');

// ============================================================================
// LIVE TRIAGE QUEUE (Nurse/Reception View)
// ============================================================================

const getLiveTriageQueue = async (req, res, next) => {
    const { hospital_id } = req.params;

    try {
        // Fetch live queue with color coding (Red/Yellow/Green based on triage)
        const appointments = await Appointment.getLiveTriageQueueForHospital(hospital_id);

        // Enhance with status indicators and pre-verification flags
        const enhanced_queue = appointments.map(apt => ({
            ...apt,
            status_indicator: getStatusIndicator(apt.priority_level),
            is_pre_verified: apt.payment_status === 'SUCCESS' && apt.insurance_provider !== null,
            direct_admit_available: apt.payment_status === 'SUCCESS' && apt.phone_number
        }));

        res.json({
            success: true,
            queue: enhanced_queue,
            total_patients: enhanced_queue.length,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('[Get Triage Queue Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Color coding helper
const getStatusIndicator = (priority_level) => {
    if (priority_level === 'CRITICAL') return 'RED';
    if (priority_level === 'HIGH') return 'YELLOW';
    return 'GREEN';
};

// ============================================================================
// Direct Admit Toggle
// ============================================================================

const updateDirectAdmitStatus = async (req, res, next) => {
    const { appointment_id } = req.params;
    const { admitted } = req.body;

    try {
        // Update appointment status to CONFIRMED
        await Appointment.updateStatus(appointment_id, 'CONFIRMED');

        res.json({
            success: true,
            message: `Patient ${admitted ? 'admitted' : 'removed from'} direct admission`,
            appointment_id
        });

    } catch (error) {
        console.error('[Direct Admit Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// Get Patient Pre-visit Vitals
// ============================================================================

const getPatientVitals = async (req, res, next) => {
    const { patient_id } = req.params;

    try {
        const query = `
            SELECT * FROM PatientVitals
            WHERE patient_id = $1
            ORDER BY recorded_at DESC
            LIMIT 10
        `;

        const result = await pool.query(query, [patient_id]);

        res.json({
            success: true,
            vitals: result.rows,
            latest_vital: result.rows[0] || null
        });

    } catch (error) {
        console.error('[Get Vitals Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// EMERGENCY CONSOLE (ER Staff View)
// ============================================================================

const getEmergencyAlerts = async (req, res, next) => {
    const { hospital_id } = req.params;

    try {
        const query = `
            SELECT 
                ea.*,
                p.first_name, p.last_name,
                u.phone_number,
                pv.blood_type, pv.heart_rate, pv.blood_pressure_systolic, pv.blood_pressure_diastolic
            FROM EmergencyAlerts ea
            JOIN Patients p ON ea.patient_id = p.patient_id
            JOIN Users u ON p.user_id = u.user_id
            LEFT JOIN PatientVitals pv ON p.patient_id = pv.patient_id
            WHERE ea.hospital_id = $1
              AND ea.alert_status = 'ACTIVE'
            ORDER BY ea.created_at DESC
        `;

        const result = await pool.query(query, [hospital_id]);

        res.json({
            success: true,
            active_alerts: result.rows,
            total_active: result.rows.length
        });

    } catch (error) {
        console.error('[Get Emergency Alerts Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// Respond to Emergency
// ============================================================================

const respondToEmergency = async (req, res, next) => {
    const { alert_id } = req.params;
    const { response_status } = req.body; // 'RESPONDED', 'AMBULANCE_DISPATCHED', 'CANCELLED'

    try {
        const query = `
            UPDATE EmergencyAlerts
            SET alert_status = $1,
                response_timestamp = CURRENT_TIMESTAMP
            WHERE alert_id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [response_status, alert_id]);

        res.json({
            success: true,
            message: `Emergency ${response_status}`,
            alert: result.rows[0]
        });

    } catch (error) {
        console.error('[Respond to Emergency Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// Get Emergency Patient Context
// ============================================================================

const getEmergencyContext = async (req, res, next) => {
    const { alert_id } = req.params;

    try {
        const query = `
            SELECT 
                ea.*,
                p.patient_id, p.first_name, p.last_name, p.blood_type, p.emergency_contact_phone,
                u.phone_number,
                pv.blood_pressure_systolic, pv.blood_pressure_diastolic, 
                pv.heart_rate, pv.glucose_level, pv.oxygen_saturation,
                a.chief_complaint, a.priority_level,
                tr.ai_assessment
            FROM EmergencyAlerts ea
            JOIN Patients p ON ea.patient_id = p.patient_id
            JOIN Users u ON p.user_id = u.user_id
            LEFT JOIN PatientVitals pv ON p.patient_id = pv.patient_id 
                AND pv.recorded_at = (
                    SELECT MAX(recorded_at) FROM PatientVitals WHERE patient_id = p.patient_id
                )
            LEFT JOIN Appointments a ON ea.appointment_id = a.appointment_id
            LEFT JOIN TriageRecords tr ON a.appointment_id = tr.appointment_id
            WHERE ea.alert_id = $1
        `;

        const result = await pool.query(query, [alert_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Alert not found' });
        }

        const context = result.rows[0];

        res.json({
            success: true,
            patient_context: {
                patient_id: context.patient_id,
                name: `${context.first_name} ${context.last_name}`,
                phone: context.phone_number,
                blood_type: context.blood_type,
                chief_complaint: context.chief_complaint,
                ai_assessment: context.ai_assessment,
                vitals_dashboard: {
                    blood_pressure: `${context.blood_pressure_systolic}/${context.blood_pressure_diastolic}`,
                    heart_rate: context.heart_rate,
                    glucose_level: context.glucose_level,
                    oxygen_saturation: context.oxygen_saturation
                },
                live_location: {
                    latitude: context.patient_location_latitude,
                    longitude: context.patient_location_longitude
                },
                ambulance_info: {
                    status: context.ambulance_assigned_to ? 'Assigned' : 'Not Assigned',
                    dispatch_time: context.response_timestamp
                }
            }
        });

    } catch (error) {
        console.error('[Get Emergency Context Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// BILLING & CLAIMS HUB (Finance/Admin View)
// ============================================================================

const getBillingReconciliation = async (req, res, next) => {
    const { hospital_id } = req.params;
    const { date_from, date_to } = req.query;

    try {
        const from = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const to = date_to ? new Date(date_to) : new Date();

        const reconciliation = await Invoice.getBillingReconciliationForHospital(hospital_id, from, to);

        res.json({
            success: true,
            reconciliation: {
                period: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] },
                ...reconciliation,
                auto_reconciliation_status: 'COMPLETE'
            }
        });

    } catch (error) {
        console.error('[Get Reconciliation Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// Get Invoice Details (Billing Breakdown)
// ============================================================================

const getInvoiceDetails = async (req, res, next) => {
    const { invoice_id } = req.params;

    try {
        const invoice_query = `
            SELECT i.*, a.appointment_time, h.name as hospital_name
            FROM Invoices i
            JOIN Appointments a ON i.appointment_id = a.appointment_id
            JOIN Hospitals h ON i.hospital_id = h.hospital_id
            WHERE i.invoice_id = $1
        `;

        const transactions_query = `
            SELECT * FROM Transactions
            WHERE invoice_id = $1
            ORDER BY created_at DESC
        `;

        const [invoice_result, transactions_result] = await Promise.all([
            pool.query(invoice_query, [invoice_id]),
            pool.query(transactions_query, [invoice_id])
        ]);

        if (invoice_result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        res.json({
            success: true,
            invoice: {
                ...invoice_result.rows[0],
                transactions: transactions_result.rows
            }
        });

    } catch (error) {
        console.error('[Get Invoice Details Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// Audit Trail (Compliance & Fraud Prevention)
// ============================================================================

const getAuditTrail = async (req, res, next) => {
    const { transaction_id } = req.params;

    try {
        const query = `
            SELECT al.* FROM AuditLog al
            WHERE al.resource_type = 'TRANSACTION'
              AND al.resource_id = $1
            ORDER BY al.created_at DESC
        `;

        const result = await pool.query(query, [transaction_id]);

        res.json({
            success: true,
            audit_trail: result.rows,
            digital_receipt_verified: result.rows.length > 0
        });

    } catch (error) {
        console.error('[Get Audit Trail Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// Generate Digital Receipt with QR Code (eTIMS Compliance)
// ============================================================================

const generateQRReceipt = async (req, res, next) => {
    const { transaction_id } = req.params;

    try {
        const query = `
            SELECT t.*, i.total_amount, i.sha_coverage, i.patient_responsibility,
                   u.phone_number, u.first_name, u.last_name,
                   h.name as hospital_name
            FROM Transactions t
            JOIN Invoices i ON t.invoice_id = i.invoice_id
            JOIN Appointments a ON i.appointment_id = a.appointment_id
            JOIN Patients p ON a.patient_id = p.patient_id
            JOIN Users u ON p.user_id = u.user_id
            JOIN Hospitals h ON a.hospital_id = h.hospital_id
            WHERE t.transaction_id = $1
        `;

        const result = await pool.query(query, [transaction_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        const transaction = result.rows[0];

        // Generate QR code data
        const qr_data = {
            transaction_id,
            receipt_number: transaction.mpesa_receipt_number,
            hospital: transaction.hospital_name,
            patient: `${transaction.first_name} ${transaction.last_name}`,
            phone: transaction.phone_number,
            total_amount: transaction.total_amount,
            sha_coverage: transaction.sha_coverage,
            patient_paid: transaction.amount,
            payment_date: transaction.payment_timestamp,
            verification_code: `HERINJEMA-${transaction_id}-${new Date().getTime()}`
        };

        // In production, generate actual QR code image
        // const qr_code_url = await generateQRCode(JSON.stringify(qr_data));

        res.json({
            success: true,
            digital_receipt: {
                ...qr_data,
                qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(JSON.stringify(qr_data))
            }
        });

    } catch (error) {
        console.error('[Generate Receipt Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// APPOINTMENT MANAGEMENT
// ============================================================================

const updateAppointmentStatus = async (req, res, next) => {
    const { appointment_id } = req.params;
    const { status } = req.body;

    try {
        const updated = await Appointment.updateStatus(appointment_id, status);

        res.json({
            success: true,
            message: `Appointment status updated to ${status}`,
            appointment: updated
        });

    } catch (error) {
        console.error('[Update Status Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// Complete Appointment (After doctor sees patient)
// ============================================================================

const completeAppointment = async (req, res, next) => {
    const { appointment_id } = req.params;
    const { diagnosis, prescription, notes } = req.body;

    try {
        // Update appointment status to COMPLETED
        await Appointment.updateStatus(appointment_id, 'COMPLETED');

        // Insert clinical notes (implement in future version)
        // await ClinicalNotes.create({ appointment_id, diagnosis, prescription, notes });

        res.json({
            success: true,
            message: 'Appointment completed',
            appointment_id
        });

    } catch (error) {
        console.error('[Complete Appointment Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getLiveTriageQueue,
    updateDirectAdmitStatus,
    getPatientVitals,
    getEmergencyAlerts,
    respondToEmergency,
    getEmergencyContext,
    getBillingReconciliation,
    getInvoiceDetails,
    getAuditTrail,
    generateQRReceipt,
    updateAppointmentStatus,
    completeAppointment
};
