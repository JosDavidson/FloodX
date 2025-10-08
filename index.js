/**
 * index.js — Firebase Cloud Functions for FLEWS Backend Integration
 * Includes: Telegram Alerts, Twilio SMS Alerts, and Gemini Proxy
 */

import fetch from "node-fetch";
import functions from "firebase-functions";
import twilio from "twilio";

// -----------------------------
// 🔹 TELEGRAM ALERT FUNCTION
// -----------------------------
export const sendTelegramAlert = functions.https.onRequest(async (req, res) => {
  try {
    // Load environment variables from .env file if not already loaded
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      require("dotenv").config();
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
      throw new Error("Missing Telegram Bot credentials in environment.");
    }

    const { message } = req.body;

    if (!message) return res.status(400).send({ error: "Message required" });

    const telegramURL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(telegramURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) throw new Error(`Telegram API error ${response.status}`);

    res.status(200).send({ success: true, message: "Telegram alert sent successfully." });
  } catch (error) {
    console.error("Telegram Alert Error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// -----------------------------
// 🔹 TWILIO SMS ALERT FUNCTION
// -----------------------------
export const sendSMSAlert = functions.https.onRequest(async (req, res) => {
  try {
    const { message, number } = req.body;
    if (!message || !number)
      return res.status(400).send({ error: "Message and number required." });

    const TWILIO_SID = process.env.TWILIO_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE = process.env.TWILIO_PHONE;

    if (!TWILIO_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE) {
      throw new Error("Twilio credentials missing in environment.");
    }

    const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: message,
      from: TWILIO_PHONE,
      to: number,
    });

    res.status(200).send({ success: true, message: "SMS alert sent successfully." });
  } catch (error) {
    console.error("SMS Alert Error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// -----------------------------
// 🔹 GEMINI API PROXY FUNCTION
// -----------------------------
export const proxyGemini = functions.https.onRequest(async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) throw new Error("Gemini API key not found.");

    const model = "gemini-2.0-flash"; // or your preferred model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const result = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await result.json();
    res.status(result.status).send(data);
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});
