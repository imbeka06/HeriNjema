// ============================================================================
// File: src/controllers/heriBotController.js
// HeriBot AI Triage Controller
// Handles symptom analysis, clinical decision support, and interview flows
// ============================================================================

const HeriBotService = require('../services/heriBotService');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const pool = require('../config/db');

// ============================================================================
// TRIAGE ANALYSIS
// ============================================================================

const analyzeTriage = async (req, res, next) => {
    const { symptom_input, patient_id, appointment_id } = req.body;

    if (!symptom_input || symptom_input.trim().length === 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Symptom input is required' 
        });
    }

    try {
        // Get patient data if available
        let patient_data = {};
        if (patient_id) {
            const patient = await Patient.findById(patient_id);
            if (patient) {
                patient_data = patient;
            }
        }

        // Run triage analysis
        const triage_result = await HeriBotService.analyzeTriage(symptom_input, patient_data);

        // Save triage record if appointment ID provided
        if (appointment_id && patient_id) {
            await HeriBotService.saveTriageRecord(patient_id, appointment_id, triage_result);
        }

        res.json({
            success: true,
            triage: triage_result
        });

    } catch (error) {
        console.error('[Triage Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const analyzeTriageWithVitals = async (req, res, next) => {
    const { symptom_input, patient_id, appointment_id, vitals } = req.body;

    if (!symptom_input) {
        return res.status(400).json({ success: false, message: 'Symptom input required' });
    }

    try {
        // Combine patient data with vitals
        let patient_data = { ...vitals };
        
        if (patient_id) {
            const patient = await Patient.findById(patient_id);
            if (patient) {
                patient_data = { ...patient, ...vitals };
            }
        }

        // Run triage with vitals
        const triage_result = await HeriBotService.analyzeTriage(symptom_input, patient_data);

        // Save vitals if appointment provided
        if (appointment_id && vitals && Object.keys(vitals).length > 0) {
            const vitals_query = `
                INSERT INTO PatientVitals 
                (patient_id, appointment_id, blood_pressure_systolic, blood_pressure_diastolic, 
                 heart_rate, temperature, glucose_level, oxygen_saturation)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            await pool.query(vitals_query, [
                patient_id,
                appointment_id,
                vitals.blood_pressure_systolic,
                vitals.blood_pressure_diastolic,
                vitals.heart_rate,
                vitals.temperature,
                vitals.glucose_level,
                vitals.oxygen_saturation
            ]);

            // Save triage record
            await HeriBotService.saveTriageRecord(patient_id, appointment_id, triage_result);
        }

        res.json({
            success: true,
            triage: triage_result,
            vitals_recorded: !!vitals
        });

    } catch (error) {
        console.error('[Triage with Vitals Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// TRIAGE HISTORY
// ============================================================================

const getTriageHistory = async (req, res, next) => {
    const { patient_id } = req.params;
    const { limit = 10 } = req.query;

    try {
        const history = await HeriBotService.getTriageHistory(patient_id, parseInt(limit));

        res.json({
            success: true,
            count: history.length,
            history
        });

    } catch (error) {
        console.error('[Get Triage History Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getLatestTriage = async (req, res, next) => {
    const { patient_id } = req.params;

    try {
        const history = await HeriBotService.getTriageHistory(patient_id, 1);

        if (history.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No triage records found for this patient' 
            });
        }

        res.json({
            success: true,
            triage: history[0]
        });

    } catch (error) {
        console.error('[Get Latest Triage Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// SYMPTOM INTERVIEW FLOW
// ============================================================================

// Simulated interview session storage (use Redis in production)
const interview_sessions = new Map();

const startSymptomInterview = async (req, res, next) => {
    const { patient_id } = req.body;

    try {
        const session_id = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Initialize interview session
        const session = {
            session_id,
            patient_id,
            started_at: new Date(),
            symptoms: [],
            vitals: {},
            step: 0,
            questions_answered: 0
        };

        interview_sessions.set(session_id, session);

        // Start with first question
        const first_question = {
            question_id: 'q1',
            question: 'What is the main thing bothering you today?',
            question_type: 'open_text',
            guidance: 'Please describe your primary symptom(s) in your own words'
        };

        res.json({
            success: true,
            session_id,
            current_question: first_question
        });

    } catch (error) {
        console.error('[Start Interview Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const continueInterview = async (req, res, next) => {
    const { session_id, answer } = req.body;

    try {
        if (!interview_sessions.has(session_id)) {
            return res.status(404).json({ success: false, message: 'Interview session not found' });
        }

        const session = interview_sessions.get(session_id);
        session.questions_answered++;

        // Add answer to session
        if (session.step === 0) {
            session.symptoms.push(answer);
        }

        session.step++;

        // Check if we have enough information to generate triage
        if (session.step >= 3 || session.questions_answered >= 5) {
            // Generate triage based on collected information
            const symptom_input = session.symptoms.join(', ');
            const triage_result = await HeriBotService.analyzeTriage(symptom_input);

            // Save record if patient available
            if (session.patient_id) {
                await HeriBotService.saveTriageRecord(
                    session.patient_id,
                    null,
                    triage_result
                );
            }

            interview_sessions.delete(session_id); // Clean up

            return res.json({
                success: true,
                interview_complete: true,
                triage: triage_result
            });
        }

        // Generate next question based on symptoms
        const next_question = this.generateNextQuestion(session.step, session.symptoms);

        res.json({
            success: true,
            session_id,
            progress: `${session.questions_answered}/5`,
            current_question: next_question
        });

    } catch (error) {
        console.error('[Continue Interview Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const generateNextQuestion = (step, symptoms) => {
    const questions = [
        {
            question_id: 'q2',
            question: 'When did this start?',
            question_type: 'option_select',
            options: ['Less than 1 hour', 'Within last 24 hours', 'Within last week', 'More than a week ago']
        },
        {
            question_id: 'q3',
            question: 'Is the pain constant or intermittent?',
            question_type: 'option_select',
            options: ['Constant', 'Intermittent', 'Getting worse', 'Getting better']
        },
        {
            question_id: 'q4',
            question: 'Do you have any chronic diseases? (Diabetes, Asthma, etc.)',
            question_type: 'yes_no'
        },
        {
            question_id: 'q5',
            question: 'Are you currently experiencing fever?',
            question_type: 'yes_no'
        }
    ];

    return questions[Math.min(step - 1, questions.length - 1)];
};

const cancelInterview = async (req, res, next) => {
    const { session_id } = req.params;

    try {
        if (interview_sessions.has(session_id)) {
            interview_sessions.delete(session_id);
            return res.json({ success: true, message: 'Interview cancelled' });
        }

        res.status(404).json({ success: false, message: 'Session not found' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// RISK SCORING
// ============================================================================

const calculateRiskScore = async (req, res, next) => {
    const { patient_id } = req.body;

    try {
        const patient = await Patient.findById(patient_id);
        if (!patient) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const risk_score = HeriBotService.calculateRiskScore(patient);

        res.json({
            success: true,
            patient_id,
            risk_score: parseFloat(risk_score.toFixed(2)),
            risk_category: risk_score < 30 ? 'LOW' : risk_score < 60 ? 'MODERATE' : 'HIGH'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getQueuePriorityRecommendations = async (req, res, next) => {
    const { hospital_id } = req.params;

    try {
        // Get live triage queue
        const queue = await Appointment.getLiveTriageQueueForHospital(hospital_id, 50);

        // Score and sort by priority
        const scored_queue = queue.map(apt => ({
            ...apt,
            risk_score: HeriBotService.calculateRiskScore(apt),
            priority_rank: this.calculatePriorityRank(apt)
        })).sort((a, b) => b.priority_rank - a.priority_rank);

        res.json({
            success: true,
            hospital_id,
            queue_length: scored_queue.length,
            priority_queue: scored_queue.slice(0, 10),
            total_high_priority: scored_queue.filter(a => a.priority_level === 'HIGH').length,
            total_critical: scored_queue.filter(a => a.priority_level === 'CRITICAL').length
        });

    } catch (error) {
        console.error('[Queue Priority Error]:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper method
function calculatePriorityRank(appointment) {
    let rank = 0;
    if (appointment.priority_level === 'CRITICAL') rank += 100;
    if (appointment.priority_level === 'HIGH') rank += 50;
    if (appointment.is_emergency) rank += 75;
    return rank;
}

module.exports = {
    analyzeTriage,
    analyzeTriageWithVitals,
    getTriageHistory,
    getLatestTriage,
    startSymptomInterview,
    continueInterview,
    cancelInterview,
    calculateRiskScore,
    getQueuePriorityRecommendations
};
