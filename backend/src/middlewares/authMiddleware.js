// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
    // Look for the token in the headers sent by the smartphone app
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: "Access Denied. Biometric verification required." });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify the token using our secret key
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the patient's ID to the request so the next function knows exactly who they are
        req.user = decodedPayload; 
        next(); // Let them through to the booking/billing route
    } catch (error) {
        res.status(401).json({ success: false, message: "Session expired or invalid. Please scan fingerprint again." });
    }
};

module.exports = requireAuth;