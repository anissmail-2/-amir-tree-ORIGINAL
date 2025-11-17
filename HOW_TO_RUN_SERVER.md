# 🚀 HOW TO RUN & TEST THE SERVER

---

## ✅ STEP 1: Add Your API Keys to .env File

**Edit this file:** `/home/anis/Projects/AMIR/backend/.env`

```bash
# Open the file
nano /home/anis/Projects/AMIR/backend/.env

# OR use VS Code
code /home/anis/Projects/AMIR/backend/.env
```

**Replace the placeholder values:**

```env
# BEFORE:
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
OPENWEATHER_API_KEY=YOUR_WEATHER_KEY_HERE

# AFTER (paste your actual keys):
GEMINI_API_KEY=AIzaSyB...your-actual-gemini-key...
OPENWEATHER_API_KEY=abc123...your-actual-weather-key...
```

**Save the file!**

---

## ✅ STEP 2: Start the Backend Server

```bash
# Navigate to backend folder
cd /home/anis/Projects/AMIR/backend

# Start the server
npm start
```

**Expected Output:**
```
╔════════════════════════════════════════╗
║   🤖 AI Wardrobe Backend Server       ║
╚════════════════════════════════════════╝
✅ Connected to SQLite database
✅ Wardrobe table ready
✅ Server running on http://localhost:5000
📁 Uploads folder: /home/anis/Projects/AMIR/backend/uploads
💾 Database: /home/anis/Projects/AMIR/backend/wardrobe.db

📡 Available endpoints:
   POST   /api/upload           - Upload clothing item with AI analysis
   GET    /api/wardrobe         - Get all wardrobe items
   DELETE /api/wardrobe/:id     - Delete an item
   POST   /api/recommend        - Get AI outfit recommendation
   GET    /api/weather          - Get current weather
   GET    /api/health           - Health check

⚠️  IMPORTANT: Set your API keys in server.js:
   - GEMINI_API_KEY (line 48)
   - OPENWEATHER_API_KEY (line 53)

🚀 Ready to accept requests!
```

**If you see this: ✅ Server is running!**

---

## ✅ STEP 3: Test the Server (New Terminal)

**Open a NEW terminal** and run these commands:

### Test 1: Health Check
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "AI Wardrobe Backend is running",
  "timestamp": "2025-11-17T04:30:00.000Z"
}
```

**Status:** ✅ If you see this, basic server works!

---

### Test 2: Weather API
```bash
curl http://localhost:5000/api/weather
```

**Expected Response:**
```json
{
  "temperature": 25,
  "condition": "clear",
  "description": "clear sky",
  "humidity": 45,
  "source": "openweathermap"
}
```

**Status:** ✅ If you see real weather data, OpenWeatherMap API key works!

**If you see fallback data:**
```json
{
  "temperature": 25,
  "condition": "sunny",
  "source": "fallback"
}
```
⚠️ This means Weather API key is not working. Check your key in .env file.

---

### Test 3: Wardrobe (Should be empty initially)
```bash
curl http://localhost:5000/api/wardrobe
```

**Expected Response:**
```json
[]
```

**Status:** ✅ Empty array means database is working!

---

## 🧪 ADVANCED TEST: Upload Image with AI

You can test the AI image analysis with a test image:

```bash
# Using curl to upload an image
curl -X POST http://localhost:5000/api/upload \
  -F "image=@/path/to/your/image.jpg"
```

**Expected Response:**
```json
{
  "success": true,
  "id": 1,
  "aiAnalysis": {
    "category": "Shirt",
    "color": "Blue",
    "description": "A casual denim button-up shirt"
  },
  "imagePath": "uploads/1234567890-123456789.jpg"
}
```

**Status:** ✅ If you see AI analysis, Gemini API key works!

---

## 🔍 TROUBLESHOOTING

### Problem: Server won't start

**Error:** `Error: Cannot find module 'dotenv'`
```bash
# Solution: Install dotenv
cd /home/anis/Projects/AMIR/backend
npm install dotenv
```

**Error:** `EADDRINUSE: address already in use :::5000`
```bash
# Solution: Kill the process using port 5000
killall node

# Or find and kill specific process
lsof -ti:5000 | xargs kill -9
```

---

### Problem: API keys not working

**Symptoms:**
- Weather returns fallback data
- Image upload fails with "API key not valid"

**Solutions:**

1. Check .env file exists:
```bash
ls -la /home/anis/Projects/AMIR/backend/.env
```

2. Check .env file content:
```bash
cat /home/anis/Projects/AMIR/backend/.env
```

3. Make sure no spaces around = sign:
```env
# WRONG:
GEMINI_API_KEY = AIza...

# CORRECT:
GEMINI_API_KEY=AIza...
```

4. Make sure keys don't have quotes:
```env
# WRONG:
GEMINI_API_KEY="AIza..."

# CORRECT:
GEMINI_API_KEY=AIza...
```

5. Restart server after editing .env:
```bash
# Stop server: Ctrl+C in server terminal
# Start again:
npm start
```

---

### Problem: Weather API returns error

**Error:** `"cod": 401` (Unauthorized)

**Solution:**
- Wait 10 minutes after creating OpenWeatherMap API key
- It takes a few minutes to activate
- Check key is correct in .env file

---

## ✅ SUCCESS CHECKLIST

After testing, you should have:

- [ ] Server starts without errors
- [ ] Health check returns OK
- [ ] Weather returns real Abu Dhabi data (or fallback)
- [ ] Wardrobe returns empty array []
- [ ] No error messages in server terminal

**If all checked: ✅ Backend is fully operational!**

---

## 📊 QUICK REFERENCE

### Start Server:
```bash
cd /home/anis/Projects/AMIR/backend
npm start
```

### Stop Server:
Press `Ctrl+C` in the terminal where server is running

### Test Endpoints:
```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/weather
curl http://localhost:5000/api/wardrobe
```

### View Server Logs:
Check the terminal where you ran `npm start`

### Edit API Keys:
```bash
nano /home/anis/Projects/AMIR/backend/.env
```

---

## 🎯 NEXT STEPS

Once all tests pass:
1. ✅ Backend is working
2. 🚀 Ready for Day 2 (React Frontend)
3. 📝 Tell me: "Backend tested successfully, ready for Day 2"

---

**Good luck! Your backend is ready to test!** 🚀
