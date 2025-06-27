const axios = require('axios');

async function testDirectConnection() {
  console.log('Testing direct connection to S/4HANA...\n');
  
  const baseUrl = 'http://MERCHANDISE.REALCORE.DE:8000';
  const productEndpoint = '/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product(\'4\')?$format=json';
  
  try {
    console.log(`Connecting to: ${baseUrl}${productEndpoint}`);
    
    const response = await axios.get(`${baseUrl}${productEndpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('\n✅ Connection successful!');
    console.log('Response status:', response.status);
    console.log('\nProduct data:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.code) {
      console.error('Error code:', error.code);
      if (error.code === 'ENOTFOUND') {
        console.error('Could not resolve hostname. Check if the URL is correct.');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('Connection timed out. The server might be unreachable.');
      }
    }
  }
}

// Test fetching multiple products
async function testProductList() {
  console.log('\n\nTesting product list endpoint...\n');
  
  const baseUrl = 'http://MERCHANDISE.REALCORE.DE:8000';
  const listEndpoint = '/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product?$format=json&$top=5';
  
  try {
    console.log(`Connecting to: ${baseUrl}${listEndpoint}`);
    
    const response = await axios.get(`${baseUrl}${listEndpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('\n✅ Connection successful!');
    console.log('Response status:', response.status);
    
    const results = response.data.d?.results || [];
    console.log(`\nFound ${results.length} products:`);
    
    results.forEach((product, index) => {
      console.log(`\nProduct ${index + 1}:`);
      console.log(`  ID: ${product.Product}`);
      console.log(`  EAN: ${product.ProductStandardID || 'N/A'}`);
      console.log(`  Base Unit: ${product.BaseUnit || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
  }
}

// Run tests
(async () => {
  await testDirectConnection();
  await testProductList();
})(); 