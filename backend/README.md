# AI Wardrobe Backend

Express.js backend with SQLite database and Gemini AI integration.

## Features

- ✅ Express.js REST API
- ✅ SQLite database for data persistence
- ✅ Gemini 2.0 Flash AI for image analysis
- ✅ OpenWeatherMap API integration
- ✅ Image upload with Multer
- ✅ CORS enabled for React frontend

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Get API Keys:**
   - **Gemini API:** https://aistudio.google.com/app/apikey
   - **OpenWeatherMap API:** https://openweathermap.org/api

3. **Add API keys to `server.js`:**
   - Line 48: Replace `YOUR_GEMINI_API_KEY_HERE` with your Gemini key
   - Line 53: Replace `YOUR_OPENWEATHER_API_KEY_HERE` with your weather key

4. **Run the server:**
   ```bash
   npm start
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload clothing image with AI analysis |
| GET | `/api/wardrobe` | Get all wardrobe items |
| DELETE | `/api/wardrobe/:id` | Delete an item |
| POST | `/api/recommend` | Get AI outfit recommendation |
| GET | `/api/weather` | Get current weather (Abu Dhabi) |
| GET | `/api/health` | Health check |

## Technology Stack

- **Node.js** v20.x
- **Express.js** v4.18
- **SQLite3** v5.1
- **Multer** v1.4 (file uploads)
- **Google Generative AI** (Gemini 2.0 Flash)
- **CORS** enabled

## Database Schema

```sql
CREATE TABLE wardrobe_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  image_path TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## File Structure

```
backend/
├── server.js           # Main Express server
├── database.js         # SQLite database setup
├── package.json        # Dependencies
├── wardrobe.db         # SQLite database (auto-created)
├── uploads/            # Uploaded images folder
└── README.md           # This file
```

## Testing

```bash
# Health check
curl http://localhost:5000/api/health

# Get wardrobe items
curl http://localhost:5000/api/wardrobe

# Get weather
curl http://localhost:5000/api/weather
```

## Notes

- Backend runs on port 5000
- Images stored in `/uploads` folder
- Database file: `wardrobe.db`
- Supports JPEG, PNG, GIF images
- Max file size: 5MB
