const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
// Use port 3000 (Replit maps this to external port 80)
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// File upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY missing. Add it to .env file');
} else {
  console.log(`✅ Gemini API Key configured: ${GEMINI_API_KEY.substring(0, 10)}...`);
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Gemini models
const GEMINI_MODELS = {
  FLASH: "gemini-2.5-flash",
  VISION: "gemini-2.0-flash-exp-vision",
  FALLBACK: "gemini-1.5-flash"
};

// Storage
const symptomHistory = new Map();

// ==================== API ENDPOINTS ====================

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'HealthVision AI Assistant',
    version: '3.0.0',
    gemini: {
      model: GEMINI_MODELS.FLASH,
      status: GEMINI_API_KEY ? 'API Key configured' : 'API Key missing',
      hackathon: 'Gemini 3 Ready'
    },
    features: ['voice', 'image', 'drugs', 'history', 'pdf', 'multi-language'],
    supported_languages: ['en', 'es', 'fr', 'ar', 'hi'],
    endpoints: {
      analyze: 'POST /api/analyze',
      voice: 'POST /api/voice',
      image: 'POST /api/analyze-image',
      drugs: 'POST /api/drugs',
      history: 'GET /api/history/:sessionId',
      testVoice: 'GET /api/test-voice'
    }
  });
});

// 2. Main Analysis - WITH COMPLETE LANGUAGE SUPPORT
app.post('/api/analyze', async (req, res) => {
  try {
    const { symptoms, age, gender, duration, language = 'en' } = req.body;

    if (!symptoms || symptoms.trim().length < 3) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please describe your symptoms (minimum 3 characters)' 
      });
    }

    console.log(`🔍 Analyzing in ${language}: "${symptoms.substring(0, 50)}${symptoms.length > 50 ? '...' : ''}"`);

    // If no API key, use fallback
    if (!GEMINI_API_KEY || !genAI) {
      console.log('⚠️ No API key - using fallback response');
      return res.json({
        success: true,
        sessionId: uuidv4(),
        analysis: getFallbackResponse(symptoms, age, gender, duration, language),
        model: 'Fallback',
        note: 'Add GEMINI_API_KEY to .env for AI analysis',
        language: language
      });
    }

    try {
      const model = genAI.getGenerativeModel({ 
        model: GEMINI_MODELS.FLASH,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1200,
        }
      });

      // Language-specific prompts
      const languagePrompts = {
        en: `You are a medical AI assistant. Analyze these symptoms in English:

SYMPTOMS: "${symptoms}"
${age ? `AGE: ${age}` : ''}
${gender ? `GENDER: ${gender}` : ''}
${duration ? `DURATION: ${duration}` : ''}

Provide a detailed medical analysis. Return ONLY valid JSON in this exact format:
{
  "possibleConditions": ["Condition 1", "Condition 2", "Condition 3"],
  "severity": "Low or Medium or High or Emergency",
  "recommendations": ["Specific recommendation 1", "Specific recommendation 2", "Specific recommendation 3"],
  "requiresImmediateCare": true or false,
  "whenToSeeDoctor": "Specific timeframe and criteria",
  "selfCareTips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"]
}

IMPORTANT: Make it specific to these exact symptoms. Do not give generic advice.`,

        es: `Eres un asistente médico de IA. Analiza estos síntomas en español:

SÍNTOMAS: "${symptoms}"
${age ? `EDAD: ${age}` : ''}
${gender ? `GÉNERO: ${gender}` : ''}
${duration ? `DURACIÓN: ${duration}` : ''}

Proporciona un análisis médico detallado. Devuelve SOLAMENTE JSON válido en este formato exacto:
{
  "possibleConditions": ["Condición 1", "Condición 2", "Condición 3"],
  "severity": "Baja o Media o Alta o Emergencia",
  "recommendations": ["Recomendación específica 1", "Recomendación específica 2", "Recomendación específica 3"],
  "requiresImmediateCare": true o false,
  "whenToSeeDoctor": "Plazo específico y criterios",
  "selfCareTips": ["Consejo práctico 1", "Consejo práctico 2", "Consejo práctico 3"]
}

IMPORTANTE: Hazlo específico para estos síntomas exactos. No des consejos genéricos.`,

        fr: `Vous êtes un assistant médical IA. Analysez ces symptômes en français:

SYMPTÔMES: "${symptoms}"
${age ? `ÂGE: ${age}` : ''}
${gender ? `GENRE: ${gender}` : ''}
${duration ? `DURÉE: ${duration}` : ''}

Fournissez une analyse médicale détaillée. Retournez UNIQUEMENT du JSON valide dans ce format exact:
{
  "possibleConditions": ["Condition 1", "Condition 2", "Condition 3"],
  "severity": "Faible ou Moyenne ou Élevée ou Urgence",
  "recommendations": ["Recommandation spécifique 1", "Recommandation spécifique 2", "Recommandation spécifique 3"],
  "requiresImmediateCare": true ou false,
  "whenToSeeDoctor": "Délai spécifique et critères",
  "selfCareTips": ["Conseil pratique 1", "Conseil pratique 2", "Conseil pratique 3"]
}

IMPORTANT: Rendez-le spécifique à ces symptômes exacts. Ne donnez pas de conseils génériques.`,

        ar: `أنت مساعد طبي بالذكاء الاصطناعي. حلل هذه الأعراض باللغة العربية:

الأعراض: "${symptoms}"
${age ? `العمر: ${age}` : ''}
${gender ? `الجنس: ${gender}` : ''}
${duration ? `المدة: ${duration}` : ''}

قدم تحليلاً طبيًا مفصلاً. أعد JSON صالحًا فقط بهذا التنسيق الدقيق:
{
  "possibleConditions": ["حالة 1", "حالة 2", "حالة 3"],
  "severity": "منخفضة أو متوسطة أو عالية أو طارئة",
  "recommendations": ["توصية محددة 1", "توصية محددة 2", "توصية محددة 3"],
  "requiresImmediateCare": true أو false,
  "whenToSeeDoctor": "إطار زمني ومعايير محددة",
  "selfCareTips": ["نصيحة عملية 1", "نصيحة عملية 2", "نصيحة عملية 3"]
}

هام: اجعلها محددة لهذه الأعراض بالضبط. لا تقدم نصائح عامة.`,

        hi: `आप एक मेडिकल एआई सहायक हैं। इन लक्षणों का हिंदी में विश्लेषण करें:

लक्षण: "${symptoms}"
${age ? `आयु: ${age}` : ''}
${gender ? `लिंग: ${gender}` : ''}
${duration ? `अवधि: ${duration}` : ''}

विस्तृत चिकित्सा विश्लेषण प्रदान करें। केवल इस सटीक प्रारूप में वैध JSON लौटाएं:
{
  "possibleConditions": ["स्थिति 1", "स्थिति 2", "स्थिति 3"],
  "severity": "कम या मध्यम या उच्च या आपातकालीन",
  "recommendations": ["विशिष्ट सिफारिश 1", "विशिष्ट सिफारिश 2", "विशिष्ट सिफारिश 3"],
  "requiresImmediateCare": true या false,
  "whenToSeeDoctor": "विशिष्ट समय सीमा और मानदंड",
  "selfCareTips": ["व्यावहारिक सुझाव 1", "व्यावहारिक सुझाव 2", "व्यावहारिक सुझाव 3"]
}

महत्वपूर्ण: इन विशिष्ट लक्षणों के लिए विशिष्ट बनाएं। सामान्य सलाह न दें।`
      };

      const prompt = languagePrompts[language] || languagePrompts.en;

      console.log(`📤 Calling Gemini API in ${language}...`);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      console.log('📥 Received response (first 200 chars):', responseText.substring(0, 200));

      // Extract JSON from response
      let jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('⚠️ No JSON found in response, using fallback');
        throw new Error('Invalid response format');
      }

      let jsonString = jsonMatch[0];
      let analysis;

      try {
        // Clean JSON string
        jsonString = jsonString.trim();
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '');
        jsonString = jsonString.replace(/'/g, '"');
        jsonString = jsonString.replace(/(\w+):/g, '"$1":'); // Ensure keys are quoted

        analysis = JSON.parse(jsonString);
        console.log('✅ Successfully parsed JSON response');
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError.message);
        console.log('Raw JSON string:', jsonString.substring(0, 200));

        // Try to extract data manually
        analysis = extractAnalysisFromText(responseText, symptoms, language);
      }

      // Validate and normalize the analysis
      analysis = validateAndNormalizeAnalysis(analysis, symptoms, language);

      // Store in history
      const sessionId = req.body.userId || uuidv4();
      if (!symptomHistory.has(sessionId)) {
        symptomHistory.set(sessionId, []);
      }

      symptomHistory.get(sessionId).push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        symptoms,
        age,
        gender,
        duration,
        language,
        analysis
      });

      res.json({
        success: true,
        sessionId,
        analysis,
        model: GEMINI_MODELS.FLASH,
        note: `Analysis by Gemini 2.5 Flash (${language})`,
        language: language
      });

    } catch (geminiError) {
      console.error('❌ Gemini API error:', geminiError.message);

      // Return fallback
      res.json({
        success: true,
        sessionId: uuidv4(),
        analysis: getFallbackResponse(symptoms, age, gender, duration, language),
        model: 'Fallback',
        note: 'Gemini API error - using fallback analysis',
        language: language
      });
    }

  } catch (error) {
    console.error('❌ Server error in /api/analyze:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// 3. Voice Output - WITH LANGUAGE SUPPORT
app.post('/api/voice', async (req, res) => {
  try {
    const { text, language = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    // Language codes for speech synthesis
    const languageCodes = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      ar: 'ar-SA',
      hi: 'hi-IN'
    };

    const langCode = languageCodes[language] || 'en-US';

    // If we have Gemini API, we can optimize the text for speech
    if (GEMINI_API_KEY && genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.FLASH });
        const prompt = `Optimize this medical text for speech synthesis in ${language}. Make it clear, with pauses, and easy to understand when spoken:\n\n"${text.substring(0, 500)}"`;

        const result = await model.generateContent(prompt);
        const optimizedText = result.response.text();

        return res.json({
          success: true,
          text: optimizedText,
          language: langCode,
          instructions: 'Use browser SpeechSynthesis API',
          exampleCode: `const utterance = new SpeechSynthesisUtterance('${optimizedText.substring(0, 50)}...');
utterance.lang = '${langCode}';
utterance.rate = 1.0;
window.speechSynthesis.speak(utterance);`
        });
      } catch (aiError) {
        console.log('Voice optimization failed, using original text:', aiError.message);
      }
    }

    // Fallback to original text
    res.json({
      success: true,
      text: text,
      language: langCode,
      instructions: 'Use browser SpeechSynthesis API with specified language'
    });

  } catch (error) {
    console.error('Voice error:', error);
    res.json({
      success: true,
      text: req.body.text || '',
      language: 'en-US'
    });
  }
});

// 4. Image Analysis
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { symptoms, language = 'en' } = req.body;

    if (!GEMINI_API_KEY || !genAI) {
      return res.json({
        success: true,
        analysis: 'Please add Gemini API key to .env file for image analysis',
        model: 'Fallback',
        language: language
      });
    }

    try {
      const model = genAI.getGenerativeModel({ 
        model: GEMINI_MODELS.VISION,
        generationConfig: { maxOutputTokens: 500 }
      });

      const imageBase64 = req.file.buffer.toString('base64');

      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: req.file.mimetype
        }
      };

      const prompt = language === 'es' ? `Analiza esta imagen médica: ${symptoms || 'Sin descripción'}` :
                    language === 'fr' ? `Analysez cette image médicale: ${symptoms || 'Pas de description'}` :
                    `Analyze this medical image: ${symptoms || 'No description provided'}`;

      const result = await model.generateContent([prompt, imagePart]);

      res.json({
        success: true,
        analysis: result.response.text(),
        model: GEMINI_MODELS.VISION,
        language: language
      });

    } catch (visionError) {
      console.error('Vision error:', visionError);

      // Fallback to text analysis
      const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.FLASH });
      const fallbackPrompt = language === 'es' ? `Analiza basado en descripción: ${symptoms || 'Sin descripción'}` :
                           language === 'fr' ? `Analysez basé sur la description: ${symptoms || 'Pas de description'}` :
                           `Analyze based on description: ${symptoms || 'No description provided'}`;

      const result = await model.generateContent(fallbackPrompt);

      res.json({
        success: true,
        analysis: result.response.text(),
        model: GEMINI_MODELS.FLASH,
        note: language === 'es' ? 'Usado análisis de texto (visión no disponible)' :
              language === 'fr' ? 'Utilisé analyse de texte (vision non disponible)' :
              'Used text analysis (vision unavailable)',
        language: language
      });
    }

  } catch (error) {
    console.error('Image analysis error:', error);
    res.json({
      success: true,
      analysis: language === 'es' ? 'Análisis de imagen no disponible. Por favor describe los síntomas en texto.' :
                language === 'fr' ? 'Analyse d\'image non disponible. Veuillez décrire les symptômes en texte.' :
                'Image analysis service unavailable. Please describe symptoms in text.',
      fallback: true,
      language: language
    });
  }
});

// 5. Drug Interactions
app.post('/api/drugs', async (req, res) => {
  try {
    const { medicines, conditions, allergies, language = 'en' } = req.body;

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ error: 'Medicines array required with at least one medicine' });
    }

    if (!GEMINI_API_KEY || !genAI) {
      return res.json({
        success: true,
        analysis: language === 'es' ? 'La verificación de interacciones de medicamentos requiere una clave API de Gemini en el archivo .env' :
                  language === 'fr' ? 'La vérification des interactions médicamenteuses nécessite une clé API Gemini dans le fichier .env' :
                  'Drug interaction check requires Gemini API key in .env file',
        model: 'Fallback',
        language: language
      });
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.FLASH });

    const prompts = {
      en: `Check drug interactions for medications: ${medicines.join(', ')}
      ${conditions ? `\nMedical conditions: ${conditions}` : ''}
      ${allergies ? `\nAllergies: ${allergies}` : ''}

      Provide safety analysis and recommendations in English.`,

      es: `Verifica interacciones de medicamentos para: ${medicines.join(', ')}
      ${conditions ? `\nCondiciones médicas: ${conditions}` : ''}
      ${allergies ? `\nAlergias: ${allergies}` : ''}

      Proporciona análisis de seguridad y recomendaciones en español.`,

      fr: `Vérifiez les interactions médicamenteuses pour: ${medicines.join(', ')}
      ${conditions ? `\nConditions médicales: ${conditions}` : ''}
      ${allergies ? `\nAllergies: ${allergies}` : ''}

      Fournissez une analyse de sécurité et des recommandations en français.`
    };

    const prompt = prompts[language] || prompts.en;
    const result = await model.generateContent(prompt);

    res.json({
      success: true,
      analysis: result.response.text(),
      model: GEMINI_MODELS.FLASH,
      language: language
    });

  } catch (error) {
    console.error('Drug interaction error:', error);
    res.json({
      success: true,
      analysis: language === 'es' ? 'Verificación de interacciones de medicamentos no disponible. Consulte a un farmacéutico o médico.' :
                language === 'fr' ? 'Vérification des interactions médicamenteuses non disponible. Consultez un pharmacien ou un médecin.' :
                'Drug interaction check unavailable. Please consult a pharmacist or doctor.',
      fallback: true,
      language: language
    });
  }
});

// 6. History
app.get('/api/history/:sessionId', (req, res) => {
  const history = symptomHistory.get(req.params.sessionId) || [];
  res.json({
    success: true,
    count: history.length,
    history: history.slice(-10).reverse()
  });
});

// 7. Test Voice
app.get('/api/test-voice', (req, res) => {
  const { language = 'en' } = req.query;

  const testMessages = {
    en: 'HealthVision AI voice output is working correctly.',
    es: 'La salida de voz de HealthVision AI funciona correctamente.',
    fr: 'La sortie vocale de HealthVision AI fonctionne correctement.',
    ar: 'الإخراج الصوتي لـ HealthVision AI يعمل بشكل صحيح.',
    hi: 'HealthVision AI वॉयस आउटपुट सही ढंग से काम कर रहा है।'
  };

  res.json({
    success: true,
    message: 'Voice uses browser SpeechSynthesis API',
    supported: 'speechSynthesis' in (typeof window !== 'undefined' ? window : {}),
    testText: testMessages[language] || testMessages.en,
    language: language
  });
});

// ==================== HELPER FUNCTIONS ====================

function getFallbackResponse(symptoms, age, gender, duration, language = 'en') {
  const symptomText = (symptoms || '').toLowerCase();

  // Language-specific responses
  const responses = {
    en: {
      conditions: ["Medical consultation recommended"],
      severity: "Medium",
      recommendations: ["Monitor symptoms closely", "Rest and stay hydrated", "Consult healthcare provider if symptoms worsen"],
      whenToSeeDoctor: "Within 24-48 hours if symptoms persist",
      selfCareTips: ["Drink plenty of fluids", "Get adequate rest", "Avoid triggers if known"],
      note: "This is AI-generated information. Consult a healthcare professional for proper diagnosis.",
      immediateCare: "REQUIRES IMMEDIATE MEDICAL ATTENTION"
    },
    es: {
      conditions: ["Consulta médica recomendada"],
      severity: "Media",
      recommendations: ["Controla los síntomas de cerca", "Descansa y mantente hidratado", "Consulta a un proveedor de atención médica si los síntomas empeoran"],
      whenToSeeDoctor: "Dentro de 24-48 horas si los síntomas persisten",
      selfCareTips: ["Bebe muchos líquidos", "Descansa adecuadamente", "Evita desencadenantes si se conocen"],
      note: "Esta es información generada por IA. Consulte a un profesional de la salud para un diagnóstico adecuado.",
      immediateCare: "REQUIERE ATENCIÓN MÉDICA INMEDIATA"
    },
    fr: {
      conditions: ["Consultation médique recommandée"],
      severity: "Moyenne",
      recommendations: ["Surveillez attentivement les symptômes", "Reposez-vous et restez hydraté", "Consultez un professionnel de santé si les symptômes s'aggravent"],
      whenToSeeDoctor: "Dans les 24-48 heures si les symptômes persistent",
      selfCareTips: ["Buvez beaucoup de liquides", "Reposez-vous suffisamment", "Évitez les déclencheurs connus"],
      note: "Ceci est une information générée par l'IA. Consultez un professionnel de la santé pour un diagnostic approprié.",
      immediateCare: "NÉCESSITE DES SOINS MÉDICAUX IMMÉDIATS"
    },
    ar: {
      conditions: ["يوصى باستشارة طبية"],
      severity: "متوسطة",
      recommendations: ["راقب الأعراض عن كثب", "استرح وابق رطبًا", "استشر مقدم الرعاية الصحية إذا ساءت الأعراض"],
      whenToSeeDoctor: "خلال 24-48 ساعة إذا استمرت الأعراض",
      selfCareTips: ["اشرب الكثير من السوائل", "احصل على قسط كافٍ من الراحة", "تجنب المحفزات المعروفة"],
      note: "هذه معلومات تم إنشاؤها بواسطة الذكاء الاصطناعي. استشر أخصائي رعاية صحية للتشخيص المناسب.",
      immediateCare: "يتطلب رعاية طبية فورية"
    },
    hi: {
      conditions: ["चिकित्सकीय परामर्श की सिफारिश की गई"],
      severity: "मध्यम",
      recommendations: ["लक्षणों की बारीकी से निगरानी करें", "आराम करें और हाइड्रेटेड रहें", "यदि लक्षण बिगड़ते हैं तो स्वास्थ्य सेवा प्रदाता से परामर्श करें"],
      whenToSeeDoctor: "24-48 घंटों के भीतर यदि लक्षण बने रहते हैं",
      selfCareTips: ["भरपूर मात्रा में तरल पदार्थ पिएं", "पर्याप्त आराम करें", "यदि ज्ञात हो तो ट्रिगर्स से बचें"],
      note: "यह एआई-जनित जानकारी है। उचित निदान के लिए किसी स्वास्थ्य देखभाल पेशेवर से परामर्श करें।",
      immediateCare: "तत्काल चिकित्सा ध्यान देने की आवश्यकता है"
    }
  };

  const langResponse = responses[language] || responses.en;

  // Adjust based on symptoms
  let conditions = langResponse.conditions;
  let severity = langResponse.severity;
  let requiresImmediateCare = false;

  if (symptomText.includes('headache') && symptomText.includes('vision')) {
    if (language === 'es') conditions = ["Migraña", "Dolor de cabeza tensional", "Migraña ocular"];
    else if (language === 'fr') conditions = ["Migraine", "Céphalée de tension", "Migraine oculaire"];
    else if (language === 'ar') conditions = ["صداع نصفي", "صداع التوتر", "صداع نصفي بصري"];
    else if (language === 'hi') conditions = ["माइग्रेन", "टेंशन सिरदर्द", "नेत्र माइग्रेन"];
    else conditions = ["Migraine", "Tension headache", "Ocular migraine"];
    severity = language === 'es' ? "Media" : language === 'fr' ? "Moyenne" : language === 'ar' ? "متوسطة" : language === 'hi' ? "मध्यम" : "Medium";
  } else if (symptomText.includes('chest') && symptomText.includes('pain')) {
    if (language === 'es') conditions = ["Evaluación cardíaca necesaria", "Dolor musculoesquelético", "ERGE"];
    else if (language === 'fr') conditions = ["Évaluation cardiaque nécessaire", "Douleur musculosquelettique", "RGO"];
    else if (language === 'ar') conditions = ["تقييم قلبي مطلوب", "ألم عضلي هيكلي", "ارتداد معدي مريئي"];
    else if (language === 'hi') conditions = ["हृदय मूल्यांकन आवश्यक", "मस्कुलोस्केलेटल दर्द", "जीईआरडी"];
    else conditions = ["Cardiac evaluation needed", "Musculoskeletal pain", "GERD"];
    severity = language === 'es' ? "Alta" : language === 'fr' ? "Élevée" : language === 'ar' ? "عالية" : language === 'hi' ? "उच्च" : "High";
    requiresImmediateCare = symptomText.includes('severe') || symptomText.includes('radiating');
  } else if (symptomText.includes('fever') && symptomText.includes('cough')) {
    if (language === 'es') conditions = ["Infección viral", "Gripe", "Resfriado común"];
    else if (language === 'fr') conditions = ["Infection virale", "Grippe", "Rhume"];
    else if (language === 'ar') conditions = ["عدوى فيروسية", "إنفلونزا", "نزلة برد"];
    else if (language === 'hi') conditions = ["वायरल संक्रमण", "इन्फ्लुएंजा", "सामान्य सर्दी"];
    else conditions = ["Viral infection", "Influenza", "Common cold"];
    severity = language === 'es' ? "Baja" : language === 'fr' ? "Faible" : language === 'ar' ? "منخفضة" : language === 'hi' ? "कम" : "Low";
  }

  return {
    possibleConditions: conditions,
    severity: severity,
    recommendations: langResponse.recommendations,
    requiresImmediateCare: requiresImmediateCare,
    whenToSeeDoctor: langResponse.whenToSeeDoctor,
    selfCareTips: langResponse.selfCareTips,
    note: langResponse.note
  };
}

function extractAnalysisFromText(text, symptoms, language = 'en') {
  console.log(`🛠️ Extracting analysis from text response in ${language}`);

  const defaultResponses = {
    en: {
      conditions: ["Consult healthcare provider"],
      recommendations: ["Rest", "Monitor symptoms", "Seek medical advice"],
      whenToSeeDoctor: "If symptoms persist or worsen",
      selfCareTips: ["Stay hydrated", "Get adequate rest"]
    },
    es: {
      conditions: ["Consulte a un proveedor de atención médica"],
      recommendations: ["Descansar", "Controlar los síntomas", "Buscar asesoramiento médico"],
      whenToSeeDoctor: "Si los síntomas persisten o empeoran",
      selfCareTips: ["Mantenerse hidratado", "Descansar adecuadamente"]
    },
    fr: {
      conditions: ["Consultez un professionnel de santé"],
      recommendations: ["Reposer", "Surveiller les symptômes", "Demander un avis médical"],
      whenToSeeDoctor: "Si les symptômes persistent ou s'aggravent",
      selfCareTips: ["Rester hydraté", "Se reposer suffisamment"]
    }
  };

  const langDefault = defaultResponses[language] || defaultResponses.en;

  const analysis = {
    possibleConditions: langDefault.conditions,
    severity: language === 'es' ? "Media" : language === 'fr' ? "Moyenne" : "Medium",
    recommendations: langDefault.recommendations,
    requiresImmediateCare: false,
    whenToSeeDoctor: langDefault.whenToSeeDoctor,
    selfCareTips: langDefault.selfCareTips
  };

  // Try to extract severity
  if (text.match(/emergency|urgent|immediate/i)) {
    analysis.severity = language === 'es' ? "Emergencia" : language === 'fr' ? "Urgence" : "Emergency";
    analysis.requiresImmediateCare = true;
  } else if (text.match(/high|severe|serious/i)) {
    analysis.severity = language === 'es' ? "Alta" : language === 'fr' ? "Élevée" : "High";
  } else if (text.match(/low|mild|minor/i)) {
    analysis.severity = language === 'es' ? "Baja" : language === 'fr' ? "Faible" : "Low";
  }

  return analysis;
}

function validateAndNormalizeAnalysis(analysis, symptoms, language = 'en') {
  if (!analysis || typeof analysis !== 'object') {
    return getFallbackResponse(symptoms, null, null, null, language);
  }

  const defaultAnalysis = getFallbackResponse('', null, null, null, language);

  // Merge with defaults
  const result = { ...defaultAnalysis, ...analysis };

  // Ensure arrays
  if (!Array.isArray(result.possibleConditions)) {
    result.possibleConditions = defaultAnalysis.possibleConditions;
  }

  if (!Array.isArray(result.recommendations)) {
    result.recommendations = defaultAnalysis.recommendations;
  }

  if (!Array.isArray(result.selfCareTips)) {
    result.selfCareTips = defaultAnalysis.selfCareTips;
  }

  // Validate severity
  const severityMap = {
    en: ["Low", "Medium", "High", "Emergency"],
    es: ["Baja", "Media", "Alta", "Emergencia"],
    fr: ["Faible", "Moyenne", "Élevée", "Urgence"],
    ar: ["منخفضة", "متوسطة", "عالية", "طارئة"],
    hi: ["कम", "मध्यम", "उच्च", "आपातकालीन"]
  };

  const validSeverities = severityMap[language] || severityMap.en;
  if (!validSeverities.includes(result.severity)) {
    result.severity = validSeverities[1]; // Default to "Medium"
  }

  return result;
}

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HealthVision AI Assistant running on port ${PORT}`);
  console.log(`🤖 Primary model: ${GEMINI_MODELS.FLASH}`);
  console.log(`🔑 Gemini API: ${GEMINI_API_KEY ? '✅ Configured' : '❌ Missing (add to .env)'}`);
  console.log(`🗣️  Supported languages: en, es, fr, ar, hi`);
  console.log(`📸 Vision model: ${GEMINI_MODELS.VISION}`);
  console.log(`🏆 Hackathon: Gemini 3 Ready`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   Web Interface: http://localhost:${PORT}/`);
  console.log(`   GET  /api/health         - Health check`);
  console.log(`   POST /api/analyze        - Analyze symptoms (with language support)`);
  console.log(`   POST /api/voice          - Text to speech (with language support)`);
  console.log(`   POST /api/analyze-image  - Image analysis (with language support)`);
  console.log(`   POST /api/drugs          - Drug interactions (with language support)`);
  console.log(`   GET  /api/history/:id    - Get history`);
  console.log(`   GET  /api/test-voice     - Test voice (with language parameter)`);
  console.log(`\n🌐 External URL: Check Replit webview`);
});
