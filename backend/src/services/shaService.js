// File: src/services/shaService.js
const axios = require('axios');

const verifySHACoverage = async (shaNumber) => {
    console.log(`[SHA Service] Verifying Social Health Authority Number: ${shaNumber}`);

    try {
        // ====================================================================
        // REAL API CALL (Commented out until you get official SHA API credentials)
        // ====================================================================
        /*
        const response = await axios.post('https://api.sha.go.ke/v1/verify', {
            member_number: shaNumber
        }, {
            headers: { 'Authorization': `Bearer ${process.env.SHA_API_KEY}` }
        });
        return response.data;
        */

        // ====================================================================
        // SIMULATED RESPONSE (For testing our backend today)
        // ====================================================================
        // We will pretend that any number starting with 'SHA' is valid and active
        if (shaNumber && shaNumber.toUpperCase().startsWith('SHA')) {
            return {
                success: true,
                status: 'ACTIVE',
                patientName: 'Imbeka Musa', // Mocking a matched name
                coverageLimit: 5000,        // Simulated KSh limit
                message: 'SHA Member verified and active.'
            };
        } else {
            return {
                success: false,
                status: 'INACTIVE',
                coverageLimit: 0,
                message: 'Invalid or inactive SHA Number.'
            };
        }
    } catch (error) {
        console.error('[SHA Service Error]', error.message);
        throw new Error('Failed to verify SHA status');
    }
};

module.exports = { verifySHACoverage };