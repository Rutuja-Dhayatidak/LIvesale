import Api from './Api';

export interface GymLocation {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

export interface Gym {
  _id: string;
  ownerId: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  location: GymLocation;
  hours?: string;
  capacity?: number;
  amenities?: string[];
  images?: string[];
  verified?: boolean;
  active?: boolean;
  rating?: number;
  distance?: string;
  heroImage?: string;
  trainers?: any[];
  services?: any[];
  offers?: any[];
  freeTrial?: {
    available: boolean;
    days?: number;
    description?: string;
  };
}

export const gymService = {
  // Fetch all gyms (public finder)
  getAllGyms: async () => {
    try {
      const response = await Api.get('/gyms');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fetch nearby gyms based on location
  getNearbyGyms: async (params: { lat: number; lng: number; radius?: number }) => {
    try {
      const response = await Api.get('/gyms/nearby', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fetch a specific gym by ID
  getGymById: async (gymId: string) => {
    try {
      const response = await Api.get(`/gyms/${gymId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add a new gym (owner/user)
  registerGym: async (gymData: Partial<Gym>) => {
    try {
      const response = await Api.post('/gyms', gymData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update gym details
  updateGym: async (gymId: string, gymData: Partial<Gym>) => {
    try {
      const response = await Api.put(`/gyms/${gymId}`, gymData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete a gym
  deleteGym: async (gymId: string) => {
    try {
      const response = await Api.delete(`/gyms/${gymId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Upload gym image
  uploadImage: async (formData: any) => {
    try {
      const response = await Api.post('/gyms/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
export default gymService;
