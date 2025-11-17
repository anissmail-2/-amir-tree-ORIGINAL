import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';

function Upload() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [aiAnalyses, setAiAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const resultsRef = useRef(null);

  // Scroll to results when AI analysis completes
  useEffect(() => {
    if (aiAnalyses.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [aiAnalyses]);

  const handleFileSelect = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    const files = Array.from(e.target.files);

    if (files.length === 0) return; // No files selected

    setSelectedFiles(files);

    const filePreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(filePreviews);
    setAiAnalyses([]);
    setMessage(''); // Clear any previous messages
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Ensure we have files to upload
    if (selectedFiles.length === 0) {
      setMessage('⚠️ Please select at least one image first');
      return;
    }

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

      // Clear the file input after successful upload to prevent re-uploading
      const fileInput = document.getElementById('file-input');
      if (fileInput) {
        fileInput.value = '';
      }

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

      <form onSubmit={handleUpload} autoComplete="off">
        <div className="file-input-wrapper">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            multiple
            id="file-input"
          />
          <label htmlFor="file-input" style={{display: 'block', marginBottom: '10px', color: '#666'}}>
            Choose images from your device
          </label>
        </div>

        {previews.length > 0 && !loading && aiAnalyses.length === 0 && (
          <div>
            <p style={{
              backgroundColor: '#fff3cd',
              color: '#856404',
              padding: '10px',
              borderRadius: '5px',
              marginTop: '15px',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              ⚠️ Images selected but NOT uploaded yet! Click the button below to upload.
            </p>
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
          </div>
        )}

        {loading && (
          <div style={{marginTop: '15px'}}>
            <p>🤖 AI is analyzing...</p>
            {uploadProgress && <p style={{fontSize: '14px', color: '#666'}}>{uploadProgress}</p>}
          </div>
        )}

        {aiAnalyses.length > 0 && (
          <div ref={resultsRef} className="ai-results-container" style={{marginTop: '20px', paddingTop: '10px'}}>
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
            <div style={{marginTop: '20px', textAlign: 'center'}}>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setPreviews([]);
                  setAiAnalyses([]);
                  setMessage('');
                  document.querySelector('input[type="file"]').value = '';
                }}
                style={{
                  backgroundColor: '#2196F3',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                📤 Upload More Items
              </button>
            </div>
          </div>
        )}

        {previews.length > 0 && aiAnalyses.length === 0 && (
          <button
            type="submit"
            disabled={selectedFiles.length === 0 || loading}
            style={{
              marginTop: '20px',
              backgroundColor: loading ? '#ccc' : '#4CAF50',
              color: 'white',
              padding: '15px 30px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              transition: 'all 0.3s'
            }}
          >
            {loading ? '⏳ Uploading & Analyzing...' : `🚀 Upload ${selectedFiles.length} Item${selectedFiles.length !== 1 ? 's' : ''} to Wardrobe`}
          </button>
        )}
      </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default Upload;
