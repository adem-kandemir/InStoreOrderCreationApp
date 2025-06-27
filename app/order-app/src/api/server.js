const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { HttpProxyAgent } = require('http-proxy-agent');

// Load environment variables for local development
if (!process.env.VCAP_SERVICES) {
  try {
    const defaultEnv = require('./default-env.json');
    process.env.VCAP_SERVICES = JSON.stringify(defaultEnv.VCAP_SERVICES);
    console.log('Loaded default-env.json for local development');
  } catch (error) {
    console.warn('Could not load default-env.json:', error.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration based on environment
const isCloudFoundry = process.env.CF_INSTANCE_INDEX !== undefined;

console.log('Starting API server...');
console.log('Environment:', isCloudFoundry ? 'Cloud Foundry' : 'Local Development');

// Load xsenv only when needed
let xsenv;
try {
  xsenv = require('@sap/xsenv');
  console.log('xsenv loaded successfully');
} catch (error) {
  console.error('Error loading xsenv:', error.message);
}

// Helper function to get destination configuration
async function getDestinationConfig() {
  if (isCloudFoundry) {
    // In Cloud Foundry, use destination service directly
    const services = xsenv.getServices({
      destination: { tag: 'destination' },
      connectivity: { tag: 'connectivity' },
      xsuaa: { tag: 'xsuaa' }
    });
    
    // Get access token for destination service
    const tokenResponse = await axios.post(
      `${services.xsuaa.url}/oauth/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${services.xsuaa.clientid}:${services.xsuaa.clientsecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    
    // Get destination configuration
    const destResponse = await axios.get(
      `${services.destination.uri}/destination-configuration/v1/destinations/RS4`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const destination = destResponse.data;
    
    return {
      url: destination.destinationConfiguration.URL,
      headers: {
        'Authorization': `${destination.authTokens[0].type} ${destination.authTokens[0].value}`
      }
    };
  } else {
    // Local development - use SSH tunnel and local destination service
    try {
      console.log('Getting local services...');
      
      // Get local services using tags (works with default-env.json)
      const services = xsenv.getServices({
        destination: { tag: 'destination' },
        connectivity: { tag: 'connectivity' },
        xsuaa: { tag: 'xsuaa' }
      });
      
      console.log('Services loaded, getting access token...');
      
      // Get access token
      const tokenResponse = await axios.post(
        `${services.xsuaa.url}/oauth/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${services.xsuaa.clientid}:${services.xsuaa.clientsecret}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const accessToken = tokenResponse.data.access_token;
      console.log('Access token obtained');
      
      // Get destination configuration
      const destResponse = await axios.get(
        `${services.destination.uri}/destination-configuration/v1/destinations/RS4`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      const destination = destResponse.data;
      console.log('Destination configuration obtained');
      
      // Get connectivity token
      const connectivityTokenResponse = await axios.post(
        `${services.xsuaa.url}/oauth/token`,
        `grant_type=client_credentials&client_id=${services.connectivity.clientid}&client_secret=${services.connectivity.clientsecret}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const connectivityToken = connectivityTokenResponse.data.access_token;
      
      return {
        url: 'http://127.0.0.1:8081', // SSH tunnel endpoint
        headers: {
          'Authorization': `${destination.authTokens[0].type} ${destination.authTokens[0].value}`,
          'Proxy-Authorization': `Bearer ${connectivityToken}`,
          'SAP-Connectivity-SCC-Location_ID': destination.destinationConfiguration.CloudConnectorLocationId || 'RS4CLNT100_LOCID'
        },
        agent: new HttpProxyAgent('http://127.0.0.1:8081')
      };
    } catch (error) {
      console.error('Error getting destination config:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }
}

// Helper function to fetch data from on-premise system
async function fetchFromOnPremise(path, options = {}) {
  try {
    if (!isCloudFoundry) {
      // For local development, we need SSH tunnel to be running
      console.log('Local development mode - ensure SSH tunnel is running');
    }

    const config = await getDestinationConfig();
    
    // Build full URL
    const url = `${config.url}${path}`;
    
    // Build query string if params provided
    let queryString = '';
    if (options.params) {
      const params = new URLSearchParams();
      // Add format=json by default for OData
      params.append('$format', 'json');
      
      // Add other parameters
      Object.entries(options.params).forEach(([key, value]) => {
        params.append(key, value);
      });
      
      queryString = '?' + params.toString();
    }
    
    const fullUrl = url + queryString;
    console.log('Fetching from:', fullUrl);
    
    const response = await axios.get(fullUrl, {
      headers: config.headers,
      httpsAgent: config.agent,
      proxy: false
    });
    
    return response.data;
  } catch (error) {
    console.error('Error in fetchFromOnPremise:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Helper function to transform S/4HANA product to our format
function transformProduct(s4Product) {
  return {
    id: s4Product.Product,
    ean: s4Product.ProductStandardID || '',
    description: s4Product.ProductDescription || s4Product.Product,
    listPrice: parseFloat(s4Product.NetPriceAmount || '0'),
    unit: s4Product.BaseUnit || 'EA',
    image: `/api/images/products/${s4Product.Product}.jpg`,
    inStoreStock: Math.floor(Math.random() * 100), // Mock data for now
    onlineStock: Math.floor(Math.random() * 100), // Mock data for now
    isAvailable: true
  };
}

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/products', async (req, res) => {
  const searchQuery = req.query.search || '';
  
  try {
    // Fetch products from S/4HANA
    const response = await fetchFromOnPremise('/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product', {
      params: {
        '$top': '20',
        '$select': 'Product,ProductDescription,ProductStandardID,BaseUnit,NetPriceAmount',
        ...(searchQuery && { 
          '$filter': `substringof('${searchQuery}', Product) or substringof('${searchQuery}', ProductDescription)` 
        })
      }
    });

    const products = (response.d?.results || []).map(transformProduct);
    
    res.json({
      products,
      totalCount: products.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    
    // Return mock data as fallback
    const mockProducts = [
      {
        id: '1',
        ean: '4006381333634',
        description: 'Stabilo Boss Highlighter Yellow',
        listPrice: 2.99,
        unit: 'PC',
        image: '/api/images/products/1.jpg',
        inStoreStock: 45,
        onlineStock: 120,
        isAvailable: true
      },
      {
        id: '2',
        ean: '4006381333641',
        description: 'Stabilo Boss Highlighter Pink',
        listPrice: 2.99,
        unit: 'PC',
        image: '/api/images/products/2.jpg',
        inStoreStock: 32,
        onlineStock: 89,
        isAvailable: true
      },
      {
        id: '3',
        ean: '4006381333658',
        description: 'Stabilo Boss Highlighter Green',
        listPrice: 2.99,
        unit: 'PC',
        image: '/api/images/products/3.jpg',
        inStoreStock: 28,
        onlineStock: 95,
        isAvailable: true
      },
      {
        id: '4',
        ean: '2050000000010',
        description: 'Test Product from S/4HANA',
        listPrice: 19.99,
        unit: 'ST',
        image: '/api/images/products/4.jpg',
        inStoreStock: 15,
        onlineStock: 50,
        isAvailable: true
      }
    ];
    
    const filtered = searchQuery 
      ? mockProducts.filter(p => 
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.ean.includes(searchQuery) ||
          p.id.includes(searchQuery)
        )
      : mockProducts;
    
    res.json({
      products: filtered,
      totalCount: filtered.length
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  
  try {
    // Fetch specific product from S/4HANA
    const response = await fetchFromOnPremise(`/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product('${productId}')`, {
      params: {
        '$select': 'Product,ProductDescription,ProductStandardID,BaseUnit,NetPriceAmount,GrossWeight,NetWeight,WeightUnit'
      }
    });

    if (response.d) {
      const product = transformProduct(response.d);
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    
    // Return mock data as fallback
    const mockProducts = {
      '1': {
        id: '1',
        ean: '4006381333634',
        description: 'Stabilo Boss Highlighter Yellow',
        listPrice: 2.99,
        unit: 'PC',
        image: '/api/images/products/1.jpg',
        inStoreStock: 45,
        onlineStock: 120,
        isAvailable: true
      },
      '4': {
        id: '4',
        ean: '2050000000010',
        description: 'Test Product from S/4HANA',
        listPrice: 19.99,
        unit: 'ST',
        image: '/api/images/products/4.jpg',
        inStoreStock: 15,
        onlineStock: 50,
        isAvailable: true
      }
    };
    
    const product = mockProducts[productId];
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  }
});

// Product image endpoint (placeholder)
app.get('/api/products/:id/image', (req, res) => {
  // In a real implementation, this would fetch from a document service
  // For now, return a placeholder or redirect to a default image
  res.redirect(`/assets/images/products/${req.params.id}.jpg`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Environment: ${isCloudFoundry ? 'Cloud Foundry' : 'Local Development'}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});

module.exports = app; 