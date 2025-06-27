const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

// Load environment variables from env.local file for local development
if (!process.env.VCAP_SERVICES) {
  try {
    require('dotenv').config({ path: path.join(__dirname, 'env.local') });
    console.log('Loaded env.local file for local development');
  } catch (error) {
    console.log('No env.local file found, using defaults');
  }
}

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
    // Local development - use direct connection to S/4HANA
    console.log('Local development mode - using direct S/4HANA connection');
    
    // Get credentials from environment variables or use defaults
    const username = process.env.S4HANA_USERNAME || 'YOUR_USERNAME_HERE';
    const password = process.env.S4HANA_PASSWORD || 'YOUR_PASSWORD_HERE';
    
    // Direct connection to MERCHANDISE.REALCORE.DE
    return {
      url: 'http://MERCHANDISE.REALCORE.DE:8000',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
  }
}

// Helper function to fetch data from on-premise system
async function fetchFromOnPremise(path, options = {}) {
  try {
    if (!isCloudFoundry) {
      // For local development, direct connection
      console.log('Local development mode - direct S/4HANA connection');
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
    
    const requestConfig = {
      headers: config.headers,
      proxy: false
    };
    
    // Only add agent for Cloud Foundry (if needed)
    if (config.agent) {
      requestConfig.httpsAgent = config.agent;
    }
    
    const response = await axios.get(fullUrl, requestConfig);
    
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
function transformProduct(s4Product, description = '') {
  return {
    id: s4Product.Product,
    ean: s4Product.ProductStandardID || '',
    description: description || `Product ${s4Product.Product}`, // Use provided description or fallback
    listPrice: parseFloat(s4Product.NetPriceAmount || '19.99'), // Default price if not available
    unit: s4Product.BaseUnit || 'EA',
    image: `/api/images/products/${s4Product.Product}.jpg`,
    inStoreStock: Math.floor(Math.random() * 100), // Mock data for now
    onlineStock: Math.floor(Math.random() * 100), // Mock data for now
    isAvailable: true
  };
}

// Helper function to fetch product descriptions
async function fetchProductDescriptions(productIds, config) {
  try {
    if (productIds.length === 0) return {};
    
    const filter = productIds.map(id => `Product eq '${id}'`).join(' or ');
    
    const requestConfig = {
      headers: config.headers,
      proxy: false
    };
    
    // Only add agent for Cloud Foundry (if needed)
    if (config.agent) {
      requestConfig.httpsAgent = config.agent;
    }
    
    const response = await axios.get(
      `${config.url}/sap/opu/odata/sap/API_PRODUCT_SRV/A_ProductDescription?$format=json&$filter=(${filter}) and Language eq 'EN'`,
      requestConfig
    );
    
    const descriptions = {};
    if (response.data && response.data.d && response.data.d.results) {
      response.data.d.results.forEach(desc => {
        descriptions[desc.Product] = desc.ProductDescription;
      });
    }
    return descriptions;
  } catch (error) {
    console.error('Error fetching product descriptions:', error.message);
    return {};
  }
}

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/products', async (req, res) => {
  const searchQuery = req.query.search || '';
  
  try {
    // First, check if we can connect
    const config = await getDestinationConfig();
    
    // For now, don't filter at OData level - fetch all and filter in memory
    // This is because descriptions are fetched separately
    const requestConfig = {
      params: {
        '$format': 'json',
        '$top': '100', // Increased to get more products
        '$select': 'Product,ProductStandardID,BaseUnit,ProductGroup,GrossWeight,NetWeight,WeightUnit'
      },
      headers: config.headers,
      proxy: false
    };
    
    // Only add agent for Cloud Foundry (if needed)
    if (config.agent) {
      requestConfig.httpsAgent = config.agent;
    }
    
    // Fetch products from S/4HANA
    const response = await axios.get(
      `${config.url}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product`,
      requestConfig
    );

    const products = response.data.d?.results || [];
    
    // Fetch descriptions for all products
    const productIds = products.map(p => p.Product);
    const descriptions = await fetchProductDescriptions(productIds, config);
    
    // Transform products with descriptions
    let transformedProducts = products.map(p => 
      transformProduct(p, descriptions[p.Product])
    );
    
    // Filter products based on search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      transformedProducts = transformedProducts.filter(p => 
        p.description.toLowerCase().includes(searchLower) ||
        p.ean.toLowerCase().includes(searchLower) ||
        p.id.toLowerCase().includes(searchLower)
      );
    }
    
    // Limit to maximum 5 results for search
    if (searchQuery && transformedProducts.length > 5) {
      transformedProducts = transformedProducts.slice(0, 5);
    }
    
    res.json({
      products: transformedProducts,
      totalCount: transformedProducts.length
    });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
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
    
    let filtered = searchQuery 
      ? mockProducts.filter(p => 
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.ean.includes(searchQuery) ||
          p.id.includes(searchQuery)
        )
      : mockProducts;
    
    // Limit to maximum 5 results for search
    if (searchQuery && filtered.length > 5) {
      filtered = filtered.slice(0, 5);
    }
    
    res.json({
      products: filtered,
      totalCount: filtered.length
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  
  try {
    const config = await getDestinationConfig();
    
    const requestConfig = {
      params: {
        '$format': 'json',
        '$select': 'Product,ProductStandardID,BaseUnit,ProductGroup,GrossWeight,NetWeight,WeightUnit'
      },
      headers: config.headers,
      proxy: false
    };
    
    // Only add agent for Cloud Foundry (if needed)
    if (config.agent) {
      requestConfig.httpsAgent = config.agent;
    }
    
    // Fetch specific product from S/4HANA
    const response = await axios.get(
      `${config.url}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product('${productId}')`,
      requestConfig
    );

    if (response.data && response.data.d) {
      // Fetch description for this product
      const descriptions = await fetchProductDescriptions([productId], config);
      const product = transformProduct(response.data.d, descriptions[productId]);
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error.message);
    
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

// Start server only if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`Environment: ${isCloudFoundry ? 'Cloud Foundry' : 'Local Development'}`);
    console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app; 