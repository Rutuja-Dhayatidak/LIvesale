async function testPost() {
  const token = '70634457dc29eb1fa89326c86e6e9b30df2cc4538657ace8936e658d2cdd7d27';
  const url = `http://localhost:5000/api/health-store/register/${token}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: 'Test Description',
        alternateMobile: '9876543210',
        address: 'Test Address',
        state: 'Maharashtra',
        pincode: '400703',
        landmark: 'Near Station',
        gstNumber: '22AAAAA0000A1Z5',
        fssaiLicenseNumber: '12345678901234',
        businessRegistrationNumber: 'REG12345',
        panNumber: 'ABCDE1234F',
        openingTime: '09:00',
        closingTime: '21:00',
        deliveryAvailable: 'true',
        deliveryRadiusKm: '10',
        serviceAreas: 'Vashi',
        bankName: 'ICICI Bank',
        accountHolderName: 'Owner Name',
        accountNumber: '1234567890',
        ifscCode: 'ICIC0001234',
        upiId: 'owner@icici'
      })
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testPost();
