const axios = require('axios');
const { HttpProxyAgent } = require('http-proxy-agent');

// Load environment
if (!process.env.VCAP_SERVICES) {
  const defaultEnv = require('./default-env.json');
  process.env.VCAP_SERVICES = JSON.stringify(defaultEnv.VCAP_SERVICES);
}

const xsenv = require('@sap/xsenv');

async function testS4HANAConnection() {
  try {
    console.log('Testing S/4HANA Connection\n');
    
    // Get services
    const services = xsenv.getServices({
      destination: { tag: 'destination' },
      connectivity: { tag: 'connectivity' },
      xsuaa: { tag: 'xsuaa' }
    });
    
    // Get destination token
    console.log('1. Getting destination service token...');
    const destTokenResponse = await axios.post(
      `${services.xsuaa.url}/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${services.destination.clientid}:${services.destination.clientsecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    console.log('✓ Destination token obtained');
    
    // Get destination
    console.log('\n2. Fetching destination RS4...');
    const destResponse = await axios.get(
      `${services.destination.uri}/destination-configuration/v1/destinations/RS4`,
      {
        headers: {
          'Authorization': `Bearer ${destTokenResponse.data.access_token}`
        }
      }
    );
    console.log('✓ Destination fetched');
    const destination = destResponse.data;
    
    // Get connectivity token
    console.log('\n3. Getting connectivity service token...');
    const connTokenResponse = await axios.post(
      `${services.xsuaa.url}/oauth/token`,
      `grant_type=client_credentials&client_id=${services.connectivity.clientid}&client_secret=${services.connectivity.clientsecret}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    console.log('✓ Connectivity token obtained');
    
    // Test SSH tunnel
    console.log('\n4. Testing SSH tunnel...');
    try {
      await axios.get('http://127.0.0.1:8081', { timeout: 2000 });
      console.log('✓ SSH tunnel is active');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('✗ SSH tunnel is NOT running!');
        console.log('Please run: cf ssh InStoreOrderCreationApp -L localhost:8081:connectivityproxy.internal.cf.eu10-004.hana.ondemand.com:20003');
        return;
      } else {
        console.log('✓ SSH tunnel responded (proxy is active)');
      }
    }
    
    // Try to connect to S/4HANA
    console.log('\n5. Connecting to S/4HANA through proxy...');
    const agent = new HttpProxyAgent('http://127.0.0.1:8081');
    
    const s4hanaUrl = `${destination.destinationConfiguration.URL}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product?$format=json&$top=1`;
    console.log('URL:', s4hanaUrl);
    
    const response = await axios.get(s4hanaUrl, {
      headers: {
        'Authorization': `${destination.authTokens[0].type} ${destination.authTokens[0].value}`,
        'Proxy-Authorization': `Bearer ${connTokenResponse.data.access_token}`,
        'SAP-Connectivity-SCC-Location_ID': destination.destinationConfiguration.CloudConnectorLocationId || 'RS4CLNT100_LOCID'
      },
      httpsAgent: agent,
      proxy: false,
      timeout: 30000
    });
    
    console.log('✓ Successfully connected to S/4HANA!');
    console.log('Response status:', response.status);
    console.log('Number of products returned:', response.data.d?.results?.length || 0);
    if (response.data.d?.results?.[0]) {
      console.log('First product:', {
        Product: response.data.d.results[0].Product,
        ProductStandardID: response.data.d.results[0].ProductStandardID
      });
    }
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('\nConnection refused. Make sure:');
      console.error('1. SSH tunnel is running');
      console.error('2. Cloud Connector is running');
      console.error('3. S/4HANA system is accessible');
    }
  }
}

testS4HANAConnection(); 