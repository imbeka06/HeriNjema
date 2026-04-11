# 🏥 HeriNjema - Quick Start Guide

**Healthcare Platform for Kenya's Diverse Device Ecosystem**

---

## ⚡ Quick Setup (5 minutes)

### Backend Start
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/herinjema
JWT_SECRET=your_secret_key_here
SAFARICOM_CONSUMER_KEY=xxx
SAFARICOM_CONSUMER_SECRET=xxx
AFRICA_TALKING_API_KEY=xxx
AFRICA_TALKING_USERNAME=xxx
EOF

# Create database
createdb herinjema
psql herinjema < ../schema.sql

# Start server
npm start
```

Server runs on http://localhost:3000

### Frontend Start
```bash
cd frontend

# Install dependencies
npm install

# Start Expo development
npx expo start

# Scan QR code with Expo Go app (iOS/Android)
```

---

## 🧪 Test the API

### 1. Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+254712345678",
    "password": "SecurePass123!",
    "user_type": "PATIENT",
    "full_name": "John Doe"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+254712345678",
    "password": "SecurePass123!"
  }'
```

⚠️ **Save the JWT token returned**

### 3. Book Appointment
```bash
curl -X POST http://localhost:3000/api/appointments/book \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "hospital_id": "hospital-knh",
    "appointment_date": "2024-04-20",
    "appointment_time": "14:30",
    "chief_complaint": "Headache and fever",
    "symptoms": ["Headache", "Fever"]
  }'
```

### 4. AI Triage Analysis
```bash
curl -X POST http://localhost:3000/api/heribot/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "symptom_input": "I have chest pain and difficulty breathing",
    "patient_id": "pat-001"
  }'
```

### 5. View API Docs
Open: http://localhost:3000/api-docs

---

## 📚 Documentation

### Complete References
- [API Documentation](./API_DOCUMENTATION.md) - All 50+ endpoints
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Architecture & features
- [Database Schema](./backend/schema.sql) - 15 tables with 20+ indexes

### Key Files
- **Backend Entry:** `backend/server.js`
- **Frontend Login:** `frontend/app/index.tsx`
- **Emergency Screen:** `frontend/app/(tabs)/emergency.tsx`
- **API Docs Config:** `backend/swagger.js`

---

## 🗂️ Project Structure

```
HeriNjema/
├── backend/                    # Node.js Express server
│   ├── src/
│   │   ├── models/            # Database models
│   │   ├── routes/            # API endpoints
│   │   ├── controllers/       # Business logic
│   │   ├── services/          # Integrations (FHIR, HeriBot, etc)
│   │   └── utils/             # Validators, error handlers
│   └── server.js              # Main entry
│
├── frontend/                  # React Native Expo app
│   ├── app/
│   │   ├── index.tsx          # Login screen
│   │   └── (tabs)/
│   │       ├── emergency.tsx  # Emergency alerts
│   │       ├── book.tsx       # Appointments
│   │       └── pay.tsx        # Payments
│   └── components/
│
├── API_DOCUMENTATION.md       # Complete API reference
├── IMPLEMENTATION_SUMMARY.md  # Architecture doc
└── schema.sql                 # Database creation script
```

---

## 🔑 Key Features

### 📱 Smart Appointments
- AI-powered triage (HeriBot)
- Live queue management
- Real-time status updates

### 💳 Seamless Payments
- M-Pesa one-click (STK Push)
- Insurance auto-deduction
- Digital QR receipts

### 🚨 Emergency Alerts
- GPS location tracking
- Real-time hospital dispatch
- Vital signs monitoring

### 🏥 Hospital Dashboard
- Live triage queue (color-coded)
- Emergency console
- Direct admittance panel

### 📞 Feature Phone Support
- USSD menu: *384*123#
- Full appointment workflow
- Works on 2G phones

### 🔄 Hospital Integration
- HL7 FHIR EMR sync (KenyaEMR, TaifaCare)
- Bidirectional patient records
- Real-time observations

### 🤖 AI Triage (HeriBot)
- 50+ symptom conditions
- Vitals-based risk scoring
- Clinical recommendations

### ⚡ Real-Time Updates
- WebSocket live notifications
- Emergency alerts
- Queue updates

---

## 🔒 Security Features

✅ JWT token authentication (7-day expiry)
✅ bcrypt password hashing (10 rounds)
✅ Role-based access control (PATIENT, HOSPITAL_STAFF, ADMIN)
✅ Rate limiting per phone number
✅ Biometric fingerprint/face unlock
✅ Secure storage (expo-secure-store)
✅ Audit logging for all changes
✅ GPS location encryption
✅ M-Pesa callback verification

---

## 📊 Database

### 15 Core Tables
```sql
-- User management
Users, Patients, Doctors, Hospitals

-- Appointments & Triage
Appointments, TriageRecords, EmergencyAlerts

-- Payments & Billing
Invoices, Transactions, InsuranceVerification

-- Communications
USSDSessions, WhatsAppConversations

-- Monitoring
PatientVitals, AuditLog
```

### Indexes
- 20+ performance indexes on critical columns
- Composite indexes for multi-field queries
- Full-text search on patient names

---

## 🚀 Deployment

### Production Ready
- Horizontal scaling (stateless backend)
- Database connection pooling
- WebSocket load balancing
- Centralized logging
- Health check endpoints
- Rate limiting
- Error tracking

### Environment Variables
```env
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=super-secret-key
SAFARICOM_CONSUMER_KEY=xxx
SAFARICOM_CONSUMER_SECRET=xxx
AFRICA_TALKING_API_KEY=xxx
AFRICA_TALKING_USERNAME=xxx
NODE_ENV=production
```

---

## 🧪 Testing

### Unit Tests (To Implement)
```bash
npm test
```

### API Integration Tests
- Use Postman collection (included)
- Or run curl commands above

### Real Device Testing
1. Register account on smartphone
2. Book appointment
3. Receive M-Pesa STK push
4. Test emergency alert with GPS

---

## 📞 Support

- **Email:** support@herinjema.co.ke
- **Emergency Hotline:** +254 (0)20 2726000
- **API Issues:** Check `/api-docs` for live documentation
- **GitHub Issues:** Report bugs with reproduction steps

---

## 📝 Git Commands

Useful commands for development:

```bash
# View recent commits
git log --oneline -5

# Check uncommitted changes
git status

# Add and commit
git add .
git commit -m "added feature description"

# Push to GitHub
git push origin main

# View specific file changes
git show HEAD:path/to/file.js
```

---

## 🎓 Next Steps

### For Hospital Pilot
1. Set up PostgreSQL database
2. Configure M-Pesa (Safaricom Daraja)
3. Configure USSD (Africa's Talking)
4. Deploy backend to production server
5. Build iOS/Android APKs via Expo
6. Train hospital staff on dashboard
7. Launch with 50-100 early users

### For Full Launch
1. Multi-language support (Swahili/Luo)
2. Telemedicine (video calls)
3. Lab results integration
4. E-pharmacy by prescription
5. Analytics dashboard
6. Mobile money alternatives

---

## ✅ Production Checklist

- [ ] Database backups enabled
- [ ] SSL certificates installed
- [ ] Rate limiting configured
- [ ] Error monitoring setup (Sentry)
- [ ] Performance monitoring (NewRelic)
- [ ] 24/7 on-call support
- [ ] Disaster recovery tested
- [ ] Security audit passed
- [ ] Load testing > 1000 users
- [ ] Monitoring dashboard live

---

## 📜 License

MIT License - See LICENSE file

---

## 💡 Architecture Diagram

```
┌─────────────────┐
│  Smartphones    │
│ (React Native)  │
└────────┬────────┘
         │ HTTP/WebSocket
         ↓
┌─────────────────────────────────────┐
│   Node.js Backend (Express.js)      │
│  ├─ Auth (JWT, biometric)           │
│  ├─ Appointments (triage queue)     │
│  ├─ Payments (M-Pesa STK)           │
│  ├─ Emergency alerts (GPS + WebSocket)
│  ├─ HeriBot AI (symptom analysis)   │
│  ├─ FHIR EMR sync (KenyaEMR)        │
│  └─ Hospital dashboard              │
└────────┬────────────────────────────┘
         │
    ┌────┴─────┬────────┬───────────┐
    ↓          ↓        ↓           ↓
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│PostgreSQL│M-Pesa  │ USSD   │ FHIR   │
│ (15 tbl) │Daraja  │Africa's│KenyaEMR
│ + Redis  │(STK)   │Talking │(Taiface)
└────────┘ └────────┘ └────────┘ └────────┘
```

---

**Last Updated: April 15, 2024**
*Recommended for pilot launch with 5 partner hospitals*
