const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

// Sign a valid token for Shivam Dhayatidak (City Admin)
const token = jwt.sign(
  { 
    id: '6a2f8c0ee98a94679d30a490', 
    email: 'itsmedhayatidak@gmail.com', 
    role: 'city_admin' 
  },
  process.env.JWT_SECRET || 'WorknAI@Gym2026',
  { expiresIn: '1d' }
);

console.log('GENERATED TOKEN:', token);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/city-admin/dashboard?city=Pune',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log('RESPONSE:', responseData);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
