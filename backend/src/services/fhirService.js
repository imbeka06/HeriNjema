// ============================================================================
// File: src/services/fhirService.js
// HL7 FHIR Data Exchange Service for Hospital EMR Integration
// Converts HeriNjema data to FHIR format for KenyaEMR/TaifaCare compatibility
// ============================================================================

const axios = require('axios');
const pool = require('../config/db');

/**
 * HL7 FHIR v4.0.1 Implementation
 * Supports: Patient, Observation, Appointment, Encounter resources
 */

class FHIRService {
    constructor() {
        this.fhir_server_url = process.env.FHIR_SERVER_URL || 'http://fhir-server:8080/fhir';
        this.emr_api_url = process.env.EMR_API_URL || 'http://hospital-emr:8080';
        this.emr_api_key = process.env.EMR_API_KEY;
    }

    // ========================================================================
    // PATIENT RESOURCE - Convert HeriNjema Patient → FHIR Patient
    // ========================================================================

    async createPatientFHIR(patient_data) {
        /**
         * FHIR Patient Resource
         * https://www.hl7.org/fhir/patient.html
         */
        const fhir_patient = {
            resourceType: 'Patient',
            id: `herinjema-patient-${patient_data.patient_id}`,
            meta: {
                source: 'HeriNjema',
                lastUpdated: new Date().toISOString(),
                profile: ['http://hl7.org/fhir/StructureDefinition/Patient']
            },
            identifier: [
                {
                    system: 'http://herinjema.health/patient-id',
                    value: patient_data.patient_id.toString()
                },
                {
                    system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                    value: patient_data.national_id || ''
                }
            ],
            name: [
                {
                    use: 'official',
                    given: [patient_data.first_name],
                    family: patient_data.last_name
                }
            ],
            telecom: [
                {
                    system: 'phone',
                    value: patient_data.phone_number,
                    use: 'mobile'
                }
            ],
            gender: (patient_data.gender || 'unknown').toLowerCase(),
            birthDate: patient_data.date_of_birth,
            address: [
                {
                    use: 'home',
                    text: patient_data.location || 'Nairobi, Kenya'
                }
            ],
            maritalStatus: {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
                        code: patient_data.marital_status || 'U'
                    }
                ]
            },
            contact: [
                {
                    relationship: [
                        {
                            coding: [
                                {
                                    system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
                                    code: 'U', // Emergency Contact
                                    display: 'Unknown'
                                }
                            ]
                        }
                    ],
                    name: {
                        text: patient_data.emergency_contact_name
                    },
                    telecom: [
                        {
                            system: 'phone',
                            value: patient_data.emergency_contact_phone
                        }
                    ]
                }
            ],
            extension: [
                {
                    url: 'http://herinjema.health/extension/blood-type',
                    valueCode: patient_data.blood_type || 'O+'
                },
                {
                    url: 'http://herinjema.health/extension/allergies',
                    valueString: patient_data.medical_allergies || 'None documented'
                },
                {
                    url: 'http://herinjema.health/extension/chronic-conditions',
                    valueString: patient_data.chronic_conditions || 'None documented'
                },
                {
                    url: 'http://herinjema.health/extension/insurance-provider',
                    valueString: patient_data.insurance_provider
                },
                {
                    url: 'http://herinjema.health/extension/insurance-number',
                    valueString: patient_data.insurance_number
                }
            ]
        };

        return fhir_patient;
    }

    // ========================================================================
    // OBSERVATION RESOURCE - Patient Vitals → FHIR Observations
    // ========================================================================

    async createVitalObservationFHIR(vital_data, patient_id) {
        /**
         * FHIR Observation Resource for patient vitals
         * https://www.hl7.org/fhir/observation.html
         */
        const observations = [];

        if (vital_data.blood_pressure_systolic) {
            observations.push({
                resourceType: 'Observation',
                id: `herinjema-bp-${vital_data.vital_id}`,
                status: 'final',
                category: [
                    {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                                code: 'vital-signs',
                                display: 'Vital Signs'
                            }
                        ]
                    }
                ],
                code: {
                    coding: [
                        {
                            system: 'http://loinc.org',
                            code: '85354-9',
                            display: 'Blood pressure panel with all children optional'
                        }
                    ]
                },
                subject: {
                    reference: `Patient/herinjema-patient-${patient_id}`
                },
                effectiveDateTime: vital_data.recorded_at,
                component: [
                    {
                        code: {
                            coding: [
                                {
                                    system: 'http://loinc.org',
                                    code: '8480-6',
                                    display: 'Systolic blood pressure'
                                }
                            ]
                        },
                        valueQuantity: {
                            value: vital_data.blood_pressure_systolic,
                            unit: 'mmHg',
                            system: 'http://unitsofmeasure.org',
                            code: 'mm[Hg]'
                        }
                    },
                    {
                        code: {
                            coding: [
                                {
                                    system: 'http://loinc.org',
                                    code: '8462-4',
                                    display: 'Diastolic blood pressure'
                                }
                            ]
                        },
                        valueQuantity: {
                            value: vital_data.blood_pressure_diastolic,
                            unit: 'mmHg',
                            system: 'http://unitsofmeasure.org',
                            code: 'mm[Hg]'
                        }
                    }
                ]
            });
        }

        if (vital_data.heart_rate) {
            observations.push({
                resourceType: 'Observation',
                id: `herinjema-hr-${vital_data.vital_id}`,
                status: 'final',
                category: [
                    {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                                code: 'vital-signs'
                            }
                        ]
                    }
                ],
                code: {
                    coding: [
                        {
                            system: 'http://loinc.org',
                            code: '8867-4',
                            display: 'Heart rate'
                        }
                    ]
                },
                subject: {
                    reference: `Patient/herinjema-patient-${patient_id}`
                },
                effectiveDateTime: vital_data.recorded_at,
                valueQuantity: {
                    value: vital_data.heart_rate,
                    unit: 'beats/minute',
                    system: 'http://unitsofmeasure.org',
                    code: '/min'
                }
            });
        }

        if (vital_data.glucose_level) {
            observations.push({
                resourceType: 'Observation',
                id: `herinjema-glucose-${vital_data.vital_id}`,
                status: 'final',
                category: [
                    {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                                code: 'laboratory'
                            }
                        ]
                    }
                ],
                code: {
                    coding: [
                        {
                            system: 'http://loinc.org',
                            code: '2345-7',
                            display: 'Glucose [Moles/volume] in Serum or Plasma'
                        }
                    ]
                },
                subject: {
                    reference: `Patient/herinjema-patient-${patient_id}`
                },
                effectiveDateTime: vital_data.recorded_at,
                valueQuantity: {
                    value: vital_data.glucose_level,
                    unit: 'mg/dL',
                    system: 'http://unitsofmeasure.org',
                    code: 'mg/dL'
                }
            });
        }

        return observations;
    }

    // ========================================================================
    // APPOINTMENT RESOURCE - HeriNjema Appointment → FHIR Appointment
    // ========================================================================

    async createAppointmentFHIR(appointment_data) {
        /**
         * FHIR Appointment Resource
         * https://www.hl7.org/fhir/appointment.html
         */
        const fhir_appointment = {
            resourceType: 'Appointment',
            id: `herinjema-apt-${appointment_data.appointment_id}`,
            meta: {
                lastUpdated: appointment_data.updated_at,
                source: 'HeriNjema'
            },
            status: this.mapAppointmentStatus(appointment_data.appointment_status),
            serviceCategory: [
                {
                    coding: [
                        {
                            system: 'http://terminology.hl7.org/CodeSystem/service-category',
                            code: 'alg',
                            display: 'Allergy'
                        }
                    ]
                }
            ],
            serviceType: [
                {
                    coding: [
                        {
                            system: 'http://terminology.hl7.org/CodeSystem/service-type',
                            code: '57',
                            display: 'Immunization'
                        }
                    ],
                    text: 'General Medical Consultation'
                }
            ],
            priority: this.mapPriorityToInt(appointment_data.priority_level),
            description: appointment_data.chief_complaint,
            start: appointment_data.appointment_time,
            end: new Date(new Date(appointment_data.appointment_time).getTime() + 30 * 60000), // 30 min duration
            participant: [
                {
                    type: [
                        {
                            coding: [
                                {
                                    system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                                    code: 'PPRF'
                                }
                            ]
                        }
                    ],
                    actor: {
                        reference: `Patient/herinjema-patient-${appointment_data.patient_id}`,
                        display: appointment_data.patient_name
                    },
                    required: 'required',
                    status: 'accepted'
                },
                {
                    type: [
                        {
                            coding: [
                                {
                                    system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                                    code: 'PPRF'
                                }
                            ]
                        }
                    ],
                    actor: {
                        reference: `Practitioner/herinjema-doctor-${appointment_data.doctor_id}`,
                        display: appointment_data.doctor_name
                    },
                    required: 'required',
                    status: 'accepted'
                }
            ],
            requestedPeriod: [
                {
                    start: appointment_data.appointment_time,
                    end: new Date(new Date(appointment_data.appointment_time).getTime() + 60 * 60000)
                }
            ]
        };

        return fhir_appointment;
    }

    // ========================================================================
    // ENCOUNTER RESOURCE - Hospital Visit → FHIR Encounter
    // ========================================================================

    async createEncounterFHIR(appointment_data, vitals_data) {
        /**
         * FHIR Encounter Resource
         * Represents patient-doctor interaction at hospital
         */
        const fhir_encounter = {
            resourceType: 'Encounter',
            id: `herinjema-encounter-${appointment_data.appointment_id}`,
            meta: {
                lastUpdated: new Date().toISOString(),
                source: 'HeriNjema'
            },
            status: appointment_data.appointment_status === 'COMPLETED' ? 'finished' : 'in-progress',
            class: {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                code: 'AMB',
                display: 'Ambulatory'
            },
            type: [
                {
                    coding: [
                        {
                            system: 'http://snomed.info/sct',
                            code: '185347001',
                            display: 'Encounter for problem'
                        }
                    ]
                }
            ],
            subject: {
                reference: `Patient/herinjema-patient-${appointment_data.patient_id}`
            },
            serviceProvider: {
                reference: `Organization/herinjema-hospital-${appointment_data.hospital_id}`
            },
            period: {
                start: appointment_data.appointment_time,
                end: appointment_data.appointment_status === 'COMPLETED' 
                    ? new Date().toISOString() 
                    : undefined
            },
            reason: [
                {
                    coding: [
                        {
                            system: 'http://snomed.info/sct',
                            display: appointment_data.chief_complaint
                        }
                    ]
                }
            ],
            diagnosis: [
                {
                    condition: {
                        reference: `Condition/herinjema-condition-${appointment_data.appointment_id}`
                    },
                    use: {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
                                code: 'CC',
                                display: 'Chief complaint'
                            }
                        ]
                    },
                    rank: 1
                }
            ]
        };

        return fhir_encounter;
    }

    // ========================================================================
    // PUSH TO HOSPITAL EMR (KenyaEMR, TaifaCare, etc.)
    // ========================================================================

    async pushPatientToEMR(patient_id) {
        try {
            // Fetch complete patient data
            const query = `
                SELECT p.*, u.phone_number, u.first_name, u.last_name, u.email
                FROM Patients p
                JOIN Users u ON p.user_id = u.user_id
                WHERE p.patient_id = $1
            `;

            const result = await pool.query(query, [patient_id]);
            if (result.rows.length === 0) {
                throw new Error('Patient not found');
            }

            const patient_data = result.rows[0];
            const fhir_patient = await this.createPatientFHIR(patient_data);

            // POST to FHIR server
            const response = await axios.post(
                `${this.fhir_server_url}/Patient`,
                fhir_patient,
                {
                    headers: {
                        'Content-Type': 'application/fhir+json',
                        'Authorization': `Bearer ${this.emr_api_key}`
                    }
                }
            );

            console.log(`[FHIR] Patient ${patient_id} pushed to EMR:`, response.data.id);
            return response.data;

        } catch (error) {
            console.error('[FHIR Push Error]:', error.message);
            throw new Error(`Failed to push patient to EMR: ${error.message}`);
        }
    }

    async pushVitalsToEMR(vital_id, patient_id) {
        try {
            const query = `SELECT * FROM PatientVitals WHERE vital_id = $1`;
            const result = await pool.query(query, [vital_id]);

            if (result.rows.length === 0) {
                throw new Error('Vital not found');
            }

            const vital_data = result.rows[0];
            const observations = await this.createVitalObservationFHIR(vital_data, patient_id);

            // Push each observation
            for (const obs of observations) {
                await axios.post(
                    `${this.fhir_server_url}/Observation`,
                    obs,
                    {
                        headers: {
                            'Content-Type': 'application/fhir+json',
                            'Authorization': `Bearer ${this.emr_api_key}`
                        }
                    }
                );
            }

            console.log(`[FHIR] Vitals for patient ${patient_id} pushed to EMR`);
            return observations;

        } catch (error) {
            console.error('[FHIR Vitals Push Error]:', error.message);
            throw new Error(`Failed to push vitals: ${error.message}`);
        }
    }

    async pushAppointmentToEMR(appointment_id) {
        try {
            const query = `
                SELECT a.*, 
                       u.first_name as patient_first, u.last_name as patient_last,
                       d.specialty,
                       h.name as hospital_name
                FROM Appointments a
                JOIN Patients p ON a.patient_id = p.patient_id
                JOIN Users u ON p.user_id = u.user_id
                LEFT JOIN Doctors d ON a.doctor_id = d.doctor_id
                JOIN Hospitals h ON a.hospital_id = h.hospital_id
                WHERE a.appointment_id = $1
            `;

            const result = await pool.query(query, [appointment_id]);
            if (result.rows.length === 0) {
                throw new Error('Appointment not found');
            }

            const apt_data = result.rows[0];
            apt_data.patient_name = `${apt_data.patient_first} ${apt_data.patient_last}`;
            apt_data.doctor_name = apt_data.specialty || 'General Practitioner';

            const fhir_apt = await this.createAppointmentFHIR(apt_data);

            const response = await axios.post(
                `${this.fhir_server_url}/Appointment`,
                fhir_apt,
                {
                    headers: {
                        'Content-Type': 'application/fhir+json',
                        'Authorization': `Bearer ${this.emr_api_key}`
                    }
                }
            );

            console.log(`[FHIR] Appointment ${appointment_id} pushed to EMR`);
            return response.data;

        } catch (error) {
            console.error('[FHIR Appointment Push Error]:', error.message);
            throw new Error(`Failed to push appointment: ${error.message}`);
        }
    }

    // ========================================================================
    // PULL FROM HOSPITAL EMR (Sync clinical notes, diagnoses, etc.)
    // ========================================================================

    async pullPatientEncounterFromEMR(fhir_patient_id) {
        try {
            const response = await axios.get(
                `${this.fhir_server_url}/Encounter?subject=${fhir_patient_id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.emr_api_key}`
                    }
                }
            );

            console.log('[FHIR] Encounters retrieved from EMR:', response.data.total);
            return response.data.entry || [];

        } catch (error) {
            console.error('[FHIR Pull Error]:', error.message);
            return [];
        }
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    mapAppointmentStatus(herinjema_status) {
        const mapping = {
            'PENDING': 'proposed',
            'CONFIRMED': 'booked',
            'CANCELLED': 'cancelled',
            'COMPLETED': 'fulfilled'
        };
        return mapping[herinjema_status] || 'proposed';
    }

    mapPriorityToInt(priority_level) {
        const mapping = {
            'LOW': 0,
            'NORMAL': 1,
            'HIGH': 2,
            'CRITICAL': 3
        };
        return mapping[priority_level] || 1;
    }
}

module.exports = new FHIRService();
