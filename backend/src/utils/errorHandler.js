// ============================================================================
// File: src/utils/errorHandler.js
// Centralized error handling utilities
// ============================================================================

class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}

class ValidationError extends ApiError {
    constructor(message, details = null) {
        super(400, message, details);
        this.name = 'ValidationError';
    }
}

class AuthenticationError extends ApiError {
    constructor(message) {
        super(401, message);
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends ApiError {
    constructor(message) {
        super(403, message);
        this.name = 'AuthorizationError';
    }
}

class NotFoundError extends ApiError {
    constructor(message) {
        super(404, message);
        this.name = 'NotFoundError';
    }
}

class ConflictError extends ApiError {
    constructor(message, details = null) {
        super(409, message, details);
        this.name = 'ConflictError';
    }
}

class ServerError extends ApiError {
    constructor(message) {
        super(500, message);
        this.name = 'ServerError';
    }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.name || 'Unknown Error'}: ${err.message}`);

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                type: err.name,
                message: err.message,
                ...(process.env.NODE_ENV === 'development' && { details: err.details })
            }
        });
    }

    // Database errors
    if (err.code === '23505') { // Unique constraint violation
        return res.status(409).json({
            success: false,
            error: {
                type: 'ConflictError',
                message: 'A record with this information already exists'
            }
        });
    }

    // Default error response
    res.status(500).json({
        success: false,
        error: {
            type: 'InternalServerError',
            message: process.env.NODE_ENV === 'production' 
                ? 'An unexpected error occurred' 
                : err.message
        }
    });
};

// Async route wrapper to catch errors automatically
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    ApiError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    ServerError,
    errorHandler,
    asyncHandler
};
