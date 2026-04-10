// ============================================================================
// File: src/utils/validators.js
// Input validation utilities for all endpoints
// ============================================================================

// Validate phone number format (Kenyan)
const validatePhoneNumber = (phone) => {
    // Accept formats: 0712345678, 254712345678, +254712345678
    const phone_regex = /^(?:254|\+254|0)([1-9]\d{8})$/;
    return phone_regex.test(phone);
};

// Format phone to standard 254 format
const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.slice(1);
    } else if (!cleaned.startsWith('254')) {
        return null; // Invalid format
    }
    return cleaned;
};

// Validate email format
const validateEmail = (email) => {
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email_regex.test(email);
};

// Validate appointment time (must be in future)
const validateAppointmentTime = (appointment_time) => {
    const time = new Date(appointment_time);
    const now = new Date();
    return time > now && (time - now) > 30 * 60 * 1000; // At least 30 minutes in future
};

// Validate amount (M-Pesa, billing)
const validateAmount = (amount) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 999999;
};

// Validate insurance number format
const validateInsuranceNumber = (insurance_number, provider) => {
    if (provider === 'SHA') {
        // SHA numbers are typically 10 digits
        return /^\d{10}$/.test(insurance_number);
    } else if (provider === 'NHIF') {
        // NHIF numbers vary but usually numeric
        return /^\d{6,12}$/.test(insurance_number);
    }
    return true;
};

// Validate SHA/NHIF number specifically
const validateSHANumber = (sha_number) => {
    return /^\d{10}$/.test(sha_number);
};

// Validate blood type
const validateBloodType = (blood_type) => {
    const valid_types = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    return valid_types.includes(blood_type);
};

// Validate priority level
const validatePriorityLevel = (priority) => {
    const valid_priorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
    return valid_priorities.includes(priority);
};

// Validate user type
const validateUserType = (user_type) => {
    const valid_types = ['PATIENT', 'DOCTOR', 'HOSPITAL_STAFF', 'ADMIN'];
    return valid_types.includes(user_type);
};

// Validate appointment status
const validateAppointmentStatus = (status) => {
    const valid_statuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
    return valid_statuses.includes(status);
};

// Validate password strength
const validatePasswordStrength = (password) => {
    // At least 8 characters, 1 uppercase, 1 number
    const pwd_regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return pwd_regex.test(password);
};

module.exports = {
    validatePhoneNumber,
    formatPhoneNumber,
    validateEmail,
    validateAppointmentTime,
    validateAmount,
    validateInsuranceNumber,
    validateSHANumber,
    validateBloodType,
    validatePriorityLevel,
    validateUserType,
    validateAppointmentStatus,
    validatePasswordStrength
};
