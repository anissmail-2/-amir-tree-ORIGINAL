// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 5000;

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== CONFIGURATION ====================

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Gemini AI Configuration
// IMPORTANT: Replace with your actual API key!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// OpenWeatherMap API Key
// IMPORTANT: Replace with your actual API key!
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'YOUR_OPENWEATHER_API_KEY_HERE';

// ==================== API ROUTES ====================

// 1. Upload clothing item with AI analysis
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    console.log('📤 Uploading image:', req.file.filename);

    const imagePath = req.file.path;
    const relativeImagePath = 'uploads/' + req.file.filename;

    // Read image and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    console.log('🤖 Analyzing image with Gemini AI...');

    // Analyze with Gemini AI
    const prompt = `Analyze this clothing item image and provide the following information:
1. Item Type: Choose EXACTLY one from (Shirt, T-Shirt, Pants, Jeans, Dress, Shoes, Jacket, Accessories)
2. Primary Color: One word color name
3. Brief Description: One sentence describing the item

Respond ONLY with valid JSON in this exact format:
{"category": "item type", "color": "color name", "description": "brief description"}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: req.file.mimetype
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('🤖 AI Response:', text);

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    let aiAnalysis;

    if (jsonMatch) {
      aiAnalysis = JSON.parse(jsonMatch[0]);
      console.log('✅ AI Analysis:', aiAnalysis);
    } else {
      // Fallback if AI doesn't return JSON
      aiAnalysis = {
        category: 'Accessories',
        color: 'Unknown',
        description: 'Could not analyze image automatically'
      };
      console.log('⚠️ Using fallback analysis');
    }

    // Save to database
    db.run(
      `INSERT INTO wardrobe_items (category, color, image_path, description) VALUES (?, ?, ?, ?)`,
      [aiAnalysis.category, aiAnalysis.color, relativeImagePath, aiAnalysis.description],
      function(err) {
        if (err) {
          console.error('❌ Database error:', err.message);
          return res.status(500).json({ error: err.message });
        }

        console.log('✅ Item saved to database with ID:', this.lastID);

        res.json({
          success: true,
          id: this.lastID,
          aiAnalysis: aiAnalysis,
          imagePath: relativeImagePath
        });
      }
    );
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. Get all wardrobe items
app.get('/api/wardrobe', (req, res) => {
  console.log('📋 Fetching all wardrobe items...');

  db.all('SELECT * FROM wardrobe_items ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }

    console.log(`✅ Found ${rows.length} items`);
    res.json(rows);
  });
});

// 3. Delete wardrobe item
app.delete('/api/wardrobe/:id', (req, res) => {
  const { id } = req.params;
  console.log('🗑️ Deleting item:', id);

  // Get image path first to delete file
  db.get('SELECT image_path FROM wardrobe_items WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }

    // Delete image file if exists
    if (row && row.image_path) {
      const fullPath = path.join(__dirname, row.image_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('🗑️ Deleted image file:', row.image_path);
      }
    }

    // Delete from database
    db.run('DELETE FROM wardrobe_items WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('❌ Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log('✅ Item deleted from database');
      res.json({ success: true, deletedRows: this.changes });
    });
  });
});

// 4. Get AI outfit recommendation
app.post('/api/recommend', async (req, res) => {
  try {
    const { occasion, weather } = req.body;

    console.log('👔 Generating outfit recommendation...');
    console.log('   Occasion:', occasion);
    console.log('   Weather:', weather);

    // Get all wardrobe items
    db.all('SELECT * FROM wardrobe_items', async (err, items) => {
      if (err) {
        console.error('❌ Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }

      if (items.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 items in wardrobe to generate recommendation' });
      }

      console.log(`📦 Found ${items.length} items in wardrobe`);

      // Create list of items for AI
      const itemsList = items.map(item => `${item.category} (${item.color})`).join(', ');

      const prompt = `You are a professional fashion stylist AI assistant.

Available wardrobe items: ${itemsList}

Current weather: ${weather.temperature}°C, ${weather.condition}
Occasion: ${occasion}

Task: Select 2-3 items from the available wardrobe that work well together for this weather and occasion. Explain why this combination is perfect.

Respond ONLY with valid JSON in this exact format:
{
  "recommended_categories": ["category1", "category2"],
  "explanation": "Detailed explanation of why this outfit works for the weather and occasion"
}`;

      console.log('🤖 Asking Gemini AI for recommendation...');

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('🤖 AI Response:', text);

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*?\}/);

      if (jsonMatch) {
        const recommendation = JSON.parse(jsonMatch[0]);

        console.log('✅ AI Recommendation:', recommendation);

        // Find matching items from wardrobe
        const selectedItems = [];
        for (let cat of recommendation.recommended_categories) {
          const found = items.find(item =>
            item.category.toLowerCase().includes(cat.toLowerCase()) ||
            cat.toLowerCase().includes(item.category.toLowerCase())
          );
          if (found && !selectedItems.find(i => i.id === found.id)) {
            selectedItems.push(found);
          }
        }

        console.log(`✅ Selected ${selectedItems.length} matching items`);

        res.json({
          items: selectedItems,
          explanation: recommendation.explanation,
          weather: weather,
          occasion: occasion
        });
      } else {
        console.error('⚠️ Could not parse AI response as JSON');
        res.status(500).json({ error: 'Could not generate recommendation' });
      }
    });
  } catch (error) {
    console.error('❌ Recommendation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 5. Get weather data from OpenWeatherMap API
app.get('/api/weather', async (req, res) => {
  try {
    console.log('🌤️ Fetching weather data...');

    const city = 'Abu Dhabi';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    const data = await response.json();

    if (data.cod !== 200) {
      console.log('⚠️ Weather API error, using fallback data');
      return res.json({
        temperature: 25,
        condition: 'sunny',
        source: 'fallback'
      });
    }

    const weatherData = {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main.toLowerCase(),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      source: 'openweathermap'
    };

    console.log('✅ Weather data:', weatherData);
    res.json(weatherData);
  } catch (error) {
    console.error('❌ Weather API error:', error.message);
    // Return fallback weather data
    res.json({
      temperature: 25,
      condition: 'sunny',
      source: 'fallback'
    });
  }
});

// 6. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AI Wardrobe Backend is running',
    timestamp: new Date().toISOString()
  });
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ error: err.message });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   🤖 AI Wardrobe Backend Server       ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads folder: ${path.join(__dirname, 'uploads')}`);
  console.log(`💾 Database: ${path.join(__dirname, 'wardrobe.db')}`);
  console.log('\n📡 Available endpoints:');
  console.log('   POST   /api/upload           - Upload clothing item with AI analysis');
  console.log('   GET    /api/wardrobe         - Get all wardrobe items');
  console.log('   DELETE /api/wardrobe/:id     - Delete an item');
  console.log('   POST   /api/recommend        - Get AI outfit recommendation');
  console.log('   GET    /api/weather          - Get current weather');
  console.log('   GET    /api/health           - Health check');
  console.log('\n⚠️  IMPORTANT: Set your API keys in server.js:');
  console.log('   - GEMINI_API_KEY (line 48)');
  console.log('   - OPENWEATHER_API_KEY (line 53)');
  console.log('\n🚀 Ready to accept requests!\n');
});

module.exports = app;
