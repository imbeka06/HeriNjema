// ============================================================================
// File: src/middlewares/authMiddleware.js
// JWT authentication and authorization
// ============================================================================

const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('../utils/errorHandler');

// Verify JWT token and attach user data
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: "Access Denied. Biometric verification required." 
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify the token using our secret key
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the patient's ID to the request so the next function knows exactly who they are
        req.user = decodedPayload; 
        next(); // Let them through to the booking/billing route
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: "Session expired or invalid. Please scan fingerprint again." 
        });
    }
};

// Alias for backward compatibility
const requireAuth = verifyToken;

// Verify token AND check user type
const authorize = (...allowed_types) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        if (!allowed_types.includes(req.user.user_type)) {
            return res.status(403).json({ 
                success: false, 
                message: `This action requires one of: ${allowed_types.join(', ')}` 
            });
        }

        next();
    };
};

// Generate JWT token
const generateToken = (user_data) => {
    const payload = {
        user_id: user_data.user_id,
        phone_number: user_data.phone_number,
        email: user_data.email,
        user_type: user_data.user_type
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || '7d'
    });
};

module.exports = { 
    verifyToken, 
    requireAuth,
    authorize, 
    generateToken 
};