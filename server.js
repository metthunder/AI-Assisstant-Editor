// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/continue-writing', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Text is required to continue writing'
      });
    }

    // Use correct model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const prompt = `Continue writing from where this text left off. Only provide the continuation text that comes after the existing text. Do NOT repeat any of the existing text.

Write 2-3 sentences that naturally flow from the last sentence. Match the tone and style.

Existing text:
${text}

Continuation (only new text):`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let continuation = response.text().trim();

    // Strategy 1: Check if continuation starts with the full original text
    const textLower = text.toLowerCase().trim();
    const continuationLower = continuation.toLowerCase();
    
    if (continuationLower.startsWith(textLower)) {
      continuation = continuation.slice(text.length).trim();
      console.log('Removed full text repetition');
    }
    
    // Strategy 2: Check for partial repetition (last 20 words down to 3 words)
    const words = text.trim().split(/\s+/);
    for (let wordCount = Math.min(words.length, 20); wordCount >= 3; wordCount--) {
      const lastNWords = words.slice(-wordCount).join(' ');
      const lastNWordsLower = lastNWords.toLowerCase();
      
      if (continuationLower.startsWith(lastNWordsLower)) {
        continuation = continuation.slice(lastNWords.length).trim();
        console.log(`Removed ${wordCount} word repetition`);
        break;
      }
    }
    
    // Strategy 3: Character-by-character matching from the end of original text
    // This handles cases where AI repeats character by character
    let maxMatch = 0;
    const minMatchLength = 10; // Minimum characters to consider as repetition
    
    for (let i = minMatchLength; i <= Math.min(text.length, continuation.length); i++) {
      const endOfText = text.slice(-i).toLowerCase();
      const startOfContinuation = continuation.slice(0, i).toLowerCase();
      
      if (endOfText === startOfContinuation) {
        maxMatch = i;
      }
    }
    
    if (maxMatch > 0) {
      continuation = continuation.slice(maxMatch).trim();
      console.log(`Removed ${maxMatch} character repetition`);
    }
    
    // Strategy 4: Remove the entire original text if it appears anywhere at the start
    // Split by sentences and check
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    for (let i = sentences.length; i >= 1; i--) {
      const lastSentences = sentences.slice(-i).join('.').trim();
      if (lastSentences && continuationLower.startsWith(lastSentences.toLowerCase())) {
        continuation = continuation.slice(lastSentences.length).trim();
        console.log(`Removed ${i} sentence repetition`);
        break;
      }
    }

    // Clean up any leading punctuation or spaces
    continuation = continuation.replace(/^[.\s,;:]+/, '').trim();

    // Ensure proper spacing before continuation
    if (continuation && !text.endsWith(' ') && !continuation.match(/^[.,!?;:]/)) {
      continuation = ' ' + continuation;
    }

    // Return ONLY the continuation text
    res.json({
      success: true,
      text: continuation,
      continuation: continuation
    });

  } catch (error) {
    console.error('Error generating continuation:', error);

    if (error.message?.includes('API key')) {
      return res.status(401).json({
        error: 'Invalid API key. Please check your Gemini API key.'
      });
    }

    if (error.message?.includes('quota')) {
      return res.status(429).json({
        error: 'API quota exceeded. Please try again later.'
      });
    }

    res.status(500).json({
      error: 'Failed to generate continuation. Please try again.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AI Text Editor API is running',
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoint: http://localhost:${PORT}/api/continue-writing`);

  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  WARNING: GEMINI_API_KEY not found in environment variables');
  } else {
    console.log('✅ Gemini API key configured');
  }
});