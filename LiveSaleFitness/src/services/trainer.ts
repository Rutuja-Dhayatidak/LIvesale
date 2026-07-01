import Api from './Api';

export interface Trainer {
  _id: string;
  name: string;
  email?: string;
  specializations?: string[];
  specialization?: string[];  // legacy fallback
  experience?: number;
  bio?: string;
  rating?: number;
  pricePerSession?: number;
  photo?: string;
  profileImage?: string;  // legacy fallback
  trainingTypes?: string[];
  city?: string;
  review?: number;
  clients?: number;
  gender?: string;
}

export const trainerService = {
  // Fetch all trainers
  getAllTrainers: async (params?: { specialization?: string; search?: string }) => {
    try {
      const response = await Api.get('/public/trainers', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fetch a specific trainer by ID
  getTrainerById: async (trainerId: string) => {
    try {
      const response = await Api.get(`/public/trainers/${trainerId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Book a session with a trainer
  bookSession: async (trainerId: string, sessionData: { date: string; time: string; notes?: string }) => {
    try {
      const response = await Api.post(`/trainers/${trainerId}/book`, sessionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Leave a review for a trainer
  leaveReview: async (trainerId: string, reviewData: { rating: number; comment: string }) => {
    try {
      const response = await Api.post(`/trainers/${trainerId}/reviews`, reviewData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get available slots for a trainer
  getAvailableSlots: async (trainerId: string, date: string) => {
    try {
      const response = await Api.get(`/trainers/${trainerId}/slots`, { params: { date } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Initiate booking (creates Razorpay order and pending bookings)
  initiateBooking: async (data: {
    trainerId: string;
    slot: string;
    day: string;
    date: string;
    price: number;
    plan: 'Trial' | 'Single' | 'Monthly';
    trainingType: string;
    address?: string;
    phone: string;
  }) => {
    try {
      const response = await Api.post('/bookings/initiate', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify booking payment
  verifyBookingPayment: async (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    try {
      const response = await Api.post('/bookings/verify', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get customer's trainer bookings
  getMyBookings: async () => {
    try {
      const response = await Api.get('/bookings/my-bookings');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
