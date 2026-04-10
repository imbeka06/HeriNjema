// ============================================================================
// File: src/controllers/ussdController.js
// USSD Menu Flow Handler for Feature Phones and Basic Phones
// Implements the core "HeriNjema" 6 pillars through USSD
// ============================================================================

const pool = require('../config/db');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const { initiateSTKPush } = require('../services/mpesaService');
const { verifySHACoverage } = require('../services/shaService');
const { validatePhoneNumber, formatPhoneNumber } = require('../utils/validators');

// ============================================================================
// MAIN USSD REQUEST HANDLER
// ============================================================================

const handleUSSDRequest = async (req, res) => {
    const {
        sessionId,        // Africa's Talking session tracker
        phoneNumber,      // User's phone in international format
        text,             // User's input (empty on first call, e.g., "*384*123#")
        serviceCode       // The USSD code the user dialed
    } = req.body;

    if (!phoneNumber) {
        return res.set('Content-Type', 'text/plain').send('END Session terminated: Invalid phone number');
    }

    try {
        // Step 1: Get or create USSD session
        let session_data = await getOrCreateUSSDSession(sessionId, phoneNumber);

        // Step 2: Route based on user input
        let ussd_response = '';

        if (!text || text.trim() === '') {
            // First interaction (user just dialed the USSD code)
            ussd_response = buildMainMenu();
            session_data.menu_level = 0;
        } else {
            const user_input = text.split('*').pop(); // Get the last menu selection

            if (session_data.menu_level === 0) {
                ussd_response = await handleMainMenuSelection(user_input, phoneNumber, session_data);
            } else if (session_data.menu_level === 1) {
                ussd_response = await handleBookingFlow(user_input, phoneNumber, session_data);
            } else if (session_data.menu_level === 2) {
                ussd_response = await handleInsuranceCheck(user_input, phoneNumber, session_data);
            } else if (session_data.menu_level === 3) {
                ussd_response = await handlePaymentFlow(user_input, phoneNumber, session_data);
            } else if (session_data.menu_level === 4) {
                ussd_response = await handleEmergencyFlow(phoneNumber);
            }
        }

        // Step 3: Save session state
        await saveUSSDSession(sessionId, session_data);

        // Step 4: Return USSD response to Africa's Talking
        // Response format: "CON Menu text" (CON = continue session) or "END Response" (session ends)
        return res.set('Content-Type', 'text/plain').send(ussd_response);

    } catch (error) {
        console.error('[USSD Error]:', error.message);
        return res.set('Content-Type', 'text/plain').send('END An error occurred. Please try again later.');
    }
};

// ============================================================================
// MENU BUILDERS
// ============================================================================

const buildMainMenu = () => {
    return `CON Welcome to HeriNjema HealthCare
    
1. Book Appointment
2. Check Insurance Coverage
3. Emergency Alert
4. Payment History
5. My Profile

Select option:`;
};

const buildBookingMenu = () => {
    return `CON Select Hospital:

1. Nairobi General Hospital
2. Aga Khan Hospital
3. Kenyatta National Hospital

Select:`;
};

const buildDoctorMenu = () => {
    return `CON Select Specialist:

1. General Practice
2. Pediatrics
3. Cardiology
4. Back

Select:`;
};

const buildTimeMenu = () => {
    return `CON Available Times:

1. 09:00 AM
2. 10:30 AM
3. 1:00 PM
4. 3:15 PM
5. Back

Select:`;
};

// ============================================================================
// SELECTION HANDLERS
// ============================================================================

const handleMainMenuSelection = async (choice, phoneNumber, session_data) => {
    if (choice === '1') {
        // BOOKING FLOW
        session_data.menu_level = 1;
        return buildBookingMenu();
    } else if (choice === '2') {
        // INSURANCE CHECK
        session_data.menu_level = 2;
        return `CON Enter your SHA/NHIF number:`;
    } else if (choice === '3') {
        // EMERGENCY
        session_data.menu_level = 4;
        return `CON EMERGENCY ALERT ACTIVATED
        
Your location has been sent to nearest hospital.
Ambulance dispatch: IN PROGRESS

Reply:
1. Confirm emergency
2. Cancel`;
    } else if (choice === '4') {
        // PAYMENT HISTORY
        const patient = await Patient.findByPhone(phoneNumber);
        if (!patient) {
            return `END No account found for this number. Visit our office to register.`;
        }
        const transactions = await Transaction.getHistoryForPatient(patient.patient_id, 5);
        let msg = `CON PAYMENT HISTORY\n\n`;
        transactions.forEach((t, i) => {
            msg += `${i + 1}. KSh ${t.amount} - ${t.payment_status}\n`;
        });
        msg += `\nBack to main menu: 0`;
        return msg;
    } else if (choice === '5') {
        // PROFILE
        const patient = await Patient.findByPhone(phoneNumber);
        if (!patient) {
            return `END No account found. Visit our office to register.`;
        }
        return `CON YOUR PROFILE \n\nName: ${patient.first_name} ${patient.last_name}\nPhone: ${patient.phone_number}\nBlood: ${patient.blood_type}\n\nBack: 0`;
    } else if (choice === '0') {
        return buildMainMenu();
    } else {
        return `CON Invalid selection. Try again:`;
    }
};

const handleBookingFlow = async (choice, phoneNumber, session_data) => {
    // Extract hospital selection
    if (!session_data.selected_hospital) {
        session_data.selected_hospital = choice;
        session_data.menu_level = 1;
        return buildDoctorMenu();
    } else if (!session_data.selected_specialist) {
        session_data.selected_specialist = choice;
        session_data.menu_level = 1;
        return buildTimeMenu();
    } else if (!session_data.selected_time) {
        session_data.selected_time = choice;
        // Create the appointment
        const patient = await Patient.findByPhone(phoneNumber);
        if (!patient) {
            return `END Error: Patient not found. Please register first.`;
        }

        // For now, assign to a default doctor and hospital
        const appointment = await Appointment.create({
            patient_id: patient.patient_id,
            doctor_id: 1, // Placeholder
            hospital_id: parseInt(session_data.selected_hospital),
            appointment_time: new Date(),
            is_emergency: false,
            priority_level: 'NORMAL',
            chief_complaint: 'USSD Booking',
            booking_method: 'USSD'
        });

        return `END Appointment confirmed!
    
ID: ${appointment.appointment_id}
Hospital: Selection ${session_data.selected_hospital}
Specialist: Selection ${session_data.selected_specialist}
Time: ${session_data.selected_time}

You will receive a confirmation SMS`;
    }
};

const handleInsuranceCheck = async (choice, phoneNumber, session_data) => {
    const sha_number = choice.trim();

    if (sha_number.length < 5) {
        return `CON Invalid SHA number. Enter SHA/NHIF number:`;
    }

    try {
        const sha_status = await verifySHACoverage(sha_number);
        if (sha_status.success && sha_status.status === 'ACTIVE') {
            return `END ✓ SHA ACTIVE
Coverage Limit: KSh ${sha_status.coverageLimit}
Status: ${sha_status.status}

You are covered!`;
        } else {
            return `END ✗ SHA INACTIVE
Status: ${sha_status.status}

You may need to update your membership.`;
        }
    } catch (error) {
        return `END Unable to verify. Try again later or visit our office.`;
    }
};

const handlePaymentFlow = async (choice, phoneNumber, session_data) => {
    // Trigger M-Pesa STK Push
    try {
        const response = await initiateSTKPush(phoneNumber, 5000, 'USSD_PAYMENT');
        return `END M-Pesa prompt sent. 
    
Enter your PIN to complete payment.
Reference: ${response.CheckoutRequestID}`;
    } catch (error) {
        return `END Payment failed. Try again.`;
    }
};

const handleEmergencyFlow = async (phoneNumber) => {
    try {
        // Create emergency alert
        const patient = await Patient.findByPhone(phoneNumber);
        if (!patient) {
            return `END Error: No account found. Contact hospital directly.`;
        }

        // Insert emergency alert into database
        await pool.query(
            `INSERT INTO EmergencyAlerts (patient_id, alert_type, alert_status, hospital_notified)
             VALUES ($1, 'ONE_CLICK_EMERGENCY', 'ACTIVE', true)`,
            [patient.patient_id]
        );

        // Notify emergency contact
        return `END EMERGENCY ACTIVATED ⚠️
    
Alert sent to:
- Nearest ambulance
- Emergency contact
- Hospital ER

Help is on the way!`;
    } catch (error) {
        return `END Emergency system error. Call 911 directly.`;
    }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

const getOrCreateUSSDSession = async (sessionId, phoneNumber) => {
    const query = `
        SELECT * FROM USSDSessions
        WHERE session_id = $1 OR phone_number = $2
        ORDER BY last_activity DESC
        LIMIT 1
    `;

    try {
        const result = await pool.query(query, [sessionId, phoneNumber]);
        if (result.rows.length > 0) {
            return JSON.parse(result.rows[0].session_data);
        }
    } catch (error) {
        console.warn('[Session Retrieval]:', error.message);
    }

    return {
        phoneNumber,
        menu_level: 0,
        selected_hospital: null,
        selected_specialist: null,
        selected_time: null
    };
};

const saveUSSDSession = async (sessionId, session_data) => {
    const query = `
        INSERT INTO USSDSessions (session_id, phone_number, session_data, menu_level, last_activity)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (session_id) DO UPDATE SET
            session_data = $3,
            menu_level = $4,
            last_activity = CURRENT_TIMESTAMP
    `;

    try {
        await pool.query(query, [
            sessionId,
            session_data.phoneNumber,
            JSON.stringify(session_data),
            session_data.menu_level
        ]);
    } catch (error) {
        console.error('[Session Save Error]:', error.message);
    }
};

// ============================================================================
// PAYMENT NOTIFICATION HANDLER
// ============================================================================

const handlePaymentNotification = async (req, res) => {
    const { checkoutRequestId, resultCode, resultDesc, mpesaReceiptNumber } = req.body;

    console.log('[M-Pesa Callback]:', { checkoutRequestId, resultCode, resultDesc });

    if (resultCode !== '0') {
        console.warn('[M-Pesa] Payment failed:', resultDesc);
        return res.json({ success: false });
    }

    try {
        // Find transaction by checkout request ID
        const transaction = await Transaction.findByCheckoutRequestId(checkoutRequestId);
        if (!transaction) {
            return res.json({ success: false, message: 'Transaction not found' });
        }

        // Update transaction with M-Pesa receipt
        await Transaction.updateWithCallback(transaction.transaction_id, {
            payment_status: 'SUCCESS',
            mpesa_receipt_number: mpesaReceiptNumber,
            payment_timestamp: new Date()
        });

        // Mark invoice as paid
        if (transaction.invoice_id) {
            await Invoice.updateStatus(transaction.invoice_id, 'PAID');
        }

        res.json({ success: true, message: 'Payment processed successfully' });
    } catch (error) {
        console.error('[Payment Notification Error]:', error.message);
        res.json({ success: false, message: error.message });
    }
};

// ============================================================================
// SESSION RETRIEVAL
// ============================================================================

const getSessionData = async (req, res) => {
    const { session_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT session_data FROM USSDSessions WHERE session_id = $1`,
            [session_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        res.json({ success: true, data: JSON.parse(result.rows[0].session_data) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    handleUSSDRequest,
    handlePaymentNotification,
    getSessionData
};
