const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Initialize Gemini with YOUR specific model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = "gemini-2.5-flash"; // YOUR MODEL

console.log(`🚀 Using Gemini Model: ${GEMINI_MODEL}`);

// Store conversation history
const userSessions = new Map();

// Health Analysis Endpoint - OPTIMIZED FOR GEMINI FLASH
app.post('/api/analyze-symptoms', async (req, res) => {
  try {
    const { symptoms, sessionId = 'default' } = req.body;

    if (!symptoms || symptoms.trim().length < 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please describe symptoms in detail (minimum 5 characters)' 
      });
    }

    // Get or create session
    if (!userSessions.has(sessionId)) {
      userSessions.set(sessionId, []);
    }
    const sessionHistory = userSessions.get(sessionId);

    // Add to history
    sessionHistory.push({ role: 'user', content: symptoms });

    // Get analysis from Gemini Flash
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    // Optimized prompt for Flash model
    const prompt = `You are HealthVision AI, a medical assistant. Analyze these symptoms: "${symptoms}"

    ${sessionHistory.length > 1 ? `Context from previous messages: ${JSON.stringify(sessionHistory.slice(-3))}` : ''}

    Respond in this EXACT JSON format only:
    {
      "possibleConditions": ["Condition 1", "Condition 2", "Condition 3"],
      "severity": "Low/Medium/High/Emergency",
      "immediateActions": ["Action 1", "Action 2"],
      "homeCare": ["Care tip 1", "Care tip 2"],
      "whenToSeeDoctor": "Specific guidance",
      "emergencySigns": ["Sign 1", "Sign 2"],
      "certainty": "High/Medium/Low",
      "disclaimer": "This is not medical advice. Consult a doctor."
    }

    Guidelines:
    1. Be conservative with safety
    2. If any emergency signs, set severity to "Emergency"
    3. For minor issues, recommend home care
    4. Never diagnose specific diseases
    5. Always recommend professional consultation`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON response
    let analysis;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : parseUnstructuredResponse(response);
    } catch (error) {
      analysis = parseUnstructuredResponse(response);
    }

    // Add metadata
    analysis.modelUsed = GEMINI_MODEL;
    analysis.timestamp = new Date().toISOString();

    // Add to history
    sessionHistory.push({ role: 'assistant', content: JSON.stringify(analysis) });

    // Keep history manageable
    if (sessionHistory.length > 6) {
      userSessions.set(sessionId, sessionHistory.slice(-6));
    }

    res.json({
      success: true,
      ...analysis,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Gemini API Error:', error);

    // Provide helpful fallback
    res.status(500).json({ 
      success: false, 
      error: 'Analysis service temporarily unavailable',
      fallback: generateSmartFallback(req.body?.symptoms || 'Unknown symptoms'),
      suggestion: 'Please try again in a moment'
    });
  }
});

function parseUnstructuredResponse(text) {
  // Extract information from unstructured text
  const lowerText = text.toLowerCase();

  return {
    possibleConditions: extractList(text, ['possible', 'could be', 'might be']),
    severity: extractSeverity(text),
    immediateActions: extractList(text, ['immediately', 'right now', 'should']),
    homeCare: extractList(text, ['home', 'rest', 'hydrate']),
    whenToSeeDoctor: extractWhenToSeeDoctor(text),
    emergencySigns: extractEmergencySigns(text),
    certainty: "Medium",
    disclaimer: "AI-generated suggestion. Consult healthcare professional.",
    rawResponse: text.substring(0, 200) + "..."
  };
}

function extractList(text, keywords) {
  const sentences = text.split(/[.!?]+/);
  const relevant = sentences.filter(s => 
    keywords.some(k => s.toLowerCase().includes(k))
  );
  return relevant.slice(0, 3).map(s => s.trim());
}

function extractSeverity(text) {
  if (text.toLowerCase().includes('emergency') || text.includes('911') || text.includes('urgent')) {
    return "Emergency";
  } else if (text.toLowerCase().includes('high') || text.includes('serious')) {
    return "High";
  } else if (text.toLowerCase().includes('medium') || text.includes('moderate')) {
    return "Medium";
  }
  return "Low";
}

function extractWhenToSeeDoctor(text) {
  const markers = ['see a doctor', 'consult a physician', 'medical attention', 'seek help'];
  for (const marker of markers) {
    const idx = text.toLowerCase().indexOf(marker);
    if (idx > -1) {
      return text.substring(idx, Math.min(idx + 100, text.length)).trim();
    }
  }
  return "If symptoms persist or worsen";
}

function extractEmergencySigns(text) {
  const emergencies = [
    'difficulty breathing', 'chest pain', 'severe pain', 'unconscious',
    'bleeding heavily', 'high fever', 'stiff neck', 'sudden weakness'
  ];
  return emergencies.filter(e => text.toLowerCase().includes(e));
}

function generateSmartFallback(symptoms) {
  const lower = symptoms.toLowerCase();

  if (lower.includes('chest') && (lower.includes('pain') || lower.includes('pressure'))) {
    return {
      possibleConditions: ["Requires immediate evaluation - could be cardiac", "Musculoskeletal pain", "Acid reflux"],
      severity: "Emergency",
      immediateActions: ["Call emergency services immediately", "Sit down and rest", "Do not drive yourself"],
      homeCare: ["None - this requires emergency care"],
      whenToSeeDoctor: "IMMEDIATELY",
      emergencySigns: ["Chest pain/pressure", "Pain radiating to arm/jaw", "Shortness of breath", "Nausea/sweating"],
      certainty: "High",
      disclaimer: "⚠️ CHEST SYMPTOMS REQUIRE IMMEDIATE MEDICAL ATTENTION",
      note: "Fallback mode - Gemini unavailable"
    };
  }

  // Generic fallback
  return {
    possibleConditions: ["Multiple potential causes", "Requires professional assessment"],
    severity: "Medium",
    immediateActions: ["Rest", "Monitor symptoms"],
    homeCare: ["Stay hydrated", "Get adequate rest"],
    whenToSeeDoctor: "If symptoms worsen or persist beyond 48 hours",
    emergencySigns: ["Difficulty breathing", "Severe pain", "High fever", "Confusion"],
    certainty: "Low",
    disclaimer: "Service temporarily using fallback. Consult doctor for accurate assessment.",
    note: "Gemini API connection issue"
  };
}

// Enhanced Health Education with Gemini Flash
app.post('/api/health-info', async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `Explain "${topic}" for patients in simple, clear language.

    Format as JSON:
    {
      "overview": "Brief explanation",
      "commonCauses": ["Cause 1", "Cause 2"],
      "symptoms": ["Symptom 1", "Symptom 2"],
      "homeRemedies": ["Remedy 1", "Remedy 2"],
      "prevention": ["Prevention tip 1", "Prevention tip 2"],
      "whenToWorry": "When to seek medical help"
    }

    Keep it under 150 words total.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { overview: response };
      data.source = GEMINI_MODEL;
      res.json(data);
    } catch {
      res.json({ overview: response, source: GEMINI_MODEL });
    }

  } catch (error) {
    console.error('Health info error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch health information',
      fallback: getFallbackHealthInfo(req.body?.topic || 'general')
    });
  }
});

function getFallbackHealthInfo(topic) {
  const info = {
    headache: {
      overview: "Headaches can be tension, migraine, or cluster types",
      commonCauses: ["Stress", "Dehydration", "Eye strain", "Lack of sleep"],
      symptoms: ["Throbbing pain", "Pressure", "Sensitivity to light/sound"],
      homeRemedies: ["Rest in dark room", "Cold compress", "Hydration", "Caffeine in moderation"],
      prevention: ["Regular sleep", "Stress management", "Stay hydrated", "Good posture"],
      whenToWorry: "Sudden severe headache, headache after injury, or with fever/stiff neck"
    },
    fever: {
      overview: "Fever is body's defense against infection",
      commonCauses: ["Viral infections", "Bacterial infections", "Inflammatory conditions"],
      symptoms: ["Elevated temperature", "Chills", "Sweating", "Body aches"],
      homeRemedies: ["Rest", "Hydration", "Cool compresses", "Light clothing"],
      prevention: ["Hand hygiene", "Vaccinations", "Avoid sick contacts"],
      whenToWorry: "Fever >103°F (39.4°C), lasts >3 days, or with severe symptoms"
    }
  };

  return info[topic.toLowerCase()] || {
    overview: `Information about ${topic}. Consult healthcare provider.`,
    commonCauses: ["Various factors"],
    symptoms: ["Depends on condition"],
    homeRemedies: ["Rest and hydration"],
    prevention: ["Healthy lifestyle"],
    whenToWorry: "If symptoms are severe or persistent",
    source: "fallback"
  };
}

// Model info endpoint
app.get('/api/model-info', (req, res) => {
  res.json({
    model: GEMINI_MODEL,
    provider: "Google Gemini",
    status: "active",
    capabilities: ["text generation", "reasoning", "structured output"],
    hackathonNote: "Ready for Gemini 3 upgrade",
    timestamp: new Date().toISOString()
  });
});

// Quick symptom check (lightweight)
app.post('/api/quick-check', async (req, res) => {
  try {
    const { symptom } = req.body;

    if (!symptom) {
      return res.json({ suggestion: "Describe a symptom for quick guidance" });
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `One symptom: "${symptom}". In one sentence, is this usually minor or potentially serious?`;

    const result = await model.generateContent(prompt);

    res.json({
      symptom: symptom,
      quickAssessment: result.response.text(),
      suggestion: "For detailed analysis, use the full symptom analyzer",
      model: GEMINI_MODEL
    });

  } catch (error) {
    res.json({
      symptom: req.body?.symptom,
      quickAssessment: "Use full analysis for accurate assessment",
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'HealthVision AI',
    model: GEMINI_MODEL,
    version: '2.5.0',
    uptime: process.uptime(),
    hackathon: 'Gemini 3 Hackathon Ready'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🏥 HEALTHVISION AI - GEMINI 3 HACKATHON');
  console.log('='.repeat(50));
  console.log(`✅ Model: ${GEMINI_MODEL}`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔗 URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
  console.log('🚀 Ready for submission!');
  console.log('='.repeat(50));
});
