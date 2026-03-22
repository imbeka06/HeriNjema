// File: src/controllers/whatsappController.js

// 1. VERIFY WEBHOOK (Required by Meta/WhatsApp to connect your app)
const verifyWebhook = (req, res) => {
    const verify_token = process.env.WHATSAPP_VERIFY_TOKEN; // We will add this to .env

    // Parse params from the webhook verification request
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === verify_token) {
            console.log("✅ WhatsApp Webhook Verified!");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
};

// 2. RECEIVE MESSAGES (The actual HeriBot logic)
const receiveMessage = async (req, res) => {
    try {
        if (req.body.object) {
            if (req.body.entry && req.body.entry[0].changes && req.body.entry[0].changes[0].value.messages && req.body.entry[0].changes[0].value.messages[0]) {
                
                // Extract the phone number and the text message
                const phoneNumber = req.body.entry[0].changes[0].value.messages[0].from;
                const incomingMsg = req.body.entry[0].changes[0].value.messages[0].text.body;

                console.log(`[HeriBot] Message from ${phoneNumber}: ${incomingMsg}`);

                // ==========================================================
                // AI LOGIC GOES HERE
            
                // connect this to a custom model or Dialogflow here
                // ==========================================================
                
                let replyText = "Welcome to HeriNjema! I am HeriBot. 🏥\n\nHow can I assist you today?\n1. Book Appointment\n2. Check Bill\n3. Emergency";

                if (incomingMsg.toLowerCase().includes("emergency") || incomingMsg.includes("pain")) {
                    replyText = "🚨 *EMERGENCY ALERT*\nPlease proceed to the nearest casualty ward immediately. We have alerted the triage desk.";
                } else if (incomingMsg.includes("1")) {
                    replyText = "To book an appointment, please download our app or dial *384*123# on your phone.";
                }

                // In a production environment, I will use axios here to send 'replyText' 
                // back to the user via the Meta WhatsApp API.
                console.log(`[HeriBot] Replying: ${replyText}`);
            }
            res.sendStatus(200); // Always tell WhatsApp you received the message
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("WhatsApp Webhook Error:", error);
        res.sendStatus(500);
    }
};

module.exports = { verifyWebhook, receiveMessage };