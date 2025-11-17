import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

function Profile() {
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    gender: '',
    age: '',
    nationality: '',
    current_location: '',
    marital_status: '',
    occupation: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/profile`);
      setProfile(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setMessage('Error loading profile');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await axios.put(`${API_BASE_URL}/api/profile`, {
        gender: profile.gender,
        age: profile.age ? parseInt(profile.age) : null,
        nationality: profile.nationality,
        current_location: profile.current_location,
        marital_status: profile.marital_status,
        occupation: profile.occupation
      });

      setMessage('Profile updated successfully!');
      setSaving(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <h2>My Profile</h2>

      <div className="profile-info">
        <p><strong>Username:</strong> {profile.username}</p>
        <p><strong>Email:</strong> {profile.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        <h3>Personal Information</h3>
        <p className="profile-subtitle">Help us give you better, more personalized outfit recommendations!</p>

        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            name="gender"
            value={profile.gender || ''}
            onChange={handleChange}
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="age">Age</label>
          <input
            type="number"
            id="age"
            name="age"
            min="13"
            max="120"
            value={profile.age || ''}
            onChange={handleChange}
            placeholder="Enter your age"
          />
        </div>

        <div className="form-group">
          <label htmlFor="nationality">Nationality</label>
          <input
            type="text"
            id="nationality"
            name="nationality"
            value={profile.nationality || ''}
            onChange={handleChange}
            placeholder="e.g., American, Emirati, Indian"
          />
        </div>

        <div className="form-group">
          <label htmlFor="current_location">Current Location</label>
          <input
            type="text"
            id="current_location"
            name="current_location"
            value={profile.current_location || ''}
            onChange={handleChange}
            placeholder="e.g., Abu Dhabi, Dubai"
          />
        </div>

        <div className="form-group">
          <label htmlFor="marital_status">Marital Status</label>
          <select
            id="marital_status"
            name="marital_status"
            value={profile.marital_status || ''}
            onChange={handleChange}
          >
            <option value="">Select...</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="occupation">Occupation</label>
          <select
            id="occupation"
            name="occupation"
            value={profile.occupation || ''}
            onChange={handleChange}
          >
            <option value="">Select...</option>
            <option value="Student">Student</option>
            <option value="Full-time Employed">Full-time Employed</option>
            <option value="Part-time Employed">Part-time Employed</option>
            <option value="Self-employed">Self-employed</option>
            <option value="Unemployed">Unemployed</option>
            <option value="Retired">Retired</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        <button type="submit" disabled={saving} className="save-button">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </form>

      <div className="profile-benefits">
        <h4>Why provide this information?</h4>
        <ul>
          <li>Get outfit recommendations suited to your age and style</li>
          <li>Receive culturally appropriate clothing suggestions</li>
          <li>Get work-appropriate outfits based on your occupation</li>
          <li>Weather-aware suggestions for your location</li>
          <li>More personalized and relevant fashion advice</li>
        </ul>
      </div>
    </div>
  );
}

export default Profile;
