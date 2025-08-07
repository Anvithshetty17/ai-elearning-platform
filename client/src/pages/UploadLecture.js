import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useDropzone } from 'react-dropzone';
import { 
  FiUpload, 
  FiFile, 
  FiX, 
  FiPlay, 
  FiSettings,
  FiArrowLeft,
  FiSave
} from 'react-icons/fi';

import courseService from '../services/courseService';
import lectureService from '../services/lectureService';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import './UploadLecture.css';

const UploadLecture = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      contentType: 'ai-generated',
      voiceSettings: {
        voice: 'female',
        language: 'en',
        speed: 1.0
      }
    }
  });

  const contentType = watch('contentType');

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await courseService.getCourse(courseId);
        setCourse(response.data);
      } catch (error) {
        toast.error('Failed to load course');
        navigate('/my-courses');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId, navigate]);

  // File drop zone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        toast.error('Please upload only TXT or PDF files under 10MB');
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setUploadedFile(file);
        
        // Read file content for preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          setValue('textContent', content.substring(0, 1000) + (content.length > 1000 ? '...' : ''));
        };
        reader.readAsText(file);
      }
    }
  });

  const removeFile = () => {
    setUploadedFile(null);
    setValue('textContent', '');
  };

  const onSubmit = async (data) => {
    if (!data.textContent && !uploadedFile) {
      toast.error('Please provide text content or upload a file');
      return;
    }

    setSubmitting(true);
    
    try {
      const formData = {
        ...data,
        courseId,
        textFile: uploadedFile
      };

      const response = await lectureService.createLecture(formData);
      
      toast.success('Lecture created successfully!');
      
      if (data.contentType === 'ai-generated') {
        toast.info('AI processing started. You can monitor progress in the course lectures.');
      }
      
      navigate(`/edit-course/${courseId}`);
    } catch (error) {
      console.error('Create lecture error:', error);
      const message = error.response?.data?.message || 'Failed to create lecture';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading course..." />;
  }

  if (!course) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2>Course not found</h2>
          <Link to="/my-courses" className="btn btn--primary mt-4">
            Back to My Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-lecture">
      <div className="container">
        <div className="upload-lecture-header">
          <Link 
            to={`/edit-course/${courseId}`} 
            className="back-link"
          >
            <FiArrowLeft /> Back to Course
          </Link>
          <div>
            <h1>Add New Lecture</h1>
            <p className="course-info">
              Adding to: <strong>{course.title}</strong>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="lecture-form">
          <div className="form-grid">
            {/* Basic Information */}
            <div className="form-section">
              <h2>Lecture Information</h2>
              
              <div className="form-group">
                <label className="form-label">
                  Lecture Title *
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.title ? 'form-input--error' : ''}`}
                  placeholder="Enter lecture title"
                  {...register('title', { 
                    required: 'Title is required',
                    minLength: { value: 3, message: 'Title must be at least 3 characters' }
                  })}
                />
                {errors.title && (
                  <span className="form-error">{errors.title.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Description
                </label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Brief description of the lecture content"
                  {...register('description')}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Lecture Order *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className={`form-input ${errors.order ? 'form-input--error' : ''}`}
                    placeholder="1"
                    {...register('order', { 
                      required: 'Order is required',
                      min: { value: 1, message: 'Order must be at least 1' }
                    })}
                  />
                  {errors.order && (
                    <span className="form-error">{errors.order.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Content Type *
                  </label>
                  <select
                    className="form-select"
                    {...register('contentType')}
                  >
                    <option value="ai-generated">AI-Generated Video</option>
                    <option value="text">Text Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Upload */}
            <div className="form-section">
              <h2>Content</h2>
              
              {/* File Upload */}
              <div className="file-upload-section">
                <h3>Upload Text File (Optional)</h3>
                <div
                  {...getRootProps()}
                  className={`file-dropzone ${isDragActive ? 'dropzone--active' : ''}`}
                >
                  <input {...getInputProps()} />
                  {uploadedFile ? (
                    <div className="uploaded-file">
                      <div className="file-info">
                        <FiFile className="file-icon" />
                        <div className="file-details">
                          <span className="file-name">{uploadedFile.name}</span>
                          <span className="file-size">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                        className="remove-file"
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <div className="dropzone-content">
                      <FiUpload className="upload-icon" />
                      <p>
                        {isDragActive
                          ? 'Drop the file here...'
                          : 'Drag & drop a text file here, or click to select'
                        }
                      </p>
                      <span className="upload-hint">
                        Supports: TXT, PDF (Max: 10MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Text Content */}
              <div className="form-group">
                <label className="form-label">
                  Text Content *
                </label>
                <textarea
                  className={`form-textarea content-textarea ${errors.textContent ? 'form-input--error' : ''}`}
                  rows="10"
                  placeholder="Enter your lecture content here..."
                  {...register('textContent', { 
                    required: uploadedFile ? false : 'Text content is required',
                    maxLength: { value: 10000, message: 'Content cannot exceed 10,000 characters' }
                  })}
                />
                {errors.textContent && (
                  <span className="form-error">{errors.textContent.message}</span>
                )}
                <span className="character-count">
                  {watch('textContent')?.length || 0}/10,000 characters
                </span>
              </div>
            </div>

            {/* AI Voice Settings (only for AI-generated content) */}
            {contentType === 'ai-generated' && (
              <div className="form-section">
                <div className="section-header">
                  <h2>AI Voice Settings</h2>
                  <button
                    type="button"
                    onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                    className="btn btn--outline btn--small"
                  >
                    <FiSettings /> {showVoiceSettings ? 'Hide' : 'Show'} Settings
                  </button>
                </div>

                {showVoiceSettings && (
                  <div className="voice-settings">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Voice Type</label>
                        <select
                          className="form-select"
                          {...register('voiceSettings.voice')}
                        >
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Language</label>
                        <select
                          className="form-select"
                          {...register('voiceSettings.language')}
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="it">Italian</option>
                          <option value="pt">Portuguese</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Speech Speed: {watch('voiceSettings.speed') || 1.0}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        className="range-input"
                        {...register('voiceSettings.speed')}
                      />
                      <div className="range-labels">
                        <span>Slow (0.5x)</span>
                        <span>Normal (1.0x)</span>
                        <span>Fast (2.0x)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <Link 
              to={`/edit-course/${courseId}`} 
              className="btn btn--outline"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn--primary"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="small" />
                  Creating Lecture...
                </>
              ) : (
                <>
                  <FiSave /> Create Lecture
                </>
              )}
            </button>
          </div>

          {contentType === 'ai-generated' && (
            <div className="ai-info">
              <div className="info-card">
                <FiPlay className="info-icon" />
                <div>
                  <h4>AI Video Generation</h4>
                  <p>
                    Your text will be processed to create a professional video lecture with AI voice narration. 
                    This process typically takes 2-5 minutes depending on content length.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default UploadLecture;