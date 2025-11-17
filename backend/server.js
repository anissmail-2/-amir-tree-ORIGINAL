const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const db = require('./database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Gemini AI setup - TODO: Replace with your API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// API Routes

// 1. Upload clothing item with AI analysis
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file.path;

    // Read image and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Analyze with Gemini AI
    const prompt = `Analyze this clothing item and provide:
1. Type (Shirt/Pants/Dress/Shoes/Jacket/Accessories)
2. Primary color
3. Brief description (one sentence)

Format as JSON: {"category": "...", "color": "...", "description": "..."}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    const aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      category: 'Accessories',
      color: 'Unknown',
      description: 'Could not analyze'
    };

    // Save to database
    db.run(
      `INSERT INTO wardrobe_items (category, color, image_path, description) VALUES (?, ?, ?, ?)`,
      [aiAnalysis.category, aiAnalysis.color, imagePath, aiAnalysis.description],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({
          success: true,
          id: this.lastID,
          aiAnalysis
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get all wardrobe items
app.get('/api/wardrobe', (req, res) => {
  db.all('SELECT * FROM wardrobe_items ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 3. Delete item
app.delete('/api/wardrobe/:id', (req, res) => {
  const { id } = req.params;

  // Get image path first
  db.get('SELECT image_path FROM wardrobe_items WHERE id = ?', [id], (err, row) => {
    if (row && row.image_path) {
      // Delete image file if it exists
      if (fs.existsSync(row.image_path)) {
        fs.unlinkSync(row.image_path);
      }
    }

    // Delete from database
    db.run('DELETE FROM wardrobe_items WHERE id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// 4. Get AI outfit recommendation
app.post('/api/recommend', async (req, res) => {
  try {
    const { occasion, weather } = req.body;

    // Get all items
    db.all('SELECT * FROM wardrobe_items', async (err, items) => {
      if (err || items.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 items' });
      }

      const itemsList = items.map(i => `${i.category} (${i.color})`).join(', ');

      const prompt = `You are a fashion stylist AI.

Available items: ${itemsList}
Weather: ${weather.temperature}°C, ${weather.condition}
Occasion: ${occasion}

Recommend 2-3 items that work together. Explain why.

Format as JSON:
{
  "recommended_categories": ["category1", "category2"],
  "explanation": "why this outfit works"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*?\}/);

      if (jsonMatch) {
        const recommendation = JSON.parse(jsonMatch[0]);

        // Find matching items
        const selectedItems = [];
        for (let cat of recommendation.recommended_categories) {
          const found = items.find(item =>
            item.category.toLowerCase().includes(cat.toLowerCase())
          );
          if (found) selectedItems.push(found);
        }

        res.json({
          items: selectedItems,
          explanation: recommendation.explanation
        });
      } else {
        res.status(500).json({ error: 'Could not generate recommendation' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get weather (OpenWeatherMap API)
app.get('/api/weather', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const API_KEY = process.env.OPENWEATHER_API_KEY || 'YOUR_OPENWEATHER_API_KEY';
    const city = 'Abu Dhabi';

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    );
    const data = await response.json();

    if (data.main && data.weather) {
      res.json({
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main.toLowerCase()
      });
    } else {
      // Fallback weather
      res.json({ temperature: 25, condition: 'sunny' });
    }
  } catch (error) {
    // Fallback weather
    res.json({ temperature: 25, condition: 'sunny' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Create uploads folder if not exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`📊 Database: SQLite (wardrobe.db)`);
  console.log(`🤖 AI: Gemini API (${GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY' ? 'NOT CONFIGURED' : 'Configured'})`);
  console.log(`🌤️  Weather: OpenWeatherMap API`);
});
