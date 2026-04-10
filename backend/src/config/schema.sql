-- ============================================================================
-- File: HeriNjema Database Schema (PostgreSQL)
-- This file contains all tables for the complete USSD + Mobile + Hospital system
-- Run this in your PostgreSQL database to initialize the schema
-- ============================================================================

-- === USERS & AUTHENTICATION ===

CREATE TABLE IF NOT EXISTS Users (
    user_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    user_type ENUM('PATIENT', 'DOCTOR', 'HOSPITAL_STAFF', 'ADMIN'),
    biometric_id VARCHAR(100),
    national_id VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === PATIENTS ===

CREATE TABLE IF NOT EXISTS Patients (
    patient_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES Users(user_id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(10),
    blood_type VARCHAR(5),
    emergency_contact_phone VARCHAR(15),
    emergency_contact_name VARCHAR(100),
    insurance_provider VARCHAR(50), -- 'SHA', 'NHIF', 'PRIVATE', etc.
    insurance_number VARCHAR(50),
    medical_allergies TEXT,
    chronic_conditions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === DOCTORS ===

CREATE TABLE IF NOT EXISTS Doctors (
    doctor_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES Users(user_id) ON DELETE CASCADE,
    license_number VARCHAR(100),
    specialty VARCHAR(100),
    registration_number VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,
    average_rating DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === HOSPITALS ===

CREATE TABLE IF NOT EXISTS Hospitals (
    hospital_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hospital_code VARCHAR(50) UNIQUE NOT NULL,
    location_latitude DECIMAL(9, 6),
    location_longitude DECIMAL(9, 6),
    phone_number VARCHAR(15),
    email VARCHAR(100),
    has_emr_system BOOLEAN DEFAULT FALSE,
    emr_provider VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === HOSPITAL STAFF ===

CREATE TABLE IF NOT EXISTS HospitalStaff (
    staff_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES Users(user_id) ON DELETE CASCADE,
    hospital_id INT REFERENCES Hospitals(hospital_id) ON DELETE CASCADE,
    department VARCHAR(100),
    role VARCHAR(50), -- 'RECEPTIONIST', 'NURSE', 'FINANCE', 'ADMIN'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === APPOINTMENTS ===

CREATE TABLE IF NOT EXISTS Appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES Patients(patient_id) ON DELETE CASCADE,
    doctor_id INT REFERENCES Doctors(doctor_id) ON DELETE CASCADE,
    hospital_id INT REFERENCES Hospitals(hospital_id) ON DELETE CASCADE,
    appointment_time TIMESTAMP NOT NULL,
    appointment_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'
    is_emergency BOOLEAN DEFAULT FALSE,
    priority_level VARCHAR(20) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'
    chief_complaint TEXT,
    triage_score INT,
    booking_method VARCHAR(20), -- 'MOBILE_APP', 'USSD', 'WHATSAPP', 'HOSPITAL'
    notes TEXT,
    created_via_app BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === PATIENT VITALS (Pre-visit recorded data) ===

CREATE TABLE IF NOT EXISTS PatientVitals (
    vital_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES Patients(patient_id) ON DELETE CASCADE,
    appointment_id INT REFERENCES Appointments(appointment_id) ON DELETE CASCADE,
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    heart_rate INT,
    temperature DECIMAL(5, 2),
    glucose_level INT,
    weight DECIMAL(6, 2),
    height DECIMAL(5, 2),
    oxygen_saturation INT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === INVOICES & BILLING ===

CREATE TABLE IF NOT EXISTS Invoices (
    invoice_id SERIAL PRIMARY KEY,
    appointment_id INT UNIQUE REFERENCES Appointments(appointment_id),
    patient_id INT REFERENCES Patients(patient_id),
    hospital_id INT REFERENCES Hospitals(hospital_id),
    total_amount DECIMAL(10, 2) NOT NULL,
    sha_coverage DECIMAL(10, 2) DEFAULT 0,
    patient_responsibility DECIMAL(10, 2),
    invoice_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE'
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === TRANSACTIONS (M-Pesa & Payment Tracking) ===

CREATE TABLE IF NOT EXISTS Transactions (
    transaction_id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES Invoices(invoice_id),
    patient_id INT REFERENCES Patients(patient_id),
    appointment_id INT REFERENCES Appointments(appointment_id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- 'MPESA', 'CARD', 'CASH', 'SHA'
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED', 'REVERSED'
    checkout_request_id VARCHAR(100), -- Safaricom identifier
    merchant_request_id VARCHAR(100),
    mpesa_receipt_number VARCHAR(100),
    transaction_reference VARCHAR(100) UNIQUE,
    payment_timestamp TIMESTAMP,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === INSURANCE VERIFICATION CACHE ===

CREATE TABLE IF NOT EXISTS InsuranceVerification (
    verification_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES Patients(patient_id),
    insurance_number VARCHAR(50),
    coverage_status VARCHAR(50), -- 'ACTIVE', 'EXPIRED', 'INACTIVE'
    coverage_limit DECIMAL(10, 2),
    last_verified TIMESTAMP,
    provider VARCHAR(50), -- 'SHA', 'NHIF', etc.
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === EMERGENCY ALERTS ===

CREATE TABLE IF NOT EXISTS EmergencyAlerts (
    alert_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES Patients(patient_id),
    appointment_id INT REFERENCES Appointments(appointment_id),
    alert_type VARCHAR(50), -- 'ONE_CLICK_EMERGENCY', 'AUTO_TRIAGE_CRITICAL'
    alert_status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESPONDED', 'CANCELLED'
    patient_location_latitude DECIMAL(9, 6),
    patient_location_longitude DECIMAL(9, 6),
    ambulance_assigned_to INT, -- future: ambulance tracking
    critical_notes TEXT,
    emergency_contact_notified BOOLEAN DEFAULT FALSE,
    hospital_notified BOOLEAN DEFAULT FALSE,
    response_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === HERI BOT TRIAGE RECORDS ===

CREATE TABLE IF NOT EXISTS TriageRecords (
    triage_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES Patients(patient_id),
    appointment_id INT REFERENCES Appointments(appointment_id),
    symptom_input TEXT,
    ai_assessment TEXT,
    recommended_priority VARCHAR(20), -- 'ROUTINE', 'URGENT', 'EMERGENT'
    confidence_score DECIMAL(3, 2),
    recommended_actions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === USSD SESSION TRACKING ===

CREATE TABLE IF NOT EXISTS USSDSessions (
    session_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) NOT NULL,
    session_data TEXT, -- JSON: user selections during USSD flow
    session_status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED', 'EXPIRED'
    menu_level INT,
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === WHATSAPP CONVERSATION LOG ===

CREATE TABLE IF NOT EXISTS WhatsAppConversations (
    conversation_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES Patients(patient_id),
    whatsapp_message_id VARCHAR(100),
    direction VARCHAR(20), -- 'INBOUND', 'OUTBOUND'
    message_type VARCHAR(50), -- 'TEXT', 'DOCUMENT', 'IMAGE', 'BUTTON_REPLY'
    message_content TEXT,
    flow_step VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === AUDIT LOG (For compliance & debugging) ===

CREATE TABLE IF NOT EXISTS AuditLog (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    action VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id INT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === INDEXES FOR PERFORMANCE ===

CREATE INDEX idx_patients_phone ON Patients USING HASH((SELECT phone_number FROM Users WHERE Users.user_id = Patients.user_id));
CREATE INDEX idx_appointments_patient ON Appointments(patient_id);
CREATE INDEX idx_appointments_time ON Appointments(appointment_time);
CREATE INDEX idx_appointments_status ON Appointments(appointment_status);
CREATE INDEX idx_transactions_status ON Transactions(payment_status);
CREATE INDEX idx_invoices_patient ON Invoices(patient_id);
CREATE INDEX idx_emergency_alerts_status ON EmergencyAlerts(alert_status);
CREATE INDEX idx_ussd_session_phone ON USSDSessions(phone_number);

