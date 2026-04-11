// ============================================================================
// File: src/services/heriBotService.js
// AI Triage System (HeriBot) - Symptom Analysis & Clinical Decision Support
// Implements intelligent patient triage using rule-based AI
// ============================================================================

const pool = require('../config/db');

/**
 * HeriBot AI Triage System
 * Analyzes patient symptoms and provides:
 * - Emergency triage priority (ROUTINE, URGENT, EMERGENT)
 * - Recommended actions and departments
 * - Confidence score based on symptom severity
 */

class HeriBotService {
    constructor() {
        this.symptom_keywords = {
            CRITICAL: [
                'unable to breathe', 'chest pain', 'unconscious', 'severe bleeding',
                'difficulty breathing', 'choking', 'heart attack', 'stroke',
                'seizure', 'severe allergic reaction', 'uncontrolled bleeding'
            ],
            URGENT: [
                'severe headache', 'abdominal pain', 'broken bone', 'serious injury',
                'severe dizziness', 'confusion', 'high fever', 'severe vomiting',
                'blood in stool', 'blood in urine', 'eye injury', 'head injury'
            ],
            MODERATE: [
                'mild headache', 'fever', 'cough', 'sore throat', 'nausea',
                'diarrhea', 'rash', 'joint pain', 'back pain', 'fatigue',
                'mild injury', 'minor burn'
            ],
            ROUTINE: [
                'general checkup', 'follow-up', 'medication refill', 'routine exam',
                'vaccination', 'physical exam'
            ]
        };

        this.medical_conditions = {
            DIABETES: {
                keywords: ['diabetes', 'glucose', 'blood sugar', 'diabetic'],
                risk_level: 'MODERATE',
                recommended_tests: ['glucose test', 'A1C test', 'comprehensive metabolic panel'],
                specialty: 'Endocrinology'
            },
            HYPERTENSION: {
                keywords: ['high blood pressure', 'hypertension', 'bp elevated'],
                risk_level: 'MODERATE',
                recommended_tests: ['blood pressure check', 'ECG', 'urinalysis'],
                specialty: 'Cardiology'
            },
            RESPIRATORY: {
                keywords: ['asthma', 'copd', 'pneumonia', 'bronchitis', 'tuberculosis'],
                risk_level: 'URGENT',
                recommended_tests: ['chest X-ray', 'spirometry', 'sputum test'],
                specialty: 'Pulmonology'
            },
            CARDIAC: {
                keywords: ['heart disease', 'cardiac', 'arrhythmia', 'palpitations'],
                risk_level: 'CRITICAL',
                recommended_tests: ['ECG', 'troponin test', 'echocardiogram'],
                specialty: 'Cardiology'
            },
            NEUROLOGICAL: {
                keywords: ['seizure', 'epilepsy', 'stroke', 'migraine', 'parkinson'],
                risk_level: 'URGENT',
                recommended_tests: ['CT scan', 'MRI', 'EEG'],
                specialty: 'Neurology'
            },
            INFECTIOUS: {
                keywords: ['fever', 'infection', 'malaria', 'typhoid', 'hiv', 'covid'],
                risk_level: 'URGENT',
                recommended_tests: ['blood test', 'culture', 'rapid test'],
                specialty: 'Infectious Disease'
            },
            MENTAL_HEALTH: {
                keywords: ['depression', 'anxiety', 'stress', 'panic', 'suicide'],
                risk_level: 'URGENT',
                recommended_tests: ['psychological evaluation', 'mental health screening'],
                specialty: 'Psychiatry'
            }
        };
    }

    // ========================================================================
    // MAIN TRIAGE ANALYSIS
    // ========================================================================

    async analyzeTriage(symptom_input, patient_data = {}) {
        try {
            const symptom_lower = symptom_input.toLowerCase();

            // Step 1: Assess severity from keywords
            let priority_level = 'ROUTINE';
            let confidence_score = 0.5;
            let assessed_severity = 'ROUTINE';

            for (const [severity, keywords] of Object.entries(this.symptom_keywords)) {
                if (keywords.some(kw => symptom_lower.includes(kw))) {
                    assessed_severity = severity;
                    if (severity === 'CRITICAL') {
                        priority_level = 'CRITICAL';
                        confidence_score = 0.95;
                    } else if (severity === 'URGENT') {
                        priority_level = 'URGENT';
                        confidence_score = 0.85;
                    } else if (severity === 'MODERATE') {
                        priority_level = 'HIGH';
                        confidence_score = 0.7;
                    }
                    break; // Use highest severity found
                }
            }

            // Step 2: Identify medical conditions
            let identified_conditions = [];
            let recommended_specialty = 'General Practice';

            for (const [condition, details] of Object.entries(this.medical_conditions)) {
                if (details.keywords.some(kw => symptom_lower.includes(kw))) {
                    identified_conditions.push(condition);
                    recommended_specialty = details.specialty;

                    // Adjust priority based on condition severity
                    if (details.risk_level === 'CRITICAL' && priority_level !== 'CRITICAL') {
                        priority_level = 'CRITICAL';
                        confidence_score = Math.max(confidence_score, 0.92);
                    } else if (details.risk_level === 'URGENT' && priority_level !== 'CRITICAL') {
                        priority_level = 'URGENT';
                        confidence_score = Math.max(confidence_score, 0.85);
                    }
                }
            }

            // Step 3: Adjust score based on patient vitals
            if (patient_data.blood_pressure_systolic) {
                if (patient_data.blood_pressure_systolic > 180) {
                    priority_level = 'CRITICAL';
                    confidence_score = 0.95;
                } else if (patient_data.blood_pressure_systolic > 140) {
                    priority_level = priority_level === 'ROUTINE' ? 'URGENT' : priority_level;
                    confidence_score = Math.max(confidence_score, 0.8);
                }
            }

            if (patient_data.heart_rate) {
                if (patient_data.heart_rate > 120 || patient_data.heart_rate < 50) {
                    priority_level = 'URGENT';
                    confidence_score = Math.max(confidence_score, 0.85);
                }
            }

            if (patient_data.glucose_level) {
                if (patient_data.glucose_level > 400 || patient_data.glucose_level < 50) {
                    priority_level = 'CRITICAL';
                    confidence_score = 0.95;
                } else if (patient_data.glucose_level > 300 || patient_data.glucose_level < 100) {
                    priority_level = priority_level === 'ROUTINE' ? 'URGENT' : priority_level;
                    confidence_score = Math.max(confidence_score, 0.8);
                }
            }

            // Step 4: Generate recommendations
            const recommendations = this.generateRecommendations(
                priority_level,
                identified_conditions,
                symptom_input
            );

            return {
                symptom_input,
                assessed_severity,
                recommended_priority: priority_level,
                confidence_score: parseFloat(confidence_score.toFixed(2)),
                identified_conditions,
                recommended_specialty,
                recommended_actions: recommendations.actions,
                recommended_tests: recommendations.tests,
                estimated_wait_time_minutes: this.estimateWaitTime(priority_level),
                ai_assessment: recommendations.narrative,
                requires_immediate_admission: priority_level === 'CRITICAL',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('[HeriBot Error]:', error.message);
            throw new Error(`Triage analysis failed: ${error.message}`);
        }
    }

    // ========================================================================
    // GENERATE CLINICAL RECOMMENDATIONS
    // ========================================================================

    generateRecommendations(priority_level, conditions, symptoms) {
        let actions = [];
        let tests = [];
        let narrative = '';

        if (priority_level === 'CRITICAL') {
            actions = [
                'IMMEDIATE: Call ambulance (999)',
                'Ensure patient is in safe position',
                'Monitor vital signs continuously',
                'Prepare for emergency resuscitation',
                'Notify emergency department'
            ];
            narrative = '🚨 CRITICAL CONDITION - Requires immediate emergency intervention. This patient needs emergency medical attention NOW.';
        } else if (priority_level === 'URGENT') {
            actions = [
                'Schedule urgent appointment (within 2 hours)',
                'Monitor vital signs every 15 minutes',
                'Prepare for rapid triage on arrival',
                'Notify specialist department',
                'Patient should not drive - arrange transport'
            ];
            narrative = '⚠️ URGENT - This condition requires prompt medical evaluation. Patient should be seen within 2 hours.';
        } else if (priority_level === 'HIGH') {
            actions = [
                'Schedule appointment within 24 hours',
                'Monitor symptoms for worsening',
                'Ensure adequate rest and hydration',
                'Notify relevant department',
                'Patient may self-transport'
            ];
            narrative = '📋 MODERATE - This condition requires medical evaluation within 24 hours. Monitor for worsening.';
        } else {
            actions = [
                'Schedule routine appointment',
                'Can wait up to 1 week',
                'Maintain normal activities if tolerable',
                'Follow-up with general practitioner'
            ];
            narrative = '✅ ROUTINE - Standard medical evaluation recommended. Can be scheduled at next available appointment.';
        }

        // Add condition-specific tests
        for (const condition of conditions) {
            const condition_data = this.medical_conditions[condition];
            if (condition_data) {
                tests.push(...condition_data.recommended_tests);
            }
        }

        // Remove duplicates
        tests = [...new Set(tests)];

        return { actions, tests, narrative };
    }

    // ========================================================================
    // ESTIMATE WAIT TIME
    // ========================================================================

    estimateWaitTime(priority_level) {
        const times = {
            'CRITICAL': 0, // Immediate
            'URGENT': 30,  // 30 minutes max
            'HIGH': 120,   // 2 hours
            'ROUTINE': 480 // 8 hours (next appointment)
        };
        return times[priority_level] || 480;
    }

    // ========================================================================
    // SAVE TRIAGE RECORD
    // ========================================================================

    async saveTriageRecord(patient_id, appointment_id, triage_analysis) {
        try {
            const query = `
                INSERT INTO TriageRecords
                (patient_id, appointment_id, symptom_input, ai_assessment, 
                 recommended_priority, confidence_score, recommended_actions)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const values = [
                patient_id,
                appointment_id,
                triage_analysis.symptom_input,
                triage_analysis.ai_assessment,
                triage_analysis.recommended_priority,
                triage_analysis.confidence_score,
                JSON.stringify(triage_analysis.recommended_actions)
            ];

            const result = await pool.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('[Save Triage Error]:', error.message);
            throw new Error(`Failed to save triage record: ${error.message}`);
        }
    }

    // ========================================================================
    // GET TRIAGE HISTORY
    // ========================================================================

    async getTriageHistory(patient_id, limit = 10) {
        try {
            const query = `
                SELECT * FROM TriageRecords
                WHERE patient_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `;

            const result = await pool.query(query, [patient_id, limit]);
            return result.rows;

        } catch (error) {
            console.error('[Get Triage History Error]:', error.message);
            throw new Error(`Failed to retrieve triage history: ${error.message}`);
        }
    }

    // ========================================================================
    // RISK STRATIFICATION (for hospital queue management)
    // ========================================================================

    calculateRiskScore(patient_data) {
        let risk_score = 0;

        // Age factor
        if (patient_data.age > 65) risk_score += 20;
        if (patient_data.age < 5) risk_score += 15;

        // Chronic conditions
        if (patient_data.chronic_conditions) {
            const condition_count = patient_data.chronic_conditions.split(',').length;
            risk_score += condition_count * 10;
        }

        // Vital signs
        if (patient_data.blood_pressure_systolic > 160) risk_score += 30;
        if (patient_data.heart_rate > 100) risk_score += 15;
        if (patient_data.glucose_level > 300) risk_score += 25;
        if (patient_data.oxygen_saturation < 90) risk_score += 35;

        // Recent hospitalizations
        if (patient_data.recent_hospital_stays) risk_score += 20;

        return Math.min(risk_score, 100); // Cap at 100
    }
}

module.exports = new HeriBotService();
