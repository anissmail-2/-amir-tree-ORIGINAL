// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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

// Gemini AI Configuration - Multiple API Keys for Redundancy
const API_KEYS = [
  { key: "AIzaSyCEm1zKOnlASP9AMENd21tkyT1BtHjx5wU", email: "sazman539@gmail.com" },
  { key: "AIzaSyCvO6ep8lmbzSw5vjTzhiqbkW0Bb3P6wBo", email: "anissmail22@gmail.com" },
  { key: "AIzaSyDuW4ld6jnO3SPocwJbUK1xTI3oMZs7lVI", email: "anissmail2@gmail.com" },
  { key: "AIzaSyCPBG-HAP9IzFluhD-YdJZ0AWzVEPVOiOE", email: "agui80759@gmail.com" },
  { key: "AIzaSyDx4P3eu2OXwZA6cadGdkam53HC8Bf4RiQ", email: "Senfour.anis00@gmail.com" },
  { key: "AIzaSyBIx8CIMd0Zz04y1R0jNxlScVzU5Z3NZlo", email: "anissmail222@gmail.com" },
  { key: "AIzaSyDqrMcJ9WkqEahDQpk8iqoLwkCJTPP0cAQ", email: "anis.dk99@gmail.com" },
  { key: "AIzaSyDPoqXWI-LK6i1UNdqxNLFk8y1weA6xfR0", email: "anissmail534@gmail.com" },
  { key: "AIzaSyDXhkg9aQdzyOBC1nBlf3ETKON7mEr668M", email: "bah21105@gmail.com" }
];

let currentKeyIndex = 0;

// Helper function to get next API key
function getNextApiKey() {
  const apiKey = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return apiKey;
}

// Helper function to call Gemini with retry logic and multiple keys
async function callGeminiWithRetry(prompt, imageData = null, maxRetries = 5) {
  let lastError = null;
  const startKeyIndex = currentKeyIndex;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKeyInfo = getNextApiKey();
      console.log(`🔑 Attempt ${attempt + 1}/${maxRetries} - Using API key: ${apiKeyInfo.email}`);

      const genAI = new GoogleGenerativeAI(apiKeyInfo.key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      let result;
      if (imageData) {
        result = await model.generateContent([prompt, imageData]);
      } else {
        result = await model.generateContent(prompt);
      }

      const response = await result.response;
      const text = response.text();

      console.log(`✅ Success with API key: ${apiKeyInfo.email}`);
      return text;

    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt + 1} failed: ${error.message}`);

      // If it's a 503 (overloaded) or 429 (quota exceeded), try next key
      if (error.message.includes('503') || error.message.includes('429') ||
          error.message.includes('overloaded') || error.message.includes('quota')) {

        // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
        const delay = Math.min(500 * Math.pow(2, attempt), 8000);
        console.log(`⏳ Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  // If all retries failed
  throw new Error(`All ${maxRetries} API attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// No API key needed for Open-Meteo weather API (free service)

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

// ==================== USER PROFILE ROUTES ====================

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
  console.log('👤 Fetching profile for user:', req.user.id);

  db.get('SELECT id, username, email, gender, age, nationality, current_location, marital_status, occupation FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Profile fetched successfully');
    res.json(user);
  });
});

// Update user profile
app.put('/api/profile', authenticateToken, (req, res) => {
  console.log('👤 Updating profile for user:', req.user.id);

  const { gender, age, nationality, current_location, marital_status, occupation } = req.body;

  db.run(
    `UPDATE users SET gender = ?, age = ?, nationality = ?, current_location = ?, marital_status = ?, occupation = ? WHERE id = ?`,
    [gender, age, nationality, current_location, marital_status, occupation, req.user.id],
    function(err) {
      if (err) {
        console.error('❌ Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log('✅ Profile updated successfully');
      res.json({
        success: true,
        message: 'Profile updated successfully',
        changes: this.changes
      });
    }
  );
});

// ==================== HELPER FUNCTIONS ====================

// Calculate file hash for duplicate detection
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Check if duplicate image exists in wardrobe
function checkDuplicateImage(userId, fileHash, callback) {
  db.all('SELECT * FROM wardrobe_items WHERE user_id = ?', [userId], (err, items) => {
    if (err) {
      return callback(err, null);
    }

    for (const item of items) {
      const itemPath = path.join(__dirname, item.image_path);
      if (fs.existsSync(itemPath)) {
        const itemHash = calculateFileHash(itemPath);
        if (itemHash === fileHash) {
          return callback(null, item);
        }
      }
    }
    callback(null, null);
  });
}

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

    // Check for duplicate images
    const fileHash = calculateFileHash(imagePath);
    checkDuplicateImage(req.user.id, fileHash, async (err, duplicate) => {
      if (err) {
        console.error('❌ Error checking duplicates:', err.message);
        // Continue anyway - don't block upload
      }

      if (duplicate) {
        console.log('⚠️ Duplicate image detected:', duplicate.category);
        // Delete the newly uploaded file since it's a duplicate
        fs.unlinkSync(imagePath);
        return res.status(400).json({
          error: 'This image already exists in your wardrobe!',
          duplicate: {
            category: duplicate.category,
            color: duplicate.color,
            description: duplicate.description
          }
        });
      }

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

For CLOTHING items:
- Categories: Shirt, T-Shirt, Pants, Jeans, Dress, Shoes, Jacket, Accessories
- Gender: Determine if the item is typically for Male, Female, or Unisex/Both

Respond with valid JSON in this format:
{
  "category": "item type (or 'Not Clothing' if applicable)",
  "color": "primary color (or 'N/A')",
  "gender": "Male, Female, or Unisex (or 'N/A' if not clothing)",
  "description": "Your intelligent, contextual, and potentially humorous response"
}

Be creative, be funny when appropriate, but always be helpful! If someone uploads random stuff, call them out playfully. If it's legitimate clothing, be professional yet friendly.`;

      let text;
      try {
        text = await callGeminiWithRetry(prompt, {
          inlineData: {
            data: base64Image,
            mimeType: req.file.mimetype
          }
        });
        console.log('🤖 AI Response:', text);
      } catch (error) {
        console.error('❌ All API attempts failed:', error.message);
        // Return user-friendly error without crashing
        return res.status(503).json({
          error: 'AI service is temporarily unavailable. Please try again in a few moments.',
          details: 'Our AI analysis service is experiencing high demand. Your image has been saved, but we couldn\'t analyze it right now.'
        });
      }

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
          gender: 'N/A',
          description: text || 'The AI got confused - maybe try a clearer image? 🤔'
        };
        console.log('⚠️ Using fallback with AI text:', text);
      }

      // Save to database
      db.run(
        `INSERT INTO wardrobe_items (user_id, category, color, gender, image_path, description) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, aiAnalysis.category, aiAnalysis.color, aiAnalysis.gender || 'N/A', relativeImagePath, aiAnalysis.description],
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
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);

    // Graceful error handling - don't crash the server
    if (error.message.includes('503') || error.message.includes('overloaded')) {
      return res.status(503).json({
        error: 'AI service is temporarily overloaded',
        details: 'Please try uploading again in a few moments.'
      });
    }

    res.status(500).json({
      error: 'An error occurred while processing your upload',
      details: error.message
    });
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

// 4. Get AI outfit recommendation (Enhanced with user profile)
app.post('/api/recommend', authenticateToken, async (req, res) => {
  try {
    const { occasion, weather } = req.body;

    console.log('👔 Generating intelligent outfit recommendation...');
    console.log('   Occasion:', occasion);
    console.log('   Weather:', weather);

    // Get user profile
    db.get('SELECT gender, age, nationality, current_location, marital_status, occupation FROM users WHERE id = ?', [req.user.id], async (err, profile) => {
      if (err) {
        console.error('❌ Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log('👤 User profile:', profile);

      // Get all VALID clothing items for this user (exclude "Not Clothing" and similar)
      db.all(
        `SELECT * FROM wardrobe_items
         WHERE user_id = ?
         AND category NOT IN ('Not Clothing', 'Unknown', 'N/A')
         AND category IS NOT NULL`,
        [req.user.id],
        async (err, items) => {
        if (err) {
          console.error('❌ Database error:', err.message);
          return res.status(500).json({ error: err.message });
        }

        console.log(`📦 Found ${items.length} items in wardrobe`);

        if (items.length === 0) {
          return res.status(400).json({ error: 'Your wardrobe is empty! Upload some clothing items first 👗👔' });
        }

        // Create detailed list of items for AI with ID references
        const itemsListDetailed = items.map((item, idx) =>
          `[${idx + 1}] ${item.category} - ${item.color} (${item.description || 'No description'})`
        ).join('\n');

        // Build user context
        const userContext = [];
        if (profile.gender) userContext.push(`Gender: ${profile.gender}`);
        if (profile.age) userContext.push(`Age: ${profile.age}`);
        if (profile.nationality) userContext.push(`Nationality: ${profile.nationality}`);
        if (profile.current_location) userContext.push(`Location: ${profile.current_location}`);
        if (profile.marital_status) userContext.push(`Marital Status: ${profile.marital_status}`);
        if (profile.occupation) userContext.push(`Occupation: ${profile.occupation}`);

        const userContextString = userContext.length > 0 ? userContext.join('\n') : 'No profile information provided';

        // Enhanced intelligent prompt
        const prompt = `You are an expert AI fashion stylist with deep understanding of style, culture, and personal context.

USER PROFILE:
${userContextString}

AVAILABLE WARDROBE ITEMS:
${itemsListDetailed}

CONTEXT:
Weather: ${weather.temperature}°C, ${weather.condition}
Occasion: ${occasion}

TASK:
1. Analyze the user's profile (age, gender, occupation, culture, location) to understand their style needs
2. Consider the weather and occasion requirements
3. Select 3-5 items from the AVAILABLE WARDROBE that create a COMPLETE, wearable outfit
4. Identify ANY missing items that would complete or enhance this outfit (items NOT in their wardrobe)
5. Provide culturally sensitive and age-appropriate suggestions
6. Consider professional requirements if occupation is relevant

CRITICAL OUTFIT RULES:
- Create a COMPLETE, wearable outfit with UPPER body AND LOWER body items
- A complete outfit MUST include:
  * ONE upper body item (shirt, t-shirt, OR jacket - NOT multiple tops!)
  * ONE lower body item (pants, jeans, OR skirt - REQUIRED unless wearing a full-length dress)
  * Optional additions: shoes, accessories, belt, or an outer layer jacket
- DO NOT select multiple shirts or multiple tops (e.g., "Yellow Shirt + White Shirt" is WRONG!)
- DO NOT suggest only accessories without core clothing items
- DO NOT create incomplete outfits (e.g., "shirt + belt + sunglasses" is NOT acceptable!)
- If the wardrobe lacks PANTS/JEANS/SKIRT (lower body clothing), you MUST add them to missing_items as REQUIRED
- Jackets/Blazers can be layered OVER a shirt, but don't select multiple base layer tops

IMPORTANT:
- ONLY pick items from the numbered list above
- Reference items by their number [1], [2], etc.
- Be specific about what items to wear
- Suggest missing items that would complete the look
- Consider cultural dress codes if nationality/location provided
- Be mindful of professional dress codes for work occasions
- Keep explanation CONCISE (2-3 sentences max) - focus on key reasons only

Respond with valid JSON:
{
  "selected_items": [1, 2, 3],
  "explanation": "Brief 2-3 sentence explanation of why this outfit works for their profile and context",
  "missing_items": ["Item type 1", "Item type 2"],
  "missing_items_explanation": "Concise 1-2 sentence explanation of why these items are needed"
}`;

        console.log('🤖 Asking Gemini AI for intelligent recommendation...');

        let text;
        try {
          text = await callGeminiWithRetry(prompt);
          console.log('🤖 AI Response:', text);
        } catch (error) {
          console.error('❌ All API attempts failed:', error.message);
          return res.status(503).json({
            error: 'AI recommendation service is temporarily unavailable. Please try again in a few moments.',
            details: 'Our AI service is experiencing high demand right now.'
          });
        }

        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*?\}/);

        if (jsonMatch) {
          const recommendation = JSON.parse(jsonMatch[0]);

          console.log('✅ AI Recommendation:', recommendation);

          // Get selected items by index
          const selectedItems = [];
          if (recommendation.selected_items && Array.isArray(recommendation.selected_items)) {
            for (let idx of recommendation.selected_items) {
              const itemIndex = idx - 1; // Convert to 0-based index
              if (itemIndex >= 0 && itemIndex < items.length) {
                selectedItems.push(items[itemIndex]);
              }
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
            missing_items: recommendation.missing_items || [],
            missing_items_explanation: recommendation.missing_items_explanation || '',
            weather: weather,
            occasion: occasion,
            user_profile: profile
          });
        } else {
          console.error('⚠️ Could not parse AI response as JSON');
          res.status(500).json({ error: 'Could not generate recommendation' });
        }
      });
    });
  } catch (error) {
    console.error('❌ Recommendation error:', error.message);

    // Graceful error handling - don't crash the server
    if (error.message.includes('503') || error.message.includes('overloaded')) {
      return res.status(503).json({
        error: 'AI recommendation service is temporarily overloaded',
        details: 'Please try again in a few moments.'
      });
    }

    res.status(500).json({
      error: 'An error occurred while generating recommendations',
      details: error.message
    });
  }
});

// 5. Get weather data from Open-Meteo API (Free, no API key required!)
app.get('/api/weather', async (req, res) => {
  try {
    console.log('🌤️ Fetching weather data...');

    // Abu Dhabi coordinates
    const latitude = 24.4539;
    const longitude = 54.3773;

    // Open-Meteo API - completely free, no API key needed
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.current) {
      console.log('⚠️ Weather API error, using fallback data');
      return res.json({
        temperature: 25,
        condition: 'clear',
        source: 'fallback'
      });
    }

    // Map WMO weather codes to simple conditions
    const weatherCodeMap = {
      0: 'clear',
      1: 'clear', 2: 'partly_cloudy', 3: 'cloudy',
      45: 'foggy', 48: 'foggy',
      51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
      61: 'rain', 63: 'rain', 65: 'rain',
      71: 'snow', 73: 'snow', 75: 'snow',
      80: 'rain', 81: 'rain', 82: 'rain',
      95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm'
    };

    const weatherCode = data.current.weather_code;
    const condition = weatherCodeMap[weatherCode] || 'clear';

    const weatherData = {
      temperature: Math.round(data.current.temperature_2m),
      condition: condition,
      humidity: data.current.relative_humidity_2m,
      source: 'open-meteo',
      description: `Temperature: ${Math.round(data.current.temperature_2m)}°C, Humidity: ${data.current.relative_humidity_2m}%`
    };

    console.log('✅ Weather data:', weatherData);
    res.json(weatherData);
  } catch (error) {
    console.error('❌ Weather API error:', error.message);
    // Return fallback weather data
    res.json({
      temperature: 25,
      condition: 'clear',
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
  console.log('   GET    /api/weather          - Get current weather (Open-Meteo - Free!)');
  console.log('   GET    /api/health           - Health check');
  console.log('\n✅ Using free APIs:');
  console.log('   - 9 Gemini API keys with auto-retry');
  console.log('   - Open-Meteo weather (no API key needed)');
  console.log('\n🚀 Ready to accept requests!\n');
});

module.exports = app;
