import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

function Recommend() {
  const [occasion, setOccasion] = useState('Casual');
  const [weather, setWeather] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/weather`);
      setWeather(response.data);
    } catch (error) {
      console.error('Weather error:', error);
      setWeather({ temperature: 25, condition: 'sunny' });
    }
  };

  const generateOutfit = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/recommend`, {
        occasion,
        weather
      });
      setRecommendation(response.data);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      alert('Recommendation failed: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>AI Outfit Recommendation</h1>

      {weather && (
        <div className="weather-info">
          <h3>📍 Current Weather (Abu Dhabi)</h3>
          <p>Temperature: {weather.temperature}°C</p>
          <p>Condition: {weather.condition}</p>
        </div>
      )}

      <div>
        <label>Occasion:</label>
        <select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
          <option value="Casual">Casual</option>
          <option value="Formal">Formal</option>
          <option value="Business">Business</option>
          <option value="Party">Party</option>
          <option value="Sports">Sports</option>
        </select>
      </div>

      <button onClick={generateOutfit} disabled={loading || !weather}>
        {loading ? '🤖 AI is thinking...' : '🤖 Generate AI Outfit'}
      </button>

      {recommendation && (
        <div className="outfit-result">
          <h2>✨ Your AI-Recommended Outfit</h2>

          <div className="outfit-items">
            {recommendation.items.map(item => (
              <div key={item.id} className="outfit-item">
                <img
                  src={`${API_BASE_URL}/${item.image_path}`}
                  alt={item.category}
                />
                <p><strong>{item.category}</strong></p>
                <p>{item.color}</p>
              </div>
            ))}
          </div>

          <div className="ai-explanation">
            <h3>🤖 AI Stylist Explanation:</h3>
            <p>{recommendation.explanation}</p>
            <p style={{fontSize: '12px', color: '#666'}}>
              Powered by Gemini 2.0 Flash + OpenWeatherMap API
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recommend;
