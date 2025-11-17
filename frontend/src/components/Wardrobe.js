import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Wardrobe() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWardrobe();
  }, []);

  const loadWardrobe = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/wardrobe');
      setItems(response.data);
    } catch (error) {
      console.error('Error loading wardrobe:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this item?')) {
      try {
        await axios.delete(`http://localhost:5000/api/wardrobe/${id}`);
        loadWardrobe();
      } catch (error) {
        alert('Delete failed: ' + error.message);
      }
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>My Wardrobe</h1>

      {items.length === 0 ? (
        <p>Your wardrobe is empty. Upload your first item!</p>
      ) : (
        <div className="items-grid">
          {items.map(item => (
            <div key={item.id} className="item-card">
              <img
                src={`http://localhost:5000/${item.image_path}`}
                alt={item.category}
              />
              <div className="item-info">
                <h3>{item.category}</h3>
                <p><strong>Color:</strong> {item.color}</p>
                <p>{item.description}</p>
                <button onClick={() => handleDelete(item.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sustainability">
        <h3>♻️ Sustainability Metrics</h3>
        <p>Total Items: {items.length}</p>
        <p>Keep using what you have! 🌱</p>
      </div>
    </div>
  );
}

export default Wardrobe;
