import React, { useState } from 'react';
import axios from 'axios';

function Upload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData);
      setAiAnalysis(response.data.aiAnalysis);
      setMessage('✅ Item uploaded successfully!');

      setTimeout(() => {
        setSelectedFile(null);
        setPreview(null);
        setAiAnalysis(null);
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage('❌ Upload failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-box">
      <h1>Upload Clothing Item</h1>
      <p>✨ AI will automatically analyze your image</p>

      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          required
        />

        {preview && (
          <div className="preview">
            <img src={preview} alt="Preview" style={{maxWidth: '300px'}} />
          </div>
        )}

        {loading && <p>🤖 AI is analyzing...</p>}

        {aiAnalysis && (
          <div className="ai-result">
            <h3>✅ AI Analysis Complete!</h3>
            <p><strong>Category:</strong> {aiAnalysis.category}</p>
            <p><strong>Color:</strong> {aiAnalysis.color}</p>
            <p><strong>Description:</strong> {aiAnalysis.description}</p>
          </div>
        )}

        <button type="submit" disabled={!selectedFile || loading}>
          {loading ? 'Uploading...' : 'Upload Item'}
        </button>
      </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default Upload;
