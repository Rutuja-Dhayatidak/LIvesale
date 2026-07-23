const http = require('http');

const data = JSON.stringify({
  email: 'itsmedhayatidak@gmail.com',
  password: 'Admin@123' // Let's try to verify if this is the password
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/admins/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
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
    const parsed = JSON.parse(responseData);
    if (parsed.success && parsed.token) {
      verifyToken(parsed.token);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();

function verifyToken(token) {
  const verifyOptions = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/city-admin/dashboard?city=Pune',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
  
  const verifyReq = http.request(verifyOptions, (res) => {
    console.log(`VERIFY STATUS: ${res.statusCode}`);
    let verifyData = '';
    res.on('data', (chunk) => {
      verifyData += chunk;
    });
    res.on('end', () => {
      console.log('VERIFY RESPONSE:', verifyData);
    });
  });
  
  verifyReq.end();
}
