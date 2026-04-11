# HeriNjema API Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URLs](#base-urls)
4. [Core Endpoints](#core-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Appointments](#appointment-endpoints)
   - [Billing & Payments](#billing--payment-endpoints)
   - [Hospital Dashboard](#hospital-dashboard-endpoints)
   - [HL7 FHIR Integration](#hl7-fhir-integration-endpoints)
   - [AI HeriBot Triage](#ai-heribot-triage-endpoints)
   - [Real-time WebSocket](#real-time-websocket)
   - [USSD (Feature Phone)](#ussd-feature-phone-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## 📱 Overview

**HeriNjema** is a comprehensive healthcare platform designed for Kenya's diverse device ecosystem. It bridges smartphones and feature phones, integrating with hospital systems, insurance providers, and payment platforms.

**Key Features:**
✅ Appointment booking with AI-powered triage
✅ Hospital EMR integration (HL7 FHIR)
✅ M-Pesa one-click payments
✅ Emergency alerts with GPS tracking
✅ Direct admittance for pre-approved patients
✅ Digital medical records
✅ USSD support for feature phones
✅ Real-time WebSocket notifications

---

## 🔐 Authentication

All endpoints (except `/auth/register` and `/auth/login`) require a JWT token.

**Header Format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Obtaining a Token:**
1. Call `/api/auth/register` to create account
2. Call `/api/auth/login` with credentials
3. Receive JWT token (7-day expiry)
4. Include in all subsequent requests

**Token Payload:**
```json
{
  "user_id": "usr-12345",
  "phone_number": "+254712345678",
  "user_type": "PATIENT",
  "hospital_id": "hospital-knh",
  "exp": 1681516800
}
```

---

## 🌐 Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3000/api` |
| Production | `https://api.herinjema.co.ke` |
| WebSocket | `ws://localhost:3000` |

---

## 📲 Core Endpoints

### Authentication Endpoints

#### Register User
```
POST /auth/register
```

**Request:**
```json
{
  "phone_number": "+254712345678",
  "password": "SecurePass123!",
  "user_type": "PATIENT",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "user_id": "usr-12345",
  "message": "Registration successful"
}
```

#### Login
```
POST /auth/login
```

**Request:**
```json
{
  "phone_number": "+254712345678",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": "usr-12345",
  "user_type": "PATIENT"
}
```

#### Verify OTP
```
POST /auth/verify-otp
Authorization: Bearer <token>
```

**Request:**
```json
{
  "phone_number": "+254712345678",
  "otp": "123456"
}
```

#### Biometric Enrollment
```
POST /auth/biometric/enroll
Authorization: Bearer <token>
```

**Request:**
```json
{
  "biometric_type": "FINGERPRINT",
  "biometric_data": "base64_encoded_fingerprint_data"
}
```

#### Biometric Login
```
POST /auth/biometric/login
```

**Request:**
```json
{
  "phone_number": "+254712345678",
  "biometric_data": "base64_encoded_fingerprint_data"
}
```

---

### Appointment Endpoints

#### Book Appointment
```
POST /appointments/book
Authorization: Bearer <token>
```

**Request:**
```json
{
  "hospital_id": "hospital-knh",
  "appointment_date": "2024-04-20",
  "appointment_time": "14:30",
  "chief_complaint": "Headache and fever",
  "symptoms": ["Headache", "Fever", "Fatigue"],
  "is_urgent": false
}
```

**Response (201):**
```json
{
  "success": true,
  "appointment_id": "apt-54321",
  "appointment_date": "2024-04-20",
  "appointment_time": "14:30",
  "estimated_wait_time": 30,
  "queue_position": 5,
  "status": "CONFIRMED"
}
```

#### Get Upcoming Appointments
```
GET /appointments/upcoming
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "appointments": [
    {
      "appointment_id": "apt-54321",
      "hospital_name": "Kenyatta National Hospital",
      "appointment_date": "2024-04-20",
      "appointment_time": "14:30",
      "status": "CONFIRMED"
    }
  ]
}
```

#### Get Live Triage Queue
```
GET /appointments/hospital/:hospital_id/triage-queue
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "queue_length": 12,
  "queue": [
    {
      "queue_position": 1,
      "patient_name": "Alice Kamau",
      "chief_complaint": "Chest pain",
      "priority_level": "CRITICAL",
      "wait_time_minutes": 2
    }
  ]
}
```

---

### Billing & Payment Endpoints

#### Get Invoice
```
GET /billing/invoices/:invoice_id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "invoice": {
    "invoice_id": "inv-001",
    "date": "2024-04-15",
    "amount": 5000,
    "items": [
      { "description": "Consultation", "amount": 2000 },
      { "description": "Lab tests", "amount": 3000 }
    ],
    "insurance_coverage": 2500,
    "patient_amount": 2500,
    "status": "PENDING"
  }
}
```

#### Initiate M-Pesa Payment (STK Push)
```
POST /billing/payment/mpesa-stk
Authorization: Bearer <token>
```

**Request:**
```json
{
  "invoice_id": "inv-001",
  "phone_number": "+254712345678",
  "amount": 5000
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "STK Push sent to +254712345678",
  "checkout_request_id": "ws_CO_1234567890"
}
```

#### Verify Insurance Coverage
```
POST /billing/insurance/verify
Authorization: Bearer <token>
```

**Request:**
```json
{
  "insurance_provider": "SHA",
  "policy_number": "123456789"
}
```

**Response (200):**
```json
{
  "success": true,
  "coverage_status": "ACTIVE",
  "monthly_limit": 50000,
  "used_amount": 15000,
  "remaining_balance": 35000
}
```

---

### Hospital Dashboard Endpoints

#### Get Live Triage Queue
```
GET /hospital/triage-queue
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "queue": [
    {
      "position": 1,
      "patient_name": "Alice Kamau",
      "priority": "CRITICAL",
      "symptoms": ["Chest pain"],
      "wait_time": 5,
      "color_coded": "RED"
    }
  ]
}
```

#### Get Emergency Alerts
```
GET /hospital/emergency-alerts
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "alerts": [
    {
      "alert_id": "alert-001",
      "patient_name": "Bob Omondi",
      "gps_location": { "lat": -1.2921, "lng": 36.8219 },
      "vital_signs": { "heart_rate": 130, "bp": "150/90" },
      "priority": "CRITICAL",
      "timestamp": "2024-04-15T14:30:00Z"
    }
  ]
}
```

#### Update Appointment Status
```
PUT /hospital/appointments/:appointment_id/status
Authorization: Bearer <token>
```

**Request:**
```json
{
  "status": "IN_CONSULTATION",
  "assigned_doctor": "Dr. Jane Smith"
}
```

---

### HL7 FHIR Integration Endpoints

#### Push Patient to EMR
```
POST /fhir/patient/push
Authorization: Bearer <token>
```

**Request:**
```json
{
  "patient_id": "pat-001",
  "emr_system": "KenyaEMR"
}
```

**Response (200):**
```json
{
  "success": true,
  "fhir_patient_id": "Patient/12345",
  "message": "Patient synchronized with EMR"
}
```

#### Push Vital Signs
```
POST /fhir/vitals/push
Authorization: Bearer <token>
```

**Request:**
```json
{
  "patient_id": "pat-001",
  "appointment_id": "apt-001",
  "blood_pressure": "120/80",
  "heart_rate": 72,
  "temperature": 37.0,
  "oxygen_saturation": 98
}
```

#### Pull Patient Records from EMR
```
POST /fhir/patient/pull
Authorization: Bearer <token>
```

**Request:**
```json
{
  "patient_id": "pat-001",
  "emr_system": "TaifaCare"
}
```

**Response (200):**
```json
{
  "success": true,
  "patient_record": {
    "fhir_patient": { ... },
    "observations": [ ... ],
    "encounters": [ ... ]
  }
}
```

---

### AI HeriBot Triage Endpoints

#### Analyze Symptoms
```
POST /heribot/analyze
Authorization: Bearer <token>
```

**Request:**
```json
{
  "symptom_input": "I have chest pain and difficulty breathing",
  "patient_id": "pat-001",
  "appointment_id": "apt-001"
}
```

**Response (200):**
```json
{
  "success": true,
  "triage": {
    "priority_level": "CRITICAL",
    "confidence_score": 0.92,
    "medical_conditions": [
      { "condition": "Acute Coronary Syndrome", "probability": 0.75 },
      { "condition": "Pneumonia", "probability": 0.45 }
    ],
    "recommended_tests": ["ECG", "Troponin", "Chest X-ray"],
    "clinical_recommendation": "Immediate cardiology consultation required"
  }
}
```

#### Symptom Interview Flow
```
POST /heribot/interview/start
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "session_id": "interview-1681516800-abc123",
  "current_question": {
    "question_id": "q1",
    "question": "What is the main thing bothering you today?",
    "question_type": "open_text"
  }
}
```

#### Continue Interview
```
POST /heribot/interview/continue
Authorization: Bearer <token>
```

**Request:**
```json
{
  "session_id": "interview-1681516800-abc123",
  "answer": "Severe chest pain for 2 hours"
}
```

#### Get Triage History
```
GET /heribot/triage-history/:patient_id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "history": [
    {
      "timestamp": "2024-04-15T14:30:00Z",
      "priority_level": "URGENT",
      "chief_complaint": "Chest pain"
    }
  ]
}
```

---

### Real-time WebSocket

#### Connect to WebSocket
```
ws://localhost:3000
```

**Authentication Message:**
```json
{
  "type": "AUTH",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Subscribe to Emergency Alerts:**
```json
{
  "type": "SUBSCRIBE",
  "channel": "emergency-alerts"
}
```

**Incoming Emergency Alert:**
```json
{
  "type": "EMERGENCY_ALERT",
  "timestamp": "2024-04-15T14:30:00Z",
  "data": {
    "alert_id": "alert-001",
    "patient_name": "Alice Kamau",
    "gps_location": { "lat": -1.2921, "lng": 36.8219 },
    "priority_level": "CRITICAL"
  }
}
```

---

### USSD Feature Phone Endpoints

#### Receive USSD Input
```
POST /ussd/callback
```

**Request (Africa's Talking):**
```
sessionId=123&serviceCode=384*123#&text=1&phoneNumber=%2B254712345678
```

**Response:** 
```
CON Welcome to HeriNjema
1. Book Appointment
2. Check Insurance
3. Make Emergency Alert
```

---

## ⚠️ Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error_code": "AUTH_001",
  "message": "Invalid token or expired",
  "details": "Token expired on 2024-04-15"
}
```

**Common Error Codes:**
| Code | HTTP | Meaning |
|------|------|---------|
| AUTH_001 | 401 | Invalid or missing token |
| AUTH_002 | 403 | Insufficient permissions |
| VAL_001 | 400 | Validation error |
| NOT_FOUND | 404 | Resource not found |
| SYS_001 | 500 | Internal server error |

---

## 📊 Rate Limiting

- **Standard endpoints:** 100 requests/minute
- **Authentication endpoints:** 10 requests/minute per phone
- **Billing endpoints:** 50 requests/minute
- **WebSocket:** Continuous connection

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1681516860
```

---

## 🚀 Getting Started

1. **Register:** `POST /auth/register`
2. **Login:** `POST /auth/login` → Get JWT token
3. **Book Appointment:** `POST /appointments/book`
4. **Get Triage Analysis:** `POST /heribot/analyze`
5. **Make Payment:** `POST /billing/payment/mpesa-stk`
6. **Connect WebSocket:** `ws://localhost:3000` + AUTH

---

## 📞 Support

- **Email:** support@herinjema.co.ke
- **Emergency Hotline:** +254 (0)20 2726000
- **Documentation:** https://docs.herinjema.co.ke

---

*Last Updated: April 15, 2024*
*API Version: 1.0.0*
