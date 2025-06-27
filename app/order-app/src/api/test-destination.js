const axios = require('axios');

// Load environment
if (!process.env.VCAP_SERVICES) {
  const defaultEnv = require('./default-env.json');
  process.env.VCAP_SERVICES = JSON.stringify(defaultEnv.VCAP_SERVICES);
}

const xsenv = require('@sap/xsenv');

async function testDestinationService() {
  try {
    console.log('Testing Destination Service Connection\n');
    
    // Get services
    const services = xsenv.getServices({
      destination: { tag: 'destination' },
      xsuaa: { tag: 'xsuaa' }
    });
    
    console.log('Destination Service URL:', services.destination.uri);
    console.log('Auth URL:', services.xsuaa.url);
    console.log('Client ID:', services.destination.clientid);
    
    // Get OAuth token
    console.log('\nGetting OAuth token...');
    const tokenResponse = await axios.post(
      `${services.xsuaa.url}/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${services.destination.clientid}:${services.destination.clientsecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('✓ OAuth token obtained successfully');
    console.log('Token type:', tokenResponse.data.token_type);
    console.log('Expires in:', tokenResponse.data.expires_in, 'seconds');
    
    // Try to get destination
    console.log('\nFetching destination RS4...');
    const destResponse = await axios.get(
      `${services.destination.uri}/destination-configuration/v1/destinations/RS4`,
      {
        headers: {
          'Authorization': `Bearer ${tokenResponse.data.access_token}`
        }
      }
    );
    
    console.log('✓ Destination fetched successfully!');
    console.log('Destination details:');
    console.log('- Name:', destResponse.data.destinationConfiguration.Name);
    console.log('- URL:', destResponse.data.destinationConfiguration.URL);
    console.log('- ProxyType:', destResponse.data.destinationConfiguration.ProxyType);
    console.log('- Authentication:', destResponse.data.destinationConfiguration.Authentication);
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 403) {
        console.error('\nPossible causes for 403 Forbidden:');
        console.error('1. The destination service instance does not have access to the RS4 destination');
        console.error('2. The destination is defined at a different level (subaccount vs instance)');
        console.error('3. Missing scopes or permissions');
      }
    }
  }
}

testDestinationService(); 