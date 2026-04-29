import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    console.error('API Error:', errorMessage);
    return Promise.reject(errorMessage);
  }
);

// Attach current session employee id to every request so backend can enforce visibility
api.interceptors.request.use(
  (config) => {
    try {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const empId = user.userName || user.employeeId || user.employee_id;
        if (empId) {
          config.headers['x-employee-id'] = empId;
        }
      }
    } catch (err) {
      // ignore
    }
    return config;
  },
  (err) => Promise.reject(err)
);

const calendarService = {
  getCurrentUser: () => {
    try {
      const userStr = sessionStorage.getItem('user');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      return {
        employeeId: user.userName,
        employeeName: user.employeeName,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  getAllEmployees: async () => {
    try {
      const response = await api.get('/calendar/employees');
      return response.data.data || [];
    } catch (error) {
      throw error;
    }
  },

  getDesignations: async () => {
    try {
      const response = await api.get('/calendar/designations');
      return response.data.data || [];
    } catch (error) {
      throw error;
    }
  },

  getAllEvents: async () => {
    try {
      console.debug('calendarService: getAllEvents -> GET /calendar');
      const response = await api.get('/calendar');
      return response.data || [];
    } catch (error) {
      throw error;
    }
  },

  getEventById: async (id) => {
    try {
      const response = await api.get(`/calendar/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getEventsByDate: async (date) => {
    try {
      if (!date) {
        console.error('calendarService.getEventsByDate called without date');
        throw new Error('Missing date parameter when calling getEventsByDate');
      }
      console.debug('calendarService: getEventsByDate', date);
      const response = await api.get(`/calendar/date/${date}`);
      return response.data || [];
    } catch (error) {
      throw error;
    }
  },

  getEventsByRange: async (startDate, endDate) => {
    try {
      if (!startDate || !endDate) {
        console.error('calendarService.getEventsByRange called without startDate or endDate', startDate, endDate);
        throw new Error('Missing startDate or endDate when calling getEventsByRange');
      }
      console.debug('calendarService: getEventsByRange', startDate, endDate);
      const response = await api.get('/calendar/range', {
        params: { startDate, endDate }
      });
      return response.data || [];
    } catch (error) {
      throw error;
    }
  },

  getEventsByEmployee: async (employeeId) => {
    try {
      const response = await api.get(`/calendar/employee/${employeeId}`);
      return response.data || [];
    } catch (error) {
      throw error;
    }
  },

  getMyEvents: async () => {
    try {
      const user = calendarService.getCurrentUser();
      if (!user) {
        throw new Error('User not logged in');
      }
      
      const response = await api.get(`/calendar/employee/${user.employeeId}`);
      return response.data || [];
    } catch (error) {
      throw error;
    }
  },

  getEventsByType: async (eventType) => {
    try {
      const response = await api.get(`/calendar/type/${eventType}`);
      return response.data || [];
    } catch (error) {
      throw error;
    }
  },

  createEvent: async (eventData) => {
    try {
      const user = calendarService.getCurrentUser();
      if (!user) {
        throw new Error('User not logged in');
      }

      const payload = {
        ...eventData,
        employeeID: user.employeeId,
      };

      const response = await api.post('/calendar', payload);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  updateEvent: async (id, eventData) => {
    try {
      const response = await api.put(`/calendar/${id}`, eventData);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  deleteEvent: async (id) => {
    try {
      const response = await api.delete(`/calendar/${id}`);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  getCurrentWeekEvents: async () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return calendarService.getEventsByRange(
      formatDate(startOfWeek),
      formatDate(endOfWeek)
    );
  },

  getCurrentMonthEvents: async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return calendarService.getEventsByRange(
      formatDate(startOfMonth),
      formatDate(endOfMonth)
    );
  },

  healthCheck: async () => {
    try {
      const response = await api.get('/calendar/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default calendarService;
