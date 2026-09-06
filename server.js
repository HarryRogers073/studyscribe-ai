require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory store for pending generations (in production, use a database)
const pendingJobs = new Map();

// ===== CREATE CHECKOUT SESSION =====
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { title, people, date, location, story } = req.body;

        if (!story) {
            return res.status(400).json({ error: 'Please tell us your memory before checking out.' });
        }

        // Create a unique ID for this job
        const jobId = Math.random().toString(36).substring(7);
        pendingJobs.set(jobId, { title, people, date, location, story });

        // Build origin URL
        const origin = req.headers.origin
            || req.headers.referer?.slice(0, -1)
            || `https://${req.headers['x-forwarded-host'] || req.get('host')}`;

        const session = await stripe.checkout.sessions.create({
            line_items: [{
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: 'MemoirMagic AI — Story Chapter',
                        description: `Your memory "${(title || 'Untitled').substring(0, 60)}" transformed into a beautifully written story.`,
                    },
                    unit_amount: 299, // £2.99
                },
                quantity: 1,
            }],
            mode: 'payment',
            managed_payments: { enabled: false },
            success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}&job_id=${jobId}`,
            cancel_url: `${origin}/`,
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: `Payment Error: ${error.message}` });
    }
});

// ===== GENERATE STORY =====
app.post('/generate-story', async (req, res) => {
    try {
        const { jobId } = req.body;
        const memoryData = pendingJobs.get(jobId);

        if (!memoryData) {
            return res.status(400).json({ error: 'Session expired or already processed. Please try again.' });
        }

        const { title, people, date, location, story } = memoryData;

        // Build the prompt with structured context
        const contextParts = [];
        if (title) contextParts.push(`Title/Topic: "${title}"`);
        if (people) contextParts.push(`People involved: ${people}`);
        if (date) contextParts.push(`Time period: ${date}`);
        if (location) contextParts.push(`Location: ${location}`);

        const prompt = `You are MemoirMagic, a world-class ghostwriter and memoirist. Your job is to take someone's scattered, informal memory notes and transform them into a beautifully written story chapter — warm, vivid, and deeply personal.

RULES:
- Write in third person OR first person, whichever feels more natural for this memory. Default to first person.
- Use rich, sensory language — sights, sounds, smells, textures, emotions.
- Keep the tone warm, nostalgic, and genuine. Never melodramatic or cheesy.
- Write 400-800 words. This should feel like a chapter from a published memoir.
- Use proper paragraphs. No bullet points or lists.
- Don't add fictional events. Only expand on what the person actually described.
- You may infer reasonable emotional context and sensory details.
- Do NOT include a title or heading — the system adds those separately.
- Start the story directly. No preamble like "Here is your story" or similar.
- Write in British English.

MEMORY DETAILS:
${contextParts.join('\n')}

THE PERSON'S OWN WORDS:
${story}

Now write this memory as a beautiful, publishable memoir chapter:`;

        // Model fallback cascade
        const candidateModels = [
            process.env.GEMINI_MODEL,
            'gemini-1.5-flash',
            'gemini-2.0-flash',
            'gemini-2.5-flash-lite',
            'gemini-1.5-pro'
        ].filter(Boolean);

        let text = null;
        let lastError = null;

        for (const mName of candidateModels) {
            try {
                console.log(`Attempting generation with model: ${mName}`);
                const model = genAI.getGenerativeModel({ model: mName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                text = response.text();
                if (text) {
                    console.log(`Successfully generated with model: ${mName}`);
                    break;
                }
            } catch (err) {
                console.warn(`Model ${mName} failed:`, err.message);
                lastError = err;
            }
        }

        if (!text) {
            throw lastError || new Error('All AI models failed. Please try again later.');
        }

        // Clear the job from memory
        pendingJobs.delete(jobId);

        // Return structured response for the frontend
        res.json({
            story: text,
            title: title || 'A Memory',
            date: date || '',
            location: location || ''
        });
    } catch (error) {
        console.error('Gemini error:', error);
        res.status(500).json({ error: `AI Error: ${error.message}` });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MemoirMagic AI Server running on http://localhost:${PORT}`);
});
