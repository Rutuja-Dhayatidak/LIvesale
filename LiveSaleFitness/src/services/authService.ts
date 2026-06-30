import Api, { setAuthToken } from './Api';

export const authService = {
  // Example login call
  login: async (email: string, password: string) => {
    try {
      const response = await Api.post('/auth/login', { email, password });
      const token = response.data?.data?.token || response.data?.token;
      if (token) {
        setAuthToken(token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Example register call
  register: async (userData: any) => {
    try {
      const isFormData = userData instanceof FormData;
      const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};
      const response = await Api.post('/auth/register', userData, { headers });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Send OTP call
  sendOtp: async (email: string) => {
    try {
      const response = await Api.post('/auth/send-otp', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify OTP call
  verifyOtp: async (email: string, otp: string) => {
    try {
      const response = await Api.post('/auth/verify-otp', { email, otp });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Example fetch profile call
  getProfile: async () => {
    try {
      const response = await Api.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
