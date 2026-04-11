// ============================================================================
// File: swagger.js
// Swagger/OpenAPI Configuration
// Generates interactive API documentation at /api-docs
// ============================================================================

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// ============================================================================
// SWAGGER OPTIONS
// ============================================================================

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'HeriNjema Healthcare API',
            version: '1.0.0',
            description: `
                Comprehensive healthcare platform API for Kenya's diverse device ecosystem.
                
                **Core Features:**
                - 📱 Appointment booking with real-time triage
                - 🏥 Hospital EMR integration (HL7 FHIR)
                - 💳 M-Pesa one-click payments
                - 🚨 Emergency alerts with GPS tracking
                - 👤 Direct admittance for pre-approved patients
                - 📋 Digital medical records
                - 📞 USSD support for feature phones (*384*123#)
                - 🤖 AI-powered triage system (HeriBot)
                - 🔄 Real-time WebSocket notifications
                
                **Authentication:**
                All endpoints require JWT token in Authorization header:
                \`\`\`
                Authorization: Bearer <jwt_token>
                \`\`\`
                
                **WebSocket Connection:**
                Connect to \`ws://localhost:3000\` and authenticate with:
                \`\`\`json
                {
                    "type": "AUTH",
                    "token": "<jwt_token>"
                }
                \`\`\`
            `,
            contact: {
                name: 'HeriNjema Support',
                email: 'support@herinjema.co.ke'
            },
            license: {
                name: 'MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Development Server'
            },
            {
                url: 'https://api.herinjema.co.ke',
                description: 'Production Server'
            }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    required: ['phone_number', 'password', 'user_type'],
                    properties: {
                        user_id: { type: 'string', example: 'usr-12345' },
                        phone_number: { type: 'string', example: '+254712345678' },
                        password: { type: 'string', format: 'password' },
                        user_type: { type: 'string', enum: ['PATIENT', 'HOSPITAL_STAFF', 'ADMIN'] },
                        full_name: { type: 'string' },
                        email: { type: 'string', format: 'email' }
                    }
                },
                Appointment: {
                    type: 'object',
                    properties: {
                        appointment_id: { type: 'string' },
                        patient_id: { type: 'string' },
                        hospital_id: { type: 'string' },
                        appointment_date: { type: 'string', format: 'date' },
                        appointment_time: { type: 'string', format: 'time' },
                        status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
                        chief_complaint: { type: 'string' },
                        priority_level: { type: 'string', enum: ['ROUTINE', 'HIGH', 'URGENT', 'CRITICAL'] }
                    }
                },
                Invoice: {
                    type: 'object',
                    properties: {
                        invoice_id: { type: 'string' },
                        patient_id: { type: 'string' },
                        amount: { type: 'number', format: 'decimal' },
                        status: { type: 'string', enum: ['PENDING', 'PAID', 'OVERDUE'] },
                        insurance_coverage: { type: 'number', format: 'decimal' }
                    }
                },
                TriageRecord: {
                    type: 'object',
                    properties: {
                        patient_id: { type: 'string' },
                        appointment_id: { type: 'string' },
                        symptoms: { type: 'array', items: { type: 'string' } },
                        priority_level: { type: 'string' },
                        recommendation: { type: 'string' },
                        confidence_score: { type: 'number' }
                    }
                },
                FHIRPatient: {
                    type: 'object',
                    properties: {
                        resourceType: { type: 'string', example: 'Patient' },
                        id: { type: 'string' },
                        identifier: { type: 'array' },
                        name: { type: 'array' },
                        telecom: { type: 'array' },
                        birthDate: { type: 'string', format: 'date' }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);

// ============================================================================
// EXPORT CONFIGURATION
// ============================================================================

module.exports = {
    swaggerUi,
    specs
};
