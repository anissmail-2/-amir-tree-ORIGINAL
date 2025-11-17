# AI Wardrobe Backend

Express.js backend with SQLite database and Gemini AI integration.

## Features

- ✅ Express.js REST API
- ✅ SQLite database for data persistence
- ✅ Gemini 2.0 Flash AI for image analysis
- ✅ Open-Meteo API integration (free weather data, no API key needed!)
- ✅ Image upload with Multer
- ✅ CORS enabled for React frontend
- ✅ JWT authentication with bcrypt password hashing

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. **Get API Keys:**
   - **Gemini API:** https://aistudio.google.com/app/apikey
   - **JWT Secret:** Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - **Weather:** No API key needed! Using Open-Meteo (free service)

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
