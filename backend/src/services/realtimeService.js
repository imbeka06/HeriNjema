// ============================================================================
// File: src/services/realtimeService.js
// Real-time WebSocket Service
// Handles live emergency alerts, triage queue updates, and appointment status
// ============================================================================

// WebSocket connection manager (stores active connections)
const connections = new Map(); // client_id -> { socket, user_id, type, hospital_id }
const rooms = new Map(); // room_id -> Set of client_ids

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

const registerConnection = (socket, client_id, user_data) => {
    connections.set(client_id, {
        socket,
        user_id: user_data.user_id,
        type: user_data.type, // 'PATIENT' | 'HOSPITAL_STAFF' | 'ADMIN'
        hospital_id: user_data.hospital_id || null,
        connected_at: new Date()
    });

    console.log(`[WS] Client connected: ${client_id} (${user_data.type})`);
};

const unregisterConnection = (client_id) => {
    const conn = connections.get(client_id);
    if (conn) {
        // Remove from all rooms
        rooms.forEach((members, room_id) => {
            members.delete(client_id);
            if (members.size === 0) {
                rooms.delete(room_id);
            }
        });

        connections.delete(client_id);
        console.log(`[WS] Client disconnected: ${client_id}`);
    }
};

const getConnection = (client_id) => {
    return connections.get(client_id);
};

const getHospitalStaffConnections = (hospital_id) => {
    return Array.from(connections.values())
        .filter(conn => conn.hospital_id === hospital_id && conn.type === 'HOSPITAL_STAFF');
};

const getPatientConnections = (patient_id) => {
    // Patient connections are stored with user_id, but we need to match them
    return Array.from(connections.values())
        .filter(conn => conn.type === 'PATIENT' && conn.user_id === patient_id);
};

// ============================================================================
// ROOM MANAGEMENT (for grouping subscriptions)
// ============================================================================

const joinRoom = (client_id, room_id) => {
    if (!rooms.has(room_id)) {
        rooms.set(room_id, new Set());
    }
    rooms.get(room_id).add(client_id);
};

const leaveRoom = (client_id, room_id) => {
    if (rooms.has(room_id)) {
        rooms.get(room_id).delete(client_id);
    }
};

const getRoomMembers = (room_id) => {
    return Array.from(rooms.get(room_id) || []);
};

// ============================================================================
// MESSAGE BROADCASTING
// ============================================================================

const broadcastToRoom = (room_id, message) => {
    const members = getRoomMembers(room_id);
    members.forEach(client_id => {
        const conn = getConnection(client_id);
        if (conn && conn.socket.readyState === conn.socket.OPEN) {
            try {
                conn.socket.send(JSON.stringify(message));
            } catch (err) {
                console.error(`[WS] Error broadcasting to ${client_id}:`, err.message);
            }
        }
    });
};

const broadcastToHospital = (hospital_id, message) => {
    const staffConnections = getHospitalStaffConnections(hospital_id);
    staffConnections.forEach(conn => {
        try {
            if (conn.socket.readyState === conn.socket.OPEN) {
                conn.socket.send(JSON.stringify(message));
            }
        } catch (err) {
            console.error(`[WS] Error broadcasting:`, err.message);
        }
    });
};

const broadcastToPatient = (patient_id, message) => {
    const patientConns = getPatientConnections(patient_id);
    patientConns.forEach(conn => {
        try {
            if (conn.socket.readyState === conn.socket.OPEN) {
                conn.socket.send(JSON.stringify(message));
            }
        } catch (err) {
            console.error(`[WS] Error broadcasting:`, err.message);
        }
    });
};

// ============================================================================
// EVENT: EMERGENCY ALERT
// ============================================================================

const broadcastEmergencyAlert = (alert_data) => {
    const message = {
        type: 'EMERGENCY_ALERT',
        timestamp: new Date(),
        data: {
            alert_id: alert_data.alert_id,
            patient_id: alert_data.patient_id,
            patient_name: alert_data.patient_name,
            phone_number: alert_data.phone_number,
            gps_location: alert_data.gps_location,
            vital_signs: alert_data.vital_signs,
            symptoms: alert_data.symptoms,
            priority_level: alert_data.priority_level || 'CRITICAL',
            hospital_id: alert_data.hospital_id,
            created_at: alert_data.created_at
        }
    };

    // Broadcast to hospital staff
    if (alert_data.hospital_id) {
        const room_id = `hospital-${alert_data.hospital_id}-emergency`;
        broadcastToRoom(room_id, message);
    }

    // Broadcast to admins
    const room_id = 'admin-emergency-console';
    broadcastToRoom(room_id, message);

    console.log(`[WS] Emergency alert broadcast: ${alert_data.alert_id}`);
};

// ============================================================================
// EVENT: TRIAGE QUEUE UPDATE
// ============================================================================

const broadcastTriageQueueUpdate = (hospital_id, queue_data) => {
    const message = {
        type: 'TRIAGE_QUEUE_UPDATE',
        timestamp: new Date(),
        data: {
            hospital_id,
            queue_length: queue_data.length,
            queue: queue_data,
            critical_count: queue_data.filter(a => a.priority_level === 'CRITICAL').length,
            urgent_count: queue_data.filter(a => a.priority_level === 'URGENT').length
        }
    };

    const room_id = `hospital-${hospital_id}-triage`;
    broadcastToRoom(room_id, message);

    console.log(`[WS] Triage queue update: ${hospital_id} (${queue_data.length} patients)`);
};

// ============================================================================
// EVENT: APPOINTMENT STATUS UPDATE
// ============================================================================

const broadcastAppointmentStatusUpdate = (appointment_id, status, patient_id, hospital_id) => {
    const message = {
        type: 'APPOINTMENT_STATUS_UPDATE',
        timestamp: new Date(),
        data: {
            appointment_id,
            status,
            patient_id,
            hospital_id
        }
    };

    // Notify patient
    broadcastToPatient(patient_id, message);

    // Notify hospital staff
    if (hospital_id) {
        const room_id = `hospital-${hospital_id}-appointments`;
        broadcastToRoom(room_id, message);
    }

    console.log(`[WS] Appointment status: ${appointment_id} → ${status}`);
};

// ============================================================================
// EVENT: BILLING NOTIFICATION
// ============================================================================

const broadcastBillingNotification = (invoice_data) => {
    const message = {
        type: 'BILLING_NOTIFICATION',
        timestamp: new Date(),
        data: {
            invoice_id: invoice_data.invoice_id,
            amount: invoice_data.amount,
            status: invoice_data.status,
            description: invoice_data.description,
            payment_link: invoice_data.payment_link // M-Pesa STK Push link
        }
    };

    broadcastToPatient(invoice_data.patient_id, message);

    console.log(`[WS] Billing notification: ${invoice_data.invoice_id}`);
};

// ============================================================================
// EVENT: DOCTOR ASSIGNMENT
// ============================================================================

const broadcastDoctorAssignment = (appointment_id, doctor_id, doctor_name, hospital_id) => {
    const message = {
        type: 'DOCTOR_ASSIGNED',
        timestamp: new Date(),
        data: {
            appointment_id,
            doctor_id,
            doctor_name,
            hospital_id
        }
    };

    // Notify hospital staff
    if (hospital_id) {
        const room_id = `hospital-${hospital_id}-assignments`;
        broadcastToRoom(room_id, message);
    }

    console.log(`[WS] Doctor assigned: ${doctor_name} → ${appointment_id}`);
};

// ============================================================================
// EVENT: ROOM/WARD ASSIGNMENT
// ============================================================================

const broadcastWardAssignment = (appointment_id, patient_id, ward_name, room_number, hospital_id) => {
    const message = {
        type: 'WARD_ASSIGNED',
        timestamp: new Date(),
        data: {
            appointment_id,
            patient_id,
            ward_name,
            room_number,
            hospital_id,
            estimated_admission_time: new Date(Date.now() + 5 * 60000) // 5 min from now
        }
    };

    // Notify patient
    broadcastToPatient(patient_id, message);

    // Notify hospital staff
    if (hospital_id) {
        const room_id = `hospital-${hospital_id}-admissions`;
        broadcastToRoom(room_id, message);
    }

    console.log(`[WS] Ward assigned: ${ward_name} Room ${room_number} → Patient ${patient_id}`);
};

// ============================================================================
// EVENT: VITAL SIGNS UPDATE (Continuous Monitoring)
// ============================================================================

const broadcastVitalSignsUpdate = (patient_id, appointment_id, vitals, hospital_id) => {
    const message = {
        type: 'VITAL_SIGNS_UPDATE',
        timestamp: new Date(),
        data: {
            appointment_id,
            patient_id,
            vitals: {
                blood_pressure: vitals.blood_pressure,
                heart_rate: vitals.heart_rate,
                temperature: vitals.temperature,
                oxygen_saturation: vitals.oxygen_saturation,
                glucose_level: vitals.glucose_level
            },
            alert_flag: vitals.alert_flag // true if abnormal
        }
    };

    // Notify hospital monitoring staff
    if (hospital_id) {
        const room_id = `hospital-${hospital_id}-monitoring`;
        broadcastToRoom(room_id, message);
    }

    console.log(`[WS] Vitals update: Patient ${patient_id}`);
};

// ============================================================================
// EVENT: INSURANCE VERIFICATION STATUS
// ============================================================================

const broadcastInsuranceVerification = (patient_id, insurance_status, coverage_amount, hospital_id) => {
    const message = {
        type: 'INSURANCE_VERIFIED',
        timestamp: new Date(),
        data: {
            patient_id,
            insurance_status,
            coverage_amount,
            hospital_id
        }
    };

    // Notify patient
    broadcastToPatient(patient_id, message);

    // Notify hospital billing
    if (hospital_id) {
        const room_id = `hospital-${hospital_id}-billing`;
        broadcastToRoom(room_id, message);
    }

    console.log(`[WS] Insurance verified: ${insurance_status}`);
};

// ============================================================================
// EVENT: DIRECTADMITTANCE CONFIRMATION
// ============================================================================

const broadcastDirectAdmittance = (appointment_id, patient_id, hospital_id, admission_code) => {
    const message = {
        type: 'DIRECT_ADMITTANCE',
        timestamp: new Date(),
        data: {
            appointment_id,
            patient_id,
            hospital_id,
            admission_code,
            status: 'CONFIRMED',
            instructions: [
                'Head directly to the assigned ward',
                'Present admission code at reception',
                'Check-in with nursing staff'
            ]
        }
    };

    // Notify patient
    broadcastToPatient(patient_id, message);

    // Notify hospital admissions staff
    if (hospital_id) {
        const room_id = `hospital-${hospital_id}-admissions`;
        broadcastToRoom(room_id, message);
    }

    console.log(`[WS] Direct admittance confirmed: ${admission_code}`);
};

// ============================================================================
// CONNECTION STATISTICS
// ============================================================================

const getConnectionStats = () => {
    const total_connections = connections.size;
    const by_type = {
        PATIENT: 0,
        HOSPITAL_STAFF: 0,
        ADMIN: 0
    };

    connections.forEach(conn => {
        by_type[conn.type]++;
    });

    return {
        total_connections,
        by_type,
        total_rooms: rooms.size,
        timestamp: new Date()
    };
};

module.exports = {
    // Connection management
    registerConnection,
    unregisterConnection,
    getConnection,
    getHospitalStaffConnections,
    getPatientConnections,

    // Room management
    joinRoom,
    leaveRoom,
    getRoomMembers,

    // Broadcasting
    broadcastToRoom,
    broadcastToHospital,
    broadcastToPatient,

    // Events
    broadcastEmergencyAlert,
    broadcastTriageQueueUpdate,
    broadcastAppointmentStatusUpdate,
    broadcastBillingNotification,
    broadcastDoctorAssignment,
    broadcastWardAssignment,
    broadcastVitalSignsUpdate,
    broadcastInsuranceVerification,
    broadcastDirectAdmittance,

    // Statistics
    getConnectionStats
};
