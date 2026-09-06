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

app.post('/create-checkout-session', async (req, res) => {
    try {
        const { notes } = req.body;
        if (!notes) return res.status(400).json({ error: 'Notes are required' });

        // Create a unique ID for this job
        const jobId = Math.random().toString(36).substring(7);
        pendingJobs.set(jobId, notes);

        // Create Stripe checkout session
        const origin = req.headers.origin || req.headers.referer?.slice(0, -1) || `https://${req.headers['x-forwarded-host'] || req.get('host')}`;
        
        const session = await stripe.checkout.sessions.create({
            line_items: [{
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: 'StudyScribe AI - Premium Study Guide',
                        description: 'Instant AI conversion of your notes into a perfect study guide.',
                    },
                    unit_amount: 199, // £1.99
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
        res.status(500).json({ error: `Stripe Error: ${error.message}` });
    }
});

app.post('/generate-guide', async (req, res) => {
    try {
        const { jobId } = req.body;
        const notes = pendingJobs.get(jobId);
        
        if (!notes) {
            return res.status(400).json({ error: 'Job not found or already processed' });
        }

        const prompt = `You are StudyScribe AI, an expert tutor. Take the following messy lecture notes and transform them into a beautifully structured, premium study guide. Include:
1. Executive Summary
2. Key Concepts (Bullet points)
3. 5 Flashcards (Q&A format)
4. Practice Exam Questions.
Here are the notes:
${notes}`;

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
                if (text) break;
            } catch (err) {
                console.warn(`Model ${mName} failed:`, err.message);
                lastError = err;
            }
        }

        if (!text) {
            throw lastError || new Error('All model attempts failed');
        }

        // Clear the job from memory
        pendingJobs.delete(jobId);

        res.json({ guide: text });
    } catch (error) {
        console.error('Gemini error:', error);
        res.status(500).json({ error: `Gemini Error: ${error.message}` });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`StudyScribe AI Server running on http://localhost:${PORT}`);
});
