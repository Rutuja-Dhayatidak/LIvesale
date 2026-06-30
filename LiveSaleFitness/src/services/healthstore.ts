import Api from './Api';

export interface HealthStoreProduct {
  _id: string;
  name: string;
  price?: number;
  sellingPrice?: number;
  oneTimePrice?: number;
  image?: string;
  images?: string[];
  productType: 'Diet' | 'Supplement' | 'Food';
  category: string;
  description: string;
  brand?: string;
  ingredients?: string;
  howToUse?: string;
  quantity?: string;
  status?: string;
  originalPrice?: number;
  variants?: any[];
  deliveryAvailable?: boolean;
  healthStore?: string;
}

export const healthStoreService = {
  // Fetch diet products
  getDietProducts: async () => {
    try {
      const response = await Api.get('/health-store/categories/diet');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fetch supplement products
  getSupplementProducts: async () => {
    try {
      const response = await Api.get('/health-store/categories/supplements');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fetch a product by ID
  getProductById: async (productId: string) => {
    try {
      const response = await Api.get(`/health-store/categories/products/${productId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fetch a store by ID
  getStoreById: async (storeId: string) => {
    try {
      const response = await Api.get(`/health-store/categories/stores/${storeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create Razorpay order
  createOrder: async (items: any[], storeId: string, address: any) => {
    try {
      const response = await Api.post('/health-store/payment/create-order', { items, storeId, address });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify Razorpay payment signature
  verifyPayment: async (paymentData: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    orderId: string;
  }) => {
    try {
      const response = await Api.post('/health-store/payment/verify', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Fetch user orders history
  getOrders: async (page = 1, limit = 10) => {
    try {
      const response = await Api.get('/health-store/payment/orders', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default healthStoreService;
