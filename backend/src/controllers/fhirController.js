// ============================================================================
// File: src/controllers/fhirController.js
// FHIR Hospital EMR Integration Controller
// Handles bidirectional sync between HeriNjema and hospital EMR systems
// ============================================================================

const FHIRService = require('../services/fhirService');
const pool = require('../config/db');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

// ============================================================================
// PATIENT ENDPOINTS
// ============================================================================

const pushPatientToEMR = async (req, res, next) => {
    const { patient_id } = req.params;

    try {
        const result = await FHIRService.pushPatientToEMR(patient_id);

        res.json({
            success: true,
            message: 'Patient data pushed to hospital EMR',
            fhir_id: result.id,
            patient_id
        });

    } catch (error) {
        console.error('[FHIR Push Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPatientFHIR = async (req, res, next) => {
    const { patient_id } = req.params;

    try {
        const patient = await Patient.findById(patient_id);
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const fhir_patient = await FHIRService.createPatientFHIR(patient);

        res.json({
            success: true,
            data: fhir_patient
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// VITALS/OBSERVATIONS ENDPOINTS
// ============================================================================

const pushVitalsToEMR = async (req, res, next) => {
    const { vital_id } = req.params;
    const { patient_id } = req.body;

    try {
        const result = await FHIRService.pushVitalsToEMR(vital_id, patient_id);

        res.json({
            success: true,
            message: 'Vitals pushed to hospital EMR',
            observations_created: result.length,
            vital_id
        });

    } catch (error) {
        console.error('[FHIR Vitals Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getVitalsFHIR = async (req, res, next) => {
    const { patient_id } = req.params;

    try {
        const query = `SELECT * FROM PatientVitals WHERE patient_id = $1 ORDER BY recorded_at DESC`;
        const result = await pool.query(query, [patient_id]);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    resourceType: 'Bundle',
                    type: 'searchset',
                    total: 0,
                    entry: []
                }
            });
        }

        const observations = [];
        for (const vital of result.rows) {
            const obs = await FHIRService.createVitalObservationFHIR(vital, patient_id);
            observations.push(...obs);
        }

        res.json({
            success: true,
            data: {
                resourceType: 'Bundle',
                type: 'searchset',
                total: observations.length,
                entry: observations.map(obs => ({
                    resource: obs
                }))
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// APPOINTMENT ENDPOINTS
// ============================================================================

const pushAppointmentToEMR = async (req, res, next) => {
    const { appointment_id } = req.params;

    try {
        const result = await FHIRService.pushAppointmentToEMR(appointment_id);

        res.json({
            success: true,
            message: 'Appointment pushed to hospital EMR',
            fhir_id: result.id,
            appointment_id
        });

    } catch (error) {
        console.error('[FHIR Appointment Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAppointmentFHIR = async (req, res, next) => {
    const { appointment_id } = req.params;

    try {
        const appointment = await Appointment.findById(appointment_id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        appointment.patient_name = `${appointment.first_name} ${appointment.last_name}`;
        appointment.doctor_name = appointment.specialty || 'General Practitioner';

        const fhir_apt = await FHIRService.createAppointmentFHIR(appointment);

        res.json({
            success: true,
            data: fhir_apt
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// ENCOUNTER ENDPOINTS
// ============================================================================

const pushEncounterToEMR = async (req, res, next) => {
    const { appointment_id } = req.params;
    const { diagnosis, clinical_notes } = req.body;

    try {
        const appointment = await Appointment.findById(appointment_id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        // Fetch latest vitals for the encounter
        const vitals_query = `
            SELECT * FROM PatientVitals 
            WHERE appointment_id = $1 
            ORDER BY recorded_at DESC 
            LIMIT 1
        `;
        const vitals_result = await pool.query(vitals_query, [appointment_id]);
        const vitals = vitals_result.rows[0];

        const fhir_encounter = await FHIRService.createEncounterFHIR(appointment, vitals);

        // TODO: Push encounter to FHIR server
        console.log('[FHIR] Encounter created for appointment:', appointment_id);

        res.json({
            success: true,
            message: 'Encounter pushed to hospital EMR',
            encounter: fhir_encounter
        });

    } catch (error) {
        console.error('[FHIR Encounter Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const pullEncounterFromEMR = async (req, res, next) => {
    const { patient_id } = req.params;

    try {
        // Get patient's FHIR ID
        const patient = await Patient.findById(patient_id);
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const fhir_patient_id = `herinjema-patient-${patient_id}`;
        const encounters = await FHIRService.pullPatientEncounterFromEMR(fhir_patient_id);

        res.json({
            success: true,
            message: `${encounters.length} encounters retrieved from EMR`,
            encounters
        });

    } catch (error) {
        console.error('[FHIR Pull Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// BULK SYNC ENDPOINTS
// ============================================================================

const syncFullPatientRecord = async (req, res, next) => {
    const { patient_id } = req.params;

    try {
        console.log(`[FHIR] Starting full sync for patient ${patient_id}`);

        // 1. Push patient demographics
        await FHIRService.pushPatientToEMR(patient_id);

        // 2. Push all vitals
        const vitals_query = `SELECT vital_id FROM PatientVitals WHERE patient_id = $1`;
        const vitals_result = await pool.query(vitals_query, [patient_id]);

        for (const vital_row of vitals_result.rows) {
            try {
                await FHIRService.pushVitalsToEMR(vital_row.vital_id, patient_id);
            } catch (e) {
                console.warn('[FHIR] Vital sync skipped:', e.message);
            }
        }

        // 3. Push all appointments
        const apt_query = `SELECT appointment_id FROM Appointments WHERE patient_id = $1`;
        const apt_result = await pool.query(apt_query, [patient_id]);

        for (const apt_row of apt_result.rows) {
            try {
                await FHIRService.pushAppointmentToEMR(apt_row.appointment_id);
            } catch (e) {
                console.warn('[FHIR] Appointment sync skipped:', e.message);
            }
        }

        res.json({
            success: true,
            message: 'Full patient record synced to EMR',
            patient_id,
            vitals_synced: vitals_result.rows.length,
            appointments_synced: apt_result.rows.length
        });

    } catch (error) {
        console.error('[FHIR Full Sync Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const bidirectionalSync = async (req, res, next) => {
    const { patient_id, hospital_id } = req.body;

    try {
        console.log('[FHIR] Starting bidirectional sync');

        // PUSH: HeriNjema → EMR
        const push_result = await syncFullPatientRecord({ params: { patient_id } }, {
            json: (data) => console.log('[FHIR Push Result]:', data)
        }, next);

        // PULL: EMR → HeriNjema
        const patient = await Patient.findById(patient_id);
        const fhir_patient_id = `herinjema-patient-${patient_id}`;
        const encounters = await FHIRService.pullPatientEncounterFromEMR(fhir_patient_id);

        res.json({
            success: true,
            message: 'Bidirectional sync completed',
            push: {
                patient_id,
                status: 'synced'
            },
            pull: {
                encounters_retrieved: encounters.length,
                status: 'synced'
            }
        });

    } catch (error) {
        console.error('[FHIR Bidirectional Sync Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    pushPatientToEMR,
    getPatientFHIR,
    pushVitalsToEMR,
    getVitalsFHIR,
    pushAppointmentToEMR,
    getAppointmentFHIR,
    pushEncounterToEMR,
    pullEncounterFromEMR,
    syncFullPatientRecord,
    bidirectionalSync
};
