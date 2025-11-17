# 🤖 AI Wardrobe

**AI-powered wardrobe management system** - University SWE401 Project

Organize your clothes, get AI outfit recommendations based on weather and occasion!

---

## 🚀 Quick Start

### One-Command Startup:
```bash
./start.sh
```

This starts both backend and frontend servers!

### Stop Everything:
```bash
./stop.sh
```

---

## 📋 Access the Application

- **Frontend (React App):** http://localhost:3000
- **Backend (API):** http://localhost:5000

---

## ✨ Features

1. **👤 User Authentication**
   - Secure signup with password hashing (bcrypt)
   - JWT token-based login
   - User-specific wardrobes

2. **👕 Wardrobe Management**
   - Upload clothing photos
   - AI auto-categorization (Gemini AI)
   - View all your items
   - Delete items

3. **🤖 AI Outfit Recommendations**
   - Based on current weather (OpenWeatherMap API)
   - Occasion-based (Casual, Formal, Business, Party, Sports)
   - AI explains why the outfit works

4. **📊 Analytics & Sustainability**
   - Track outfit history
   - Identify underused items
   - Promote sustainable fashion

---

## 🛠️ Tech Stack

### Backend:
- Node.js + Express.js
- SQLite database
- JWT authentication
- bcrypt password hashing
- **Google Gemini AI** (image analysis)
- **OpenWeatherMap API** (weather data)

### Frontend:
- React 19
- Axios for API calls
- Modern responsive UI

---

## 📁 Project Structure

```
AMIR/
├── start.sh              # 🚀 Start both servers
├── stop.sh               # 🛑 Stop all servers
├── backend/
│   ├── server.js         # Express API server
│   ├── database.js       # SQLite setup
│   ├── .env              # API keys (DO NOT COMMIT!)
│   ├── uploads/          # Clothing images
│   └── wardrobe.db       # SQLite database
├── frontend/
│   └── src/
│       ├── App.js
│       └── components/
│           ├── Login.js
│           ├── Signup.js
│           ├── Wardrobe.js
│           ├── Upload.js
│           └── Recommend.js
└── Documentation/        # Project docs
```

---

## 🔑 API Endpoints

### Authentication:
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login

### Wardrobe (🔒 requires auth token):
- `POST /api/upload` - Upload clothing item
- `GET /api/wardrobe` - Get all items
- `DELETE /api/wardrobe/:id` - Delete item

### Features (🔒 requires auth token):
- `POST /api/recommend` - Get AI outfit suggestion
- `GET /api/outfit-history` - View past outfits
- `GET /api/analytics` - Sustainability metrics
- `GET /api/weather` - Current weather

### Public:
- `GET /api/health` - Server health check

---

## 📝 Manual Setup (if needed)

### Backend:
```bash
cd backend
npm install
node server.js
```

### Frontend:
```bash
cd frontend
npm install
npm start
```

---

## 🔐 Environment Variables

The backend requires API keys in `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_key_here
PORT=5000
```

**Get API Keys:**
- **Gemini AI:** https://aistudio.google.com/app/apikey
- **OpenWeather:** https://openweathermap.org/api

---

## 👥 Team Members

- Mohammed Ali Kumo (1087491)
- Mohammed Al-Hammadi (1093829)
- Mohamed Amir Smail (1088172)

**Instructor:** Dr. Mourad Al-Rajab

**Course:** SWE401 - Software Engineering

**University:** Abu Dhabi University

---

## 📊 Project Status

- ✅ User Authentication System
- ✅ Wardrobe Management
- ✅ AI Image Analysis (Gemini)
- ✅ Weather Integration (OpenWeatherMap)
- ✅ AI Outfit Recommendations
- ✅ Outfit History Tracking
- ✅ Sustainability Analytics

**Ready for Demo!** 🎉

---

## 🐛 Troubleshooting

**Server won't start:**
```bash
./stop.sh  # Stop any running instances
./start.sh # Start fresh
```

**Check logs:**
```bash
tail -f backend/backend.log
tail -f frontend/frontend.log
```

**Database issues:**
```bash
cd backend
rm wardrobe.db  # Delete old database
node server.js  # Recreates tables
```

---

## 📄 License

University Project - SWE401 Fall 2025
