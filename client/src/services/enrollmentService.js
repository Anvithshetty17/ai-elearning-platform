import { api } from './authService';

const enrollmentService = {
  // Enroll in a course
  enrollInCourse: async (courseId) => {
    const response = await api.post(`/enrollments/${courseId}`);
    return response.data;
  },

  // Get my enrollments
  getMyEnrollments: async (params = {}) => {
    const response = await api.get('/enrollments/my-enrollments', { params });
    return response.data;
  },

  // Get enrollment details
  getEnrollment: async (enrollmentId) => {
    const response = await api.get(`/enrollments/${enrollmentId}`);
    return response.data;
  },

  // Update learning progress
  updateProgress: async (enrollmentId, progressData) => {
    const response = await api.put(`/enrollments/${enrollmentId}/progress`, progressData);
    return response.data;
  },

  // Rate and review course
  rateCourse: async (enrollmentId, ratingData) => {
    const response = await api.post(`/enrollments/${enrollmentId}/rating`, ratingData);
    return response.data;
  },

  // Cancel enrollment
  cancelEnrollment: async (enrollmentId) => {
    const response = await api.delete(`/enrollments/${enrollmentId}`);
    return response.data;
  },

  // Get course enrollments (professor only)
  getCourseEnrollments: async (courseId, params = {}) => {
    const response = await api.get(`/enrollments/course/${courseId}`, { params });
    return response.data;
  }
};

export default enrollmentService;