// ============================================================================
// File: src/services/websocketHandler.js
// WebSocket Connection Handler
// Manages client connections, message routing, and subscription management
// ============================================================================

const RealtimeService = require('./realtimeService');
const jwt = require('jsonwebtoken');

// ============================================================================
// WEBSOCKET MESSAGE HANDLER
// ============================================================================

const handleWebSocketConnection = (ws, req) => {
    const client_id = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let authenticated = false;
    let user_data = null;

    // ========================================================================
    // AUTHENTICATION & CONNECTION
    // ========================================================================

    ws.on('open', () => {
        console.log(`[WS] Connection opened: ${client_id}`);
    });

    ws.on('message', async (raw_message) => {
        try {
            const message = JSON.parse(raw_message);

            if (!authenticated) {
                // First message MUST be authentication
                if (message.type === 'AUTH') {
                    await handleAuthMessage(ws, client_id, message);
                } else {
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Must authenticate first. Send AUTH message with JWT token.'
                    }));
                    ws.close();
                }
            } else {
                // Route authenticated messages
                handleAuthenticatedMessage(ws, client_id, user_data, message);
            }

        } catch (error) {
            console.error(`[WS] Message parsing error (${client_id}):`, error.message);
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        if (authenticated) {
            RealtimeService.unregisterConnection(client_id);
        }
        console.log(`[WS] Connection closed: ${client_id}`);
    });

    ws.on('error', (error) => {
        console.error(`[WS] Socket error (${client_id}):`, error.message);
    });

    // ========================================================================
    // AUTHENTICATION HANDLER
    // ========================================================================

    const handleAuthMessage = async (ws, client_id, message) => {
        const token = message.token;

        if (!token) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'Token required in AUTH message'
            }));
            ws.close();
            return;
        }

        try {
            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            user_data = {
                user_id: decoded.user_id,
                type: decoded.user_type,
                hospital_id: decoded.hospital_id || null
            };

            // Register connection
            RealtimeService.registerConnection(ws, client_id, user_data);
            authenticated = true;

            // Send authentication success message
            ws.send(JSON.stringify({
                type: 'AUTH_SUCCESS',
                client_id,
                user_type: user_data.type,
                message: 'Authenticated and connected'
            }));

            console.log(`[WS] Authenticated: ${client_id} (${user_data.type})`);

        } catch (error) {
            console.error('[WS] Auth error:', error.message);
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'Invalid or expired token'
            }));
            ws.close();
        }
    };

    // ========================================================================
    // AUTHENTICATED MESSAGE HANDLER
    // ========================================================================

    const handleAuthenticatedMessage = (ws, client_id, user_data, message) => {
        switch (message.type) {
            case 'SUBSCRIBE':
                handleSubscribe(ws, client_id, user_data, message);
                break;

            case 'UNSUBSCRIBE':
                handleUnsubscribe(ws, client_id, message);
                break;

            case 'GET_STATS':
                handleGetStats(ws);
                break;

            case 'PING':
                ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date() }));
                break;

            default:
                console.error(`[WS] Unknown message type: ${message.type}`);
        }
    };

    // ========================================================================
    // SUBSCRIPTION HANDLER
    // ========================================================================

    const handleSubscribe = (ws, client_id, user_data, message) => {
        const { channel } = message;

        // Validate permissions
        if (!validateSubscriptionPermission(user_data, channel)) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: `Permission denied to subscribe to ${channel}`
            }));
            return;
        }

        // Generate room ID based on channel type
        const room_id = generateRoomId(user_data, channel);

        RealtimeService.joinRoom(client_id, room_id);

        ws.send(JSON.stringify({
            type: 'SUBSCRIPTION_SUCCESS',
            channel,
            room_id,
            message: `Subscribed to ${channel}`
        }));

        console.log(`[WS] ${client_id} subscribed to ${room_id}`);
    };

    const handleUnsubscribe = (ws, client_id, message) => {
        const { channel } = message;
        const room_id = `${channel}-${client_id}`;

        RealtimeService.leaveRoom(client_id, room_id);

        ws.send(JSON.stringify({
            type: 'UNSUBSCRIPTION_SUCCESS',
            channel,
            message: `Unsubscribed from ${channel}`
        }));

        console.log(`[WS] ${client_id} unsubscribed from ${room_id}`);
    };

    const handleGetStats = (ws) => {
        const stats = RealtimeService.getConnectionStats();
        ws.send(JSON.stringify({
            type: 'STATS',
            data: stats
        }));
    };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const validateSubscriptionPermission = (user_data, channel) => {
    const permissions = {
        'healthcare-provider': user_data.type === 'HOSPITAL_STAFF' || user_data.type === 'ADMIN',
        'patient-notifications': user_data.type === 'PATIENT' || user_data.type === 'ADMIN',
        'emergency-alerts': user_data.type === 'HOSPITAL_STAFF' || user_data.type === 'ADMIN',
        'appointment-updates': user_data.type === 'PATIENT' || user_data.type === 'HOSPITAL_STAFF',
        'billing-updates': user_data.type === 'PATIENT' || user_data.type === 'HOSPITAL_STAFF',
        'booking-notifications': user_data.type === 'PATIENT' || user_data.type === 'ADMIN',
        'admin-console': user_data.type === 'ADMIN'
    };

    return permissions[channel] || false;
};

const generateRoomId = (user_data, channel) => {
    if (channel === 'emergency-alerts' && user_data.hospital_id) {
        return `hospital-${user_data.hospital_id}-emergency`;
    }

    if (channel === 'healthcare-provider' && user_data.hospital_id) {
        return `hospital-${user_data.hospital_id}-staff`;
    }

    if (channel === 'admin-console') {
        return 'admin-emergency-console';
    }

    // Default room based on channel
    return channel;
};

module.exports = {
    handleWebSocketConnection,
    validateSubscriptionPermission,
    generateRoomId
};
