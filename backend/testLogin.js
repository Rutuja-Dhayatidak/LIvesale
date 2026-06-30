const testLogin = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/admins/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@gym.com',
        password: 'Admin@123'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', data);
  } catch (err) {
    console.log('Error:', err.message);
  }
};

testLogin();
