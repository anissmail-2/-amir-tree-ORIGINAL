import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

function Upload() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [aiAnalyses, setAiAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);

    const filePreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(filePreviews);
    setAiAnalyses([]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setLoading(true);
    setMessage('');
    setAiAnalyses([]);

    try {
      const allAnalyses = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(`Uploading image ${i + 1} of ${selectedFiles.length}...`);

        const formData = new FormData();
        formData.append('image', selectedFiles[i]);

        const response = await axios.post(`${API_BASE_URL}/api/upload`, formData);
        allAnalyses.push({
          ...response.data.aiAnalysis,
          imagePath: response.data.imagePath
        });
      }

      setAiAnalyses(allAnalyses);
      setMessage(`✅ ${selectedFiles.length} item(s) uploaded successfully!`);


      setTimeout(() => {
        setSelectedFiles([]);
        setPreviews([]);
        setAiAnalyses([]);
        setMessage('');
        setUploadProgress('');
      }, 5000);
    } catch (error) {
      setMessage('❌ Upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="upload-box">
      <h1>Upload Clothing Items</h1>
      <p>✨ AI will automatically analyze your images (select multiple!)</p>

      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          multiple
          required
        />

        {previews.length > 0 && (
          <div className="preview-container" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '15px',
            marginTop: '20px'
          }}>
            {previews.map((preview, index) => (
              <div key={index} className="preview" style={{
                border: '2px solid #ddd',
                borderRadius: '8px',
                padding: '10px'
              }}>
                <img src={preview} alt={`Preview ${index + 1}`} style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '5px'
                }} />
                <p style={{fontSize: '12px', textAlign: 'center', marginTop: '5px'}}>
                  Image {index + 1}
                </p>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{marginTop: '15px'}}>
            <p>🤖 AI is analyzing...</p>
            {uploadProgress && <p style={{fontSize: '14px', color: '#666'}}>{uploadProgress}</p>}
          </div>
        )}

        {aiAnalyses.length > 0 && (
          <div className="ai-results-container" style={{marginTop: '20px'}}>
            <h3>✅ AI Analysis Complete!</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '15px',
              marginTop: '15px'
            }}>
              {aiAnalyses.map((analysis, index) => (
                <div key={index} className="ai-result" style={{
                  border: '2px solid #4CAF50',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#f9fff9'
                }}>
                  <h4 style={{marginTop: 0}}>Item {index + 1}</h4>
                  <p><strong>Category:</strong> {analysis.category}</p>
                  <p><strong>Color:</strong> {analysis.color}</p>
                  <p><strong>Description:</strong> {analysis.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="submit" disabled={selectedFiles.length === 0 || loading} style={{marginTop: '20px'}}>
          {loading ? 'Uploading...' : `Upload ${selectedFiles.length > 0 ? selectedFiles.length : ''} Item${selectedFiles.length !== 1 ? 's' : ''}`}
        </button>
      </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default Upload;
