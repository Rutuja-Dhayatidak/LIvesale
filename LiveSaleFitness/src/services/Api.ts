import axios from 'axios';
import { API_BASE_URL } from '@env';
import { Platform, NativeModules } from 'react-native';

let baseUrl = API_BASE_URL || 'http://localhost:5000/api';

// On Android/iOS devices, we can dynamically detect the host PC's IP address
// from Metro bundler's script URL to avoid having to update .env whenever WiFi networks change.
const getDevHubIp = (): string | null => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
};

const isEmulator = Platform.OS === 'android' && 
  ((Platform.constants as any).Brand?.toLowerCase().includes('generic') || 
   (Platform.constants as any).Model?.toLowerCase().includes('sdk') || 
   (Platform.constants as any).Model?.toLowerCase().includes('emulator') || 
   (Platform.constants as any).Fingerprint?.toLowerCase().startsWith('generic'));

const devHostIp = getDevHubIp();

if (__DEV__) {
  console.log('--- API CONFIG DEBUG ---');
  console.log('Original API_BASE_URL:', API_BASE_URL);
  console.log('Metro Bundler Host IP:', devHostIp);
  console.log('Is Android Emulator:', isEmulator);
  
  if (devHostIp && devHostIp !== 'localhost' && devHostIp !== '127.0.0.1') {
    // If Metro is running on a real IP address (like 192.168.x.x), use it.
    baseUrl = baseUrl.replace(/localhost|127\.0\.0\.1|10\.0\.2\.2/, devHostIp);
  } else if (Platform.OS === 'android') {
    if (isEmulator) {
      // Emulator fallback
      baseUrl = baseUrl.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
    } else {
      // Physical device fallback: keep localhost since we run adb reverse tcp:5000 tcp:5000
      baseUrl = baseUrl.replace(/10\.0\.2\.2|127\.0\.0\.1/, 'localhost');
    }
  }
}

console.log('--- API BASE URL IS ---', baseUrl);

const Api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

// Request interceptor to add token if needed
Api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
Api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle global errors here
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default Api;
