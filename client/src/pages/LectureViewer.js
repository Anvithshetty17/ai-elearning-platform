import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const LectureViewer = () => {
  const { id } = useParams();
  const [lectures, setLectures] = useState([]);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Load lectures from localStorage
    const savedLectures = JSON.parse(localStorage.getItem('lectures') || '[]');
    setLectures(savedLectures);

    // If ID is provided, select that lecture
    if (id) {
      const lecture = savedLectures.find(l => l.id.toString() === id);
      if (lecture) {
        setSelectedLecture(lecture);
        // Simulate video processing completion for demo
        if (lecture.status === 'processing') {
          simulateVideoGeneration(lecture);
        }
      }
    } else if (savedLectures.length > 0) {
      setSelectedLecture(savedLectures[0]);
      if (savedLectures[0].status === 'processing') {
        simulateVideoGeneration(savedLectures[0]);
      }
    }
  }, [id]);

  const simulateVideoGeneration = async (lecture) => {
    setIsProcessing(true);
    
    // Simulate AI video generation process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const updatedLecture = {
      ...lecture,
      status: 'completed',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', // Sample video for demo
      generatedAt: new Date().toISOString()
    };

    // Update localStorage
    const allLectures = JSON.parse(localStorage.getItem('lectures') || '[]');
    const updatedLectures = allLectures.map(l => 
      l.id === lecture.id ? updatedLecture : l
    );
    localStorage.setItem('lectures', JSON.stringify(updatedLectures));
    
    setSelectedLecture(updatedLecture);
    setLectures(updatedLectures);
    setIsProcessing(false);
  };

  const handleLectureSelect = (lecture) => {
    setSelectedLecture(lecture);
    if (lecture.status === 'processing') {
      simulateVideoGeneration(lecture);
    }
  };

  if (lectures.length === 0) {
    return (
      <div className="card">
        <h1>Lecture Viewer</h1>
        <p>No lectures found. <a href="/">Create your first lecture</a> to get started!</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Lecture Viewer</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Lecture List */}
        <div className="card">
          <h2>Available Lectures</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {lectures.map((lecture) => (
              <div
                key={lecture.id}
                className={`lecture-item ${selectedLecture?.id === lecture.id ? 'selected' : ''}`}
                onClick={() => handleLectureSelect(lecture)}
                style={{
                  cursor: 'pointer',
                  margin: '10px 0',
                  border: selectedLecture?.id === lecture.id ? '2px solid #3498db' : '1px solid #ecf0f1'
                }}
              >
                <h3>{lecture.title}</h3>
                <p><strong>Subject:</strong> {lecture.subject || 'General'}</p>
                <p><strong>Duration:</strong> {lecture.duration} minutes</p>
                <p><strong>Status:</strong> 
                  <span style={{ 
                    color: lecture.status === 'completed' ? '#27ae60' : '#f39c12',
                    fontWeight: 'bold',
                    marginLeft: '5px'
                  }}>
                    {lecture.status === 'completed' ? 'Ready' : 'Processing'}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Video Player */}
        <div className="card">
          {selectedLecture ? (
            <>
              <h2>{selectedLecture.title}</h2>
              <div className="video-container">
                {isProcessing || selectedLecture.status === 'processing' ? (
                  <div className="video-placeholder">
                    <div>
                      <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                      <p>Generating AI video lecture...</p>
                      <p style={{ fontSize: '14px', opacity: 0.8 }}>
                        Our AI is analyzing your content and creating an engaging video with narration and visuals.
                      </p>
                    </div>
                  </div>
                ) : selectedLecture.videoUrl ? (
                  <video controls>
                    <source src={selectedLecture.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="video-placeholder">
                    <p>Video generation in progress...</p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px' }}>
                <h3>Lecture Details</h3>
                <p><strong>Subject:</strong> {selectedLecture.subject || 'General'}</p>
                <p><strong>Duration:</strong> {selectedLecture.duration} minutes</p>
                <p><strong>Created:</strong> {new Date(selectedLecture.createdAt).toLocaleString()}</p>
                {selectedLecture.generatedAt && (
                  <p><strong>Generated:</strong> {new Date(selectedLecture.generatedAt).toLocaleString()}</p>
                )}
                
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                  <h4>Original Content:</h4>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6' }}>
                    {selectedLecture.content}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="video-placeholder">
              <p>Select a lecture to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LectureViewer;