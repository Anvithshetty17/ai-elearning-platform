import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CourseManager = () => {
  const [lectures, setLectures] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', description: '' });
  const navigate = useNavigate();

  useEffect(() => {
    // Load lectures and courses from localStorage
    const savedLectures = JSON.parse(localStorage.getItem('lectures') || '[]');
    const savedCourses = JSON.parse(localStorage.getItem('courses') || '[]');
    
    setLectures(savedLectures);
    setCourses(savedCourses);
  }, []);

  const createCourse = () => {
    if (!newCourse.name.trim()) return;

    const course = {
      id: Date.now(),
      name: newCourse.name,
      description: newCourse.description,
      createdAt: new Date().toISOString(),
      lectureIds: []
    };

    const updatedCourses = [...courses, course];
    setCourses(updatedCourses);
    localStorage.setItem('courses', JSON.stringify(updatedCourses));
    
    setNewCourse({ name: '', description: '' });
    setShowCreateCourse(false);
  };

  const deleteLecture = (lectureId) => {
    if (!window.confirm('Are you sure you want to delete this lecture?')) return;

    const updatedLectures = lectures.filter(l => l.id !== lectureId);
    setLectures(updatedLectures);
    localStorage.setItem('lectures', JSON.stringify(updatedLectures));

    // Remove from any courses
    const updatedCourses = courses.map(course => ({
      ...course,
      lectureIds: course.lectureIds.filter(id => id !== lectureId)
    }));
    setCourses(updatedCourses);
    localStorage.setItem('courses', JSON.stringify(updatedCourses));
  };

  const assignToCourse = (lectureId, courseId) => {
    if (courseId === '') return;

    const updatedCourses = courses.map(course => {
      if (course.id.toString() === courseId) {
        return {
          ...course,
          lectureIds: [...new Set([...course.lectureIds, lectureId])]
        };
      }
      return course;
    });

    setCourses(updatedCourses);
    localStorage.setItem('courses', JSON.stringify(updatedCourses));
  };

  const getFilteredLectures = () => {
    if (selectedCourse === 'all') return lectures;
    
    const course = courses.find(c => c.id.toString() === selectedCourse);
    if (!course) return lectures;
    
    return lectures.filter(l => course.lectureIds.includes(l.id));
  };

  const getLectureStats = () => {
    const total = lectures.length;
    const completed = lectures.filter(l => l.status === 'completed').length;
    const processing = lectures.filter(l => l.status === 'processing').length;
    
    return { total, completed, processing };
  };

  const stats = getLectureStats();
  const filteredLectures = getFilteredLectures();

  return (
    <div>
      <h1>Course Manager</h1>
      
      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ color: '#3498db', margin: '0 0 10px 0', fontSize: '2.5rem' }}>{stats.total}</h2>
          <p>Total Lectures</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ color: '#27ae60', margin: '0 0 10px 0', fontSize: '2.5rem' }}>{stats.completed}</h2>
          <p>Ready to View</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ color: '#f39c12', margin: '0 0 10px 0', fontSize: '2.5rem' }}>{stats.processing}</h2>
          <p>Processing</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ color: '#9b59b6', margin: '0 0 10px 0', fontSize: '2.5rem' }}>{courses.length}</h2>
          <p>Courses</p>
        </div>
      </div>

      {/* Course Management */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Manage Courses</h2>
          <button 
            className="btn" 
            onClick={() => setShowCreateCourse(!showCreateCourse)}
          >
            {showCreateCourse ? 'Cancel' : 'Create Course'}
          </button>
        </div>

        {showCreateCourse && (
          <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <div className="form-group">
              <label>Course Name</label>
              <input
                type="text"
                value={newCourse.name}
                onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                placeholder="Enter course name..."
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newCourse.description}
                onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                placeholder="Course description..."
                rows="3"
              />
            </div>
            <button className="btn" onClick={createCourse}>Create Course</button>
          </div>
        )}

        {/* Course Filter */}
        <div className="form-group">
          <label>Filter by Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="all">All Lectures</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name} ({course.lectureIds.length} lectures)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lectures List */}
      <div className="card">
        <h2>
          {selectedCourse === 'all' ? 'All Lectures' : 
           `${courses.find(c => c.id.toString() === selectedCourse)?.name || 'Unknown Course'} Lectures`}
        </h2>
        
        {filteredLectures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            <p>No lectures found.</p>
            <button className="btn" onClick={() => navigate('/')}>
              Create Your First Lecture
            </button>
          </div>
        ) : (
          <div className="lecture-grid">
            {filteredLectures.map((lecture) => (
              <div key={lecture.id} className="lecture-item">
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
                <p><strong>Created:</strong> {new Date(lecture.createdAt).toLocaleDateString()}</p>
                
                <div style={{ marginTop: '15px' }}>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <select
                      onChange={(e) => assignToCourse(lecture.id, e.target.value)}
                      defaultValue=""
                      style={{ fontSize: '14px', padding: '5px' }}
                    >
                      <option value="">Assign to course...</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn" 
                      style={{ padding: '8px 15px', fontSize: '14px' }}
                      onClick={() => navigate(`/viewer/${lecture.id}`)}
                    >
                      View
                    </button>
                    <button 
                      className="btn" 
                      style={{ 
                        padding: '8px 15px', 
                        fontSize: '14px',
                        backgroundColor: '#e74c3c'
                      }}
                      onClick={() => deleteLecture(lecture.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Course Details */}
      {courses.length > 0 && (
        <div className="card">
          <h2>Course Overview</h2>
          {courses.map(course => (
            <div key={course.id} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
              <h3>{course.name}</h3>
              {course.description && <p>{course.description}</p>}
              <p><strong>Lectures:</strong> {course.lectureIds.length}</p>
              <p><strong>Created:</strong> {new Date(course.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseManager;