# healthvision-aI-assistant
AI-powered health assistant using Gemini 3 for symptom analysis.  Gemini 3 Hackathon project featuring real-time AI reasoning,  severity assessment, and emergency warnings. Built with Node.js/Express.
# 🏥 HealthVision AI Assistant - Gemini 3 Hackathon Project

[![Gemini 3](https://img.shields.io/badge/Gemini-3-4285F4?logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Overview
HealthVision AI Assistant is an intelligent symptom analysis tool powered by **Google's Gemini 3** API. This project was built for the **Gemini 3 Global Hackathon** to demonstrate the potential of advanced AI in healthcare guidance.
## ✨ Features
- **AI-Powered Symptom Analysis** using Gemini 3's advanced reasoning
- **Severity Assessment** (Low/Medium/High/Emergency) with clear visual indicators
- **Voice Input Support** for hands-free symptom description
- **Real-time Processing** with instant AI responses
- **Mobile-First Design** responsive across all devices
- **Emergency Warning System** for critical symptoms
- **Health Education** module powered by Gemini 3
## ✨ Advanced Features

### 🌐 Multi-Language Support
- **10+ languages** including English, Spanish, Arabic, Hindi, Chinese
- **Real-time translation** using Gemini 3's language capabilities
- **Accurate medical terminology** preservation across languages

### 📸 Image Symptom Analysis
- **Upload photos** of rashes, injuries, swelling
- **Gemini Vision** analyzes visual symptoms
- **Combined analysis** with text descriptions

### 💊 Drug Interaction Checker
- **Real-time medicine compatibility** analysis
- **Risk level assessment** (High/Medium/Low)
- **Alternative suggestions** powered by Gemini 3

### 📊 History & Tracking
- **Session-based history** storage
- **Timeline view** of symptoms and analyses
- **Export to PDF** for doctor visits

### 🎤 Voice Input/Output
- **Voice-to-text** for symptom description
- **Text-to-speech** for results
- **Multi-language voice** support

### 📄 PDF Report Generation
- **Professional medical reports**
- **Shareable format** for healthcare providers
- **Includes all analysis details**

### ⚡ Quick Examples Library
- **Common symptom templates**
- **One-click loading** for testing
- **Educational examples** for learning

### 🎨 Smart Severity Display
- **Color-coded severity** (Green/Yellow/Red)
- **Emergency warnings** with animations
- **Clear visual hierarchy**

To Deploy:
npm install

Set environment variables in Replit Secrets:

GEMINI_API_KEY = Your actual key

Run:

bash
npm start

## 🚀 Live Demo
👉 **[Try it live on Replit]
https://fa8bfe3b-07df-42e5-8ed4-01b71e148a8a-00-qxnl67odjue0.picard.replit.dev/
## 🏆 Hackathon Submission
This project is submitted to the **Gemini 3 Global Hackathon** hosted by Google DeepMind.
### Submission Requirements:
- ✅ **Uses Gemini 3 API** - Integrated with gemini-3.0-pro model
- ✅ **Working Demo** - Fully functional web application
- ✅ **Public Repository** - Code available on GitHub
- ✅ **3-Minute Demo Video** - Complete walkthrough available
## 🛠️ Tech Stack
- **Backend**: Node.js + Express
- **AI Model**: Google Gemini 3 API (gemini-3.0-pro)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Hosting**: Replit
- **Version Control**: Git + GitHub
## 📁 Project Structure
healthvision-ai-assistant/
├── index.js # Main server (Express.js)
├── package.json # Dependencies
├── .env.example # Environment template
├── .gitignore # Git ignore rules
├── LICENSE # MIT License
├── public/
│ └── index.html # Frontend UI
└── README.md # This file
## 🏃‍♂️ Quick Start
### 1. Clone Repository
```bash
git clone https://github.com/Sule-Bashir/healthvision-aI-assistant.git
cd healthvision-ai-assistant
Install Dependencies
npm install
Configure Environment
cp .env.example .env
# Edit .env and add your Gemini 3 API key
Run Application
# Development
npm run dev
# Production
npm start
Open in Browser
Visit http://localhost:3000
🔧 Environment Variables
Create a .env file:
GEMINI_API_KEY=your_gemini_3_api_key_here
PORT=3000
NODE_ENV=production
📊 API Endpoints
Method	Endpoint	Description
GET	/api/health	Health check
POST	/api/analyze	Analyze symptoms
POST	/api/health-info	Get health information
🎯 How It Uses Gemini 3
Advanced Reasoning: Gemini 3 analyzes complex symptom patterns
Structured Responses: Returns JSON-formatted medical guidance
Safety First: Conservative severity assessments
Educational Content: Provides health information and prevention tips
⚠️ Important Disclaimer
This is an AI-powered educational tool for the Gemini 3 Hackathon. It is NOT a medical device or diagnostic tool. Always consult with qualified healthcare professionals for medical advice, diagnosis, or treatment. In case of emergency, call your local emergency number immediately.
📝 License
This project is licensed under the MIT License - see the LICENSE file for details.
🤝 Contributing
This is a hackathon project, but suggestions and feedback are welcome!
📧 Contact
Developer: Sule Bashir
GitHub: @Sule-Bashir
Project: healthvision-aI-assistant
Built with ❤️ for the Gemini 3 Global Hackathon

### **5. `.env.example`**
```env
# Gemini 3 API Configuration
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_3_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=production

# Application Settings
APP_NAME=HealthVision AI Assistant
APP_VERSION=1.0.0
