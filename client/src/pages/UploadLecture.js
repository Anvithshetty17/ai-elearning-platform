import React, { useState } from 'react';
import axios from 'axios';

const UploadLecture = () => {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: '',
    duration: '5'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Mock API call - in production this would call your backend
      const response = await new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: {
              id: Date.now(),
              ...formData,
              status: 'processing',
              videoUrl: null,
              createdAt: new Date().toISOString()
            }
          });
        }, 2000);
      });

      // Save to localStorage for demo purposes
      const existingLectures = JSON.parse(localStorage.getItem('lectures') || '[]');
      existingLectures.push(response.data);
      localStorage.setItem('lectures', JSON.stringify(existingLectures));

      setMessage({
        type: 'success',
        text: 'Lecture uploaded successfully! AI video generation is processing...'
      });

      // Reset form
      setFormData({
        title: '',
        subject: '',
        content: '',
        duration: '5'
      });

    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to upload lecture. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h1>Create AI Video Lecture</h1>
      <p>Transform your text content into an engaging AI-generated video lecture</p>
      
      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Lecture Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="Enter lecture title..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="subject">Subject</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            placeholder="e.g., Mathematics, Physics, Computer Science..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="duration">Estimated Video Duration (minutes)</label>
          <select
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
          >
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="15">15 minutes</option>
            <option value="20">20 minutes</option>
            <option value="30">30 minutes</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="content">Lecture Content *</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            required
            placeholder="Enter your lecture content here. This text will be converted into an AI-generated video with narration and visual elements..."
            rows="10"
          />
          <small style={{ color: '#7f8c8d', fontSize: '14px' }}>
            Tip: Write clear, structured content with headings and key points for best results.
          </small>
        </div>

        <button 
          type="submit" 
          className="btn" 
          disabled={isLoading || !formData.title || !formData.content}
        >
          {isLoading ? (
            <span className="loading">
              <div className="spinner"></div>
              Processing Lecture...
            </span>
          ) : (
            'Generate AI Video Lecture'
          )}
        </button>
      </form>

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#ecf0f1', borderRadius: '5px' }}>
        <h3>How it works:</h3>
        <ol>
          <li><strong>Input Content:</strong> Provide your lecture text with clear structure</li>
          <li><strong>AI Processing:</strong> Our AI analyzes and generates video content</li>
          <li><strong>Video Creation:</strong> Text is converted to speech with visual elements</li>
          <li><strong>Ready to Share:</strong> Your lecture is ready for students to view</li>
        </ol>
      </div>
    </div>
  );
};

export default UploadLecture;