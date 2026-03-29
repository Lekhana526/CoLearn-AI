const express = require('express');
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    const { prompt, notes, fileContexts, chatHistory } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    // Build a rich system context from notes + uploaded files
    let systemContext = 'You are a helpful and concise AI study assistant embedded in a notebook app called CoLearn AI. Help the user with their studies.';

    if (notes && notes.trim().length > 10) {
        systemContext += `\n\nThe user's current notebook notes:\n"""\n${notes.substring(0, 4000)}\n"""`;
    }

    if (fileContexts && fileContexts.length > 0) {
        fileContexts.forEach(f => {
            if (f.content) {
                systemContext += `\n\nUploaded file "${f.name}":\n"""\n${f.content.substring(0, 4000)}\n"""`;
            } else {
                systemContext += `\n\nUploaded file (no extractable text): "${f.name}"`;
            }
        });
    }

    // Build the conversation history for multi-turn chat
    const contents = [];

    // Inject system context as the first user turn
    contents.push({
        role: 'user',
        parts: [{ text: systemContext }]
    });
    contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I have your notes and uploaded files loaded as context. How can I help?' }]
    });

    // Append previous chat history (alternating user/model)
    if (chatHistory && chatHistory.length > 0) {
        chatHistory.forEach(turn => {
            contents.push({
                role: turn.role, // 'user' or 'model'
                parts: [{ text: turn.text }]
            });
        });
    }

    // Append the new user prompt
    contents.push({
        role: 'user',
        parts: [{ text: prompt }]
    });

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({ contents })
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error('Gemini API error:', errData);

            // Fallback for Quota Exceeded (429) to keep the app functional
            if (response.status === 429 || errData?.error?.code === 429) {
                console.log('Falling back to Smart Mock due to Quota Exceeded');
                const p = prompt.toLowerCase();
                const files = fileContexts || [];
                const fileNames = files.map(f => f.name).join(', ');
                let mockReply = '';

                if (files.length > 0 && (p.includes('file') || p.includes('upload') || files.some(f => p.includes(f.name.toLowerCase())))) {
                    const targetFile = files.find(f => p.includes(f.name.toLowerCase())) || files[files.length - 1];
                    if (targetFile && targetFile.content) {
                        mockReply = `**[Offline Fallback Mode]** Due to API quota limits, I cannot fully analyze this file right now. However, I can see you are asking about **${targetFile.name}**. \n\nThe document begins like this: \n"${targetFile.content.substring(0, 300).replace(/\s+/g, ' ')}..."`;
                    } else {
                        mockReply = `**[Offline Fallback]** I see you've uploaded ${files.length} file(s): ${fileNames}. (Operating in Offline Mode due to API quota limits).`;
                    }
                } else if (p.includes('summarize') || p.includes('analyze') || p.includes('explain') || p.includes('question')) {
                    const filesWithContent = files.filter(f => f.content);
                    if (filesWithContent.length > 0) {
                        const mostRecent = filesWithContent[filesWithContent.length - 1];
                        mockReply = `**[Offline Fallback]** Currently, my AI generation is paused due to API quota limits. \n\nI can see **${mostRecent.name}**, which starts with: \n"${mostRecent.content.substring(0, 300).replace(/\s+/g, ' ')}..."`;
                    } else if (!notes || notes.length < 20) {
                        mockReply = `**[Offline Fallback]** I'd love to help summarize, but your notes are currently brief and no readable files are uploaded.`;
                    } else {
                        mockReply = `**[Offline Fallback]** Based on your notes, it seems you're working on something interesting. (API Quota Exceeded, cannot generate full summary/explanation).`;
                    }
                } else if (p.includes('hello') || p.includes('hi')) {
                    mockReply = "Hello! I'm Gemini, your AI study assistant. **(Note: I am currently in Offline Fallback mode due to API quota limits, but I can still read your notes and files!)**";
                } else {
                    mockReply = `**[Offline Fallback]** That's a great request! However, due to API quota limits on the provided API key, I cannot generate a full intelligent response right now. I can see your notes and ${files.length} context file(s). \n\nWe will resume normal operation once the quota limit is resolved.`;
                }

                return res.json({ reply: mockReply });
            }

            return res.status(response.status).json({ error: errData?.error?.message || 'Gemini API error.' });
        }

        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.';

        res.json({ reply });
    } catch (err) {
        console.error('AI route error:', err);
        res.status(500).json({ error: 'Failed to reach Gemini API.' });
    }
});

module.exports = router;
