import { api } from './authService';

const courseService = {
  // Get all courses
  getCourses: async (params = {}) => {
    const response = await api.get('/courses', { params });
    return response.data;
  },

  // Get single course
  getCourse: async (id) => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },

  // Create new course
  createCourse: async (courseData) => {
    const response = await api.post('/courses', courseData);
    return response.data;
  },

  // Update course
  updateCourse: async (id, courseData) => {
    const response = await api.put(`/courses/${id}`, courseData);
    return response.data;
  },

  // Delete course
  deleteCourse: async (id) => {
    const response = await api.delete(`/courses/${id}`);
    return response.data;
  },

  // Publish/unpublish course
  publishCourse: async (id, isPublished) => {
    const response = await api.put(`/courses/${id}/publish`, { isPublished });
    return response.data;
  },

  // Get my courses (professor only)
  getMyCourses: async () => {
    const response = await api.get('/courses/my-courses');
    return response.data;
  },

  // Get course statistics
  getCourseStats: async (id) => {
    const response = await api.get(`/courses/${id}/stats`);
    return response.data;
  }
};

export default courseService;