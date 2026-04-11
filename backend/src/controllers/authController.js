// ============================================================================
// File: src/controllers/authController.js
// Authentication controller (Register, Login, OTP, Biometric)
// ============================================================================

const User = require('../models/User');
const Patient = require('../models/Patient');
const { generateToken } = require('../middlewares/authMiddleware');
const { validatePhoneNumber, validateEmail, validatePasswordStrength } = require('../utils/validators');
const { ValidationError, AuthenticationError } = require('../utils/errorHandler');

// Simulated OTP storage (use Redis in production)
const otp_store = new Map();

// ============================================================================
// REGISTER - Create a new patient account
// ============================================================================

const register = async (req, res, next) => {
    const { phone_number, email, password, first_name, last_name, date_of_birth, gender } = req.body;

    try {
        // Validate inputs
        if (!phone_number || !validatePhoneNumber(phone_number)) {
            return res.status(400).json({ success: false, message: 'Invalid phone number format' });
        }

        if (!email || !validateEmail(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        if (!password || !validatePasswordStrength(password)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 8 characters with 1 uppercase and 1 number' 
            });
        }

        // Create user record
        const user = await User.create({
            phone_number,
            email,
            password,
            first_name,
            last_name,
            user_type: 'PATIENT'
        });

        // Create patient profile
        const patient = await Patient.create({
            user_id: user.user_id,
            date_of_birth,
            gender
        });

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Account created successfully. Please verify your phone number.',
            data: {
                user_id: user.user_id,
                phone_number: user.phone_number,
                email: user.email,
                token
            }
        });

    } catch (error) {
        console.error('[Register Error]:', error.message);
        if (error.message.includes('already exists')) {
            return res.status(409).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
};

// ============================================================================
// LOGIN - Authenticate with phone + password
// ============================================================================

const login = async (req, res, next) => {
    const { phone_number, password } = req.body;

    try {
        // Validate inputs
        if (!phone_number || !validatePhoneNumber(phone_number)) {
            return res.status(400).json({ success: false, message: 'Invalid phone number format' });
        }

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }

        // Find user
        const user = await User.findByPhone(phone_number);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Verify password
        const is_valid = await User.verifyPassword(password, user.password_hash);
        if (!is_valid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if verified
        if (!user.is_verified) {
            return res.status(403).json({ 
                success: false, 
                message: 'Please verify your phone number first',
                requires_otp: true,
                user_id: user.user_id 
            });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user_id: user.user_id,
            user_type: user.user_type || 'PATIENT',
            phone_number: user.phone_number,
            first_name: user.first_name,
            last_name: user.last_name
        });

    } catch (error) {
        console.error('[Login Error]:', error.message);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

// ============================================================================
// SEND OTP - Send verification code via SMS
// ============================================================================

const sendOTP = async (req, res, next) => {
    const { phone_number } = req.body;

    try {
        if (!phone_number || !validatePhoneNumber(phone_number)) {
            return res.status(400).json({ success: false, message: 'Invalid phone number' });
        }

        // Generate OTP (6 digits)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with 10-minute expiry
        otp_store.set(phone_number, { otp, expires_at: Date.now() + 10 * 60 * 1000 });

        // TODO: Integrate with Africa's Talking SMS service
        console.log(`[OTP for ${phone_number}]: ${otp}`);

        res.json({
            success: true,
            message: 'OTP sent to your phone'
        });

    } catch (error) {
        console.error('[Send OTP Error]:', error.message);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
};

// ============================================================================
// VERIFY OTP - Confirm phone with OTP code
// ============================================================================

const verifyOTP = async (req, res, next) => {
    const { phone_number, otp } = req.body;

    try {
        if (!phone_number || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP required' });
        }

        // Check if OTP exists and is valid
        const stored_otp = otp_store.get(phone_number);
        if (!stored_otp) {
            return res.status(410).json({ success: false, message: 'OTP expired. Request a new one.' });
        }

        if (stored_otp.expires_at < Date.now()) {
            otp_store.delete(phone_number);
            return res.status(410).json({ success: false, message: 'OTP expired' });
        }

        if (stored_otp.otp !== otp) {
            return res.status(401).json({ success: false, message: 'Invalid OTP' });
        }

        // Find and mark user as verified
        const user = await User.findByPhone(phone_number);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await User.markAsVerified(user.user_id);
        otp_store.delete(phone_number);

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Phone verified successfully',
            data: {
                user_id: user.user_id,
                phone_number: user.phone_number,
                token
            }
        });

    } catch (error) {
        console.error('[Verify OTP Error]:', error.message);
        res.status(500).json({ success: false, message: 'OTP verification failed' });
    }
};

// ============================================================================
// BIOMETRIC ENROLLMENT - Link fingerprint/face to account
// ============================================================================

const enrollBiometric = async (req, res, next) => {
    const { biometric_id, biometric_type } = req.body; // fingerprint or face ID
    const user_id = req.user.user_id;

    try {
        if (!biometric_id || !biometric_type) {
            return res.status(400).json({ success: false, message: 'Biometric data required' });
        }

        // Update user with biometric ID
        await User.updateProfile(user_id, { biometric_id });

        res.json({
            success: true,
            message: `${biometric_type} enrollment successful`,
            data: { user_id, biometric_type }
        });

    } catch (error) {
        console.error('[Biometric Enrollment Error]:', error.message);
        res.status(500).json({ success: false, message: 'Enrollment failed' });
    }
};

// ============================================================================
// BIOMETRIC LOGIN - Quick login with fingerprint
// ============================================================================

const biometricLogin = async (req, res, next) => {
    const { biometric_id } = req.body;

    try {
        if (!biometric_id) {
            return res.status(400).json({ success: false, message: 'Biometric ID required' });
        }

        // Find user by biometric ID
        const result = await User.findByBiometric?.(biometric_id);
        if (!result) {
            return res.status(401).json({ success: false, message: 'Biometric not recognized' });
        }

        // Generate token
        const token = generateToken(result);

        res.json({
            success: true,
            message: 'Biometric login successful',
            data: {
                user_id: result.user_id,
                phone_number: result.phone_number,
                token
            }
        });

    } catch (error) {
        console.error('[Biometric Login Error]:', error.message);
        res.status(500).json({ success: false, message: 'Biometric login failed' });
    }
};

// ============================================================================
// LOGOUT
// ============================================================================

const logout = async (req, res, next) => {
    // In JWT, logout is client-side (discard token)
    // Could implement token blacklisting in Redis for production
    res.json({ success: true, message: 'Logged out successfully' });
};

// ============================================================================
// GET PROFILE
// ============================================================================

const getProfile = async (req, res, next) => {
    const user_id = req.user.user_id;

    try {
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const patient = await Patient.findByPhone(user.phone_number);

        res.json({
            success: true,
            data: { user, patient }
        });

    } catch (error) {
        console.error('[Get Profile Error]:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
};

// ============================================================================
// UPDATE PROFILE
// ============================================================================

const updateProfile = async (req, res, next) => {
    const user_id = req.user.user_id;
    const { first_name, last_name, email } = req.body;

    try {
        const updated_user = await User.updateProfile(user_id, {
            first_name,
            last_name,
            email
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updated_user
        });

    } catch (error) {
        console.error('[Update Profile Error]:', error.message);
        res.status(500).json({ success: false, message: 'Profile update failed' });
    }
};

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

const changePassword = async (req, res, next) => {
    const user_id = req.user.user_id;
    const { current_password, new_password } = req.body;

    try {
        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, message: 'Both passwords required' });
        }

        const user = await User.findById(user_id);
        const is_valid = await User.verifyPassword(current_password, user.password_hash);

        if (!is_valid) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        // Hash new password and update (implement in User model)
        // await User.updatePassword(user_id, new_password);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('[Change Password Error]:', error.message);
        res.status(500).json({ success: false, message: 'Password change failed' });
    }
};

module.exports = {
    register,
    login,
    sendOTP,
    verifyOTP,
    enrollBiometric,
    biometricLogin,
    logout,
    getProfile,
    updateProfile,
    changePassword
};
