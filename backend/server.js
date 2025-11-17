// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    // Accept any image format by checking if mimetype starts with 'image/'
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Gemini AI Configuration
// API key loaded from .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY not found in .env file');
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// OpenWeatherMap API Key
// API key loaded from .env file
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
if (!OPENWEATHER_API_KEY) {
  console.error('ERROR: OPENWEATHER_API_KEY not found in .env file');
  process.exit(1);
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ==================== MIDDLEWARE ====================

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTHENTICATION ROUTES ====================

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }

        // Generate token
        const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
          message: 'User created successfully',
          token,
          user: { id: this.lastID, username, email }
        });
      }
    );
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== API ROUTES ====================

// 1. Upload clothing item with AI analysis
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
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
    const prompt = `You are a witty and intelligent AI fashion assistant with a great sense of humor! Analyze this image.

FIRST, determine what the image actually contains:
- If it's a single clothing item: Analyze it normally
- If it's multiple clothing items: Make a playful comment like "Hmm, am I supposed to pick just one of these? 🤔" or "I see multiple items here - feeling indecisive?"
- If it's NOT clothing at all: Be clever and funny! Say something like "Are you testing my intelligence by giving me a [whatever you see] thinking this is clothing? 😄" or make a witty observation

For CLOTHING items, choose from: Shirt, T-Shirt, Pants, Jeans, Dress, Shoes, Jacket, Accessories

Respond with valid JSON in this format:
{
  "category": "item type (or 'Not Clothing' if applicable)",
  "color": "primary color (or 'N/A')",
  "description": "Your intelligent, contextual, and potentially humorous response"
}

Be creative, be funny when appropriate, but always be helpful! If someone uploads random stuff, call them out playfully. If it's legitimate clothing, be professional yet friendly.`;

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
      // Fallback if AI doesn't return JSON - but keep the AI's text response
      aiAnalysis = {
        category: 'Unknown',
        color: 'N/A',
        description: text || 'The AI got confused - maybe try a clearer image? 🤔'
      };
      console.log('⚠️ Using fallback with AI text:', text);
    }

    // Save to database
    db.run(
      `INSERT INTO wardrobe_items (user_id, category, color, image_path, description) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, aiAnalysis.category, aiAnalysis.color, relativeImagePath, aiAnalysis.description],
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
app.get('/api/wardrobe', authenticateToken, (req, res) => {
  console.log('📋 Fetching wardrobe items for user:', req.user.id);

  db.all('SELECT * FROM wardrobe_items WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }

    console.log(`✅ Found ${rows.length} items`);
    res.json(rows);
  });
});

// 3. Delete wardrobe item
app.delete('/api/wardrobe/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  console.log('🗑️ Deleting item:', id);

  // Get image path first to delete file
  db.get('SELECT image_path FROM wardrobe_items WHERE id = ? AND user_id = ?', [id, req.user.id], (err, row) => {
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
    db.run('DELETE FROM wardrobe_items WHERE id = ? AND user_id = ?', [id, req.user.id], function(err) {
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
app.post('/api/recommend', authenticateToken, async (req, res) => {
  try {
    const { occasion, weather } = req.body;

    console.log('👔 Generating outfit recommendation...');
    console.log('   Occasion:', occasion);
    console.log('   Weather:', weather);

    // Get all wardrobe items for this user
    db.all('SELECT * FROM wardrobe_items WHERE user_id = ?', [req.user.id], async (err, items) => {
      if (err) {
        console.error('❌ Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log(`📦 Found ${items.length} items in wardrobe`);

      // Create list of items for AI
      const itemsList = items.map(item => `${item.category} (${item.color})`).join(', ');

      let prompt;

      if (items.length === 0) {
        return res.status(400).json({ error: 'Your wardrobe is empty! Upload some clothing items first 👗👔' });
      } else if (items.length === 1) {
        // Creative response for single item
        prompt = `You are a witty fashion AI with a great sense of humor! The user has only ONE item in their wardrobe: ${itemsList}.

Current weather: ${weather.temperature}°C, ${weather.condition}
Occasion: ${occasion}

Be creative and funny! You could:
- Suggest what else they should buy to complete an outfit
- Make a playful comment like "What am I supposed to be creative with? Just this ${items[0].category}? 😅"
- Give styling tips for how to make that one piece shine
- Recommend complementary items they should add to their wardrobe

Respond with valid JSON:
{
  "recommended_categories": ["${items[0].category}"],
  "explanation": "Your witty, helpful response that acknowledges they only have one item and provides creative suggestions"
}`;
      } else {
        // Normal recommendation for 2+ items
        prompt = `You are a professional fashion stylist AI assistant.

Available wardrobe items: ${itemsList}

Current weather: ${weather.temperature}°C, ${weather.condition}
Occasion: ${occasion}

Task: Select 2-3 items from the available wardrobe that work well together for this weather and occasion. Explain why this combination is perfect.

Respond ONLY with valid JSON in this exact format:
{
  "recommended_categories": ["category1", "category2"],
  "explanation": "Detailed explanation of why this outfit works for the weather and occasion"
}`;
      }

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

        // Save to outfit history
        const outfit_items_json = JSON.stringify(selectedItems.map(item => item.id));
        db.run(
          `INSERT INTO outfit_history (user_id, occasion, weather_temp, weather_condition, outfit_items, ai_explanation)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [req.user.id, occasion, weather.temperature, weather.condition, outfit_items_json, recommendation.explanation],
          (err) => {
            if (err) {
              console.error('⚠️ Error saving outfit history:', err.message);
            } else {
              console.log('✅ Outfit saved to history');
            }
          }
        );

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

// 6. Get outfit history
app.get('/api/outfit-history', authenticateToken, (req, res) => {
  console.log('📜 Fetching outfit history for user:', req.user.id);

  db.all(
    'SELECT * FROM outfit_history WHERE user_id = ? ORDER BY worn_date DESC LIMIT 20',
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log(`✅ Found ${rows.length} outfit history items`);
      res.json(rows);
    }
  );
});

// 7. Get analytics/sustainability metrics
app.get('/api/analytics', authenticateToken, (req, res) => {
  console.log('📊 Fetching analytics for user:', req.user.id);

  // Get total items
  db.get('SELECT COUNT(*) as total FROM wardrobe_items WHERE user_id = ?', [req.user.id], (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get underused items (not worn in 30+ days or never worn)
    db.all(
      `SELECT * FROM wardrobe_items
       WHERE user_id = ? AND (last_worn IS NULL OR julianday('now') - julianday(last_worn) > 30)
       ORDER BY wear_count ASC, created_at DESC`,
      [req.user.id],
      (err, underusedItems) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Get most worn items
        db.all(
          'SELECT * FROM wardrobe_items WHERE user_id = ? AND wear_count > 0 ORDER BY wear_count DESC LIMIT 5',
          [req.user.id],
          (err, mostWorn) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            const analytics = {
              totalItems: countRow.total,
              underusedItems: underusedItems,
              mostWornItems: mostWorn || [],
              usageRate: countRow.total > 0 ? ((mostWorn.length / countRow.total) * 100).toFixed(1) : 0
            };

            console.log('✅ Analytics:', analytics);
            res.json(analytics);
          }
        );
      }
    );
  });
});

// 8. Health check endpoint
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
