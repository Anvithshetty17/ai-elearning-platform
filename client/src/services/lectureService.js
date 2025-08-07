import { api } from './authService';

const lectureService = {
  // Get lectures for a course
  getCourseLectures: async (courseId) => {
    const response = await api.get(`/lectures/course/${courseId}`);
    return response.data;
  },

  // Get single lecture
  getLecture: async (id) => {
    const response = await api.get(`/lectures/${id}`);
    return response.data;
  },

  // Create new lecture
  createLecture: async (lectureData) => {
    const formData = new FormData();
    
    // Append text fields
    Object.keys(lectureData).forEach(key => {
      if (key !== 'textFile' && lectureData[key] !== undefined && lectureData[key] !== null) {
        if (typeof lectureData[key] === 'object') {
          formData.append(key, JSON.stringify(lectureData[key]));
        } else {
          formData.append(key, lectureData[key]);
        }
      }
    });

    // Append file if exists
    if (lectureData.textFile) {
      formData.append('textFile', lectureData.textFile);
    }

    const response = await api.post('/lectures', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },

  // Update lecture
  updateLecture: async (id, lectureData) => {
    const formData = new FormData();
    
    // Append text fields
    Object.keys(lectureData).forEach(key => {
      if (key !== 'textFile' && lectureData[key] !== undefined && lectureData[key] !== null) {
        if (typeof lectureData[key] === 'object') {
          formData.append(key, JSON.stringify(lectureData[key]));
        } else {
          formData.append(key, lectureData[key]);
        }
      }
    });

    // Append file if exists
    if (lectureData.textFile) {
      formData.append('textFile', lectureData.textFile);
    }

    const response = await api.put(`/lectures/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },

  // Delete lecture
  deleteLecture: async (id) => {
    const response = await api.delete(`/lectures/${id}`);
    return response.data;
  },

  // Publish/unpublish lecture
  publishLecture: async (id, isPublished) => {
    const response = await api.put(`/lectures/${id}/publish`, { isPublished });
    return response.data;
  },

  // Get processing status
  getProcessingStatus: async (id) => {
    const response = await api.get(`/lectures/${id}/processing-status`);
    return response.data;
  },

  // Reprocess lecture
  reprocessLecture: async (id) => {
    const response = await api.post(`/lectures/${id}/reprocess`);
    return response.data;
  }
};

export default lectureService;