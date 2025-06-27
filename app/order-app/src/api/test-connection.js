const axios = require('axios');

// Test if API server is running
async function testAPIServer() {
  try {
    console.log('Testing API server...');
    const response = await axios.get('http://localhost:3000/api/health');
    console.log('✓ API server is running:', response.data);
    return true;
  } catch (error) {
    console.log('✗ API server is not running. Please start it with: npm start');
    return false;
  }
}

// Test if SSH tunnel is active
async function testSSHTunnel() {
  try {
    console.log('\nTesting SSH tunnel...');
    await axios.get('http://127.0.0.1:8081', { timeout: 2000 });
    console.log('✓ SSH tunnel seems to be active');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('✗ SSH tunnel is not running.');
      console.log('  Please run: cf ssh InStoreOrderCreationApp -L localhost:8081:connectivityproxy.internal.cf.eu10-004.hana.ondemand.com:20003');
    } else {
      console.log('✓ SSH tunnel is active (got response from proxy)');
      return true;
    }
    return false;
  }
}

// Test product search
async function testProductSearch() {
  try {
    console.log('\nTesting product search...');
    const response = await axios.get('http://localhost:3000/api/products?search=4');
    console.log('✓ Product search returned:', response.data.products.length, 'products');
    if (response.data.products.length > 0) {
      console.log('  First product:', response.data.products[0]);
    }
  } catch (error) {
    console.log('✗ Product search failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('InStore Order Creation App - Connection Test\n');
  
  const apiRunning = await testAPIServer();
  if (!apiRunning) {
    console.log('\nPlease start the API server first!');
    process.exit(1);
  }
  
  await testSSHTunnel();
  await testProductSearch();
  
  console.log('\nTest complete!');
}

runTests(); 