import Api from './Api';

export interface UserProfileData {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | '';
  height?: number;
  weight?: number;
  fitnessGoal?: string;
  location?: string;
  city?: string;
  profilePhoto?: string;
  role: string;
}

export const profileService = {
  // Get authenticated user profile details
  getProfile: async (): Promise<{ success: boolean; data: UserProfileData }> => {
    try {
      const response = await Api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update authenticated user profile details
  updateProfile: async (profileData: Partial<UserProfileData> | FormData): Promise<{ success: boolean; message: string; data: UserProfileData }> => {
    try {
      const response = await Api.put('/auth/profile', profileData, {
        headers: {
          'Content-Type': profileData instanceof FormData ? 'multipart/form-data' : 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
