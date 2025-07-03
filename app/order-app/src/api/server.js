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

// Serve static files from the Angular app's assets directory
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Also serve images directly under /api/images path
app.use('/api/images', express.static(path.join(__dirname, '../assets/images')));

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

// Import system services
const oppsService = require('./services/opps.service');
const omsaService = require('./services/omsa.service');
const omfService = require('./services/omf.service');

// Enhanced product transformation with OPPS pricing
async function transformProductWithPricing(s4Product, description = '', storeId = null) {
  const productId = s4Product.Product;
  
  // Get real pricing from OPPS
  let pricing = { listPrice: 19.99, salePrice: 19.99, currency: 'EUR' }; // Default fallback
  
  try {
    const oppsPricing = await oppsService.getProductPricing(productId, { storeId });
    if (oppsPricing && oppsPricing[productId]) {
      pricing = {
        listPrice: oppsPricing[productId].listPrice,
        salePrice: oppsPricing[productId].salePrice,
        currency: oppsPricing[productId].currency
      };
    }
  } catch (error) {
    console.log(`Using fallback pricing for product ${productId}`);
  }

  return {
    id: productId,
    ean: s4Product.ProductStandardID || '',
    description: description || `Product ${productId}`,
    listPrice: pricing.listPrice,
    salePrice: pricing.salePrice,
    currency: pricing.currency,
    unit: s4Product.BaseUnit || 'EA',
    image: `/api/images/products/${productId}.jpg`,
    inStoreStock: Math.floor(Math.random() * 100), // Mock data for now
    onlineStock: Math.floor(Math.random() * 100), // Mock data for now
    isAvailable: true
  };
}

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: isCloudFoundry ? 'Cloud Foundry' : 'Local Development',
    services: {
      opps: process.env.OPPS_BASE_URL ? 'configured' : 'fallback',
      omsa: process.env.OMSA_BASE_URL ? 'configured' : 'fallback',
      omf: process.env.OMF_BASE_URL ? 'configured' : 'fallback'
    }
  });
});

// OPPS Service Endpoints - Pricing and Promotions
app.get('/api/pricing/:productId', async (req, res) => {
  try {
    const options = {
      forceRefresh: req.query.refresh === 'true' || req.query.force === 'true'
    };
    const pricing = await oppsService.getProductPricing(req.params.productId, options);
    res.json(pricing);
  } catch (error) {
    console.error('Error getting pricing:', error.message);
    res.status(500).json({ error: 'Failed to get pricing information' });
  }
});

app.post('/api/pricing/batch', async (req, res) => {
  try {
    const { productIds, options } = req.body;
    const batchOptions = { ...options, batchMode: true }; // Force batch mode
    const pricing = await oppsService.getProductPricing(productIds, batchOptions);
    res.json(pricing);
  } catch (error) {
    console.error('Error getting batch pricing:', error.message);
    res.status(500).json({ error: 'Failed to get pricing information' });
  }
});

// Real-time pricing endpoint using metadata URI
app.get('/api/pricing/:productId/realtime', async (req, res) => {
  try {
    const businessUnitID = req.query.storeId || process.env.DEFAULT_STORE_ID;
    const realTimePrice = await oppsService.getRealTimePricing(req.params.productId, businessUnitID);
    
    if (realTimePrice) {
      res.json({ [req.params.productId]: realTimePrice });
    } else {
      res.status(404).json({ error: 'Product not found or no metadata URI available' });
    }
  } catch (error) {
    console.error('Error getting real-time pricing:', error.message);
    res.status(500).json({ error: 'Failed to get real-time pricing information' });
  }
});

app.get('/api/promotions/:productId', async (req, res) => {
  try {
    const promotions = await oppsService.getProductPromotions(req.params.productId);
    res.json(promotions);
  } catch (error) {
    console.error('Error getting promotions:', error.message);
    res.status(500).json({ error: 'Failed to get promotion information' });
  }
});

app.post('/api/pricing-promotions/batch', async (req, res) => {
  try {
    const { productIds, options } = req.body;
    const data = await oppsService.getPriceAndPromotions(productIds, options);
    res.json(data);
  } catch (error) {
    console.error('Error getting pricing and promotions:', error.message);
    res.status(500).json({ error: 'Failed to get pricing and promotion information' });
  }
});

// Force refresh prices endpoint
app.post('/api/pricing/refresh', async (req, res) => {
  try {
    console.log('Manual price refresh requested');
    await oppsService.fetchAllPrices();
    res.json({ 
      success: true, 
      message: 'Prices refreshed successfully', 
      timestamp: new Date().toISOString(),
      cachedProducts: oppsService.priceCache.size
    });
  } catch (error) {
    console.error('Error refreshing prices:', error.message);
    res.status(500).json({ error: 'Failed to refresh prices' });
  }
});

// OMSA Service Endpoints - Sourcing and Availability
app.get('/api/availability/:productId', async (req, res) => {
  try {
    const availability = await omsaService.getProductAvailabilityFromAPI(req.params.productId, req.query);
    res.json(availability);
  } catch (error) {
    console.error('Error getting availability:', error.message);
    res.status(500).json({ error: 'Failed to get availability information' });
  }
});

app.post('/api/availability/batch', async (req, res) => {
  try {
    const { productIds, options } = req.body;
    const availability = await omsaService.getBatchAvailability(productIds, options);
    res.json(availability);
  } catch (error) {
    console.error('Error getting batch availability:', error.message);
    res.status(500).json({ error: 'Failed to get availability information' });
  }
});

app.get('/api/sourcing/:productId', async (req, res) => {
  try {
    const sourcing = await omsaService.getProductSourcing(req.params.productId, req.query);
    res.json(sourcing);
  } catch (error) {
    console.error('Error getting sourcing:', error.message);
    res.status(500).json({ error: 'Failed to get sourcing information' });
  }
});

app.get('/api/stock/:productId', async (req, res) => {
  try {
    const stock = await omsaService.getStockLevels(req.params.productId, req.query);
    res.json(stock);
  } catch (error) {
    console.error('Error getting stock levels:', error.message);
    res.status(500).json({ error: 'Failed to get stock information' });
  }
});

app.post('/api/stock/reserve', async (req, res) => {
  try {
    const { reservations, options } = req.body;
    const result = await omsaService.reserveStock(reservations, options);
    res.json(result);
  } catch (error) {
    console.error('Error reserving stock:', error.message);
    res.status(500).json({ error: 'Failed to reserve stock' });
  }
});

app.post('/api/stock/release', async (req, res) => {
  try {
    const { reservationIds } = req.body;
    const result = await omsaService.releaseStockReservation(reservationIds);
    res.json(result);
  } catch (error) {
    console.error('Error releasing stock reservation:', error.message);
    res.status(500).json({ error: 'Failed to release stock reservation' });
  }
});

// OMF Service Endpoints - Order Management and Fulfillment
app.post('/api/orders', async (req, res) => {
  try {
    console.log('Server: Processing order creation request');
    console.log('Server: Order data received:', JSON.stringify(req.body, null, 2));
    
    const orderData = req.body;
    
    // Validate required fields
    if (!orderData.items || orderData.items.length === 0) {
      return res.status(400).json({ 
        error: 'Order must contain at least one item',
        code: 'INVALID_ORDER_DATA'
      });
    }
    
    if (!orderData.customer) {
      return res.status(400).json({ 
        error: 'Customer information is required',
        code: 'MISSING_CUSTOMER_DATA'
      });
    }
    
    // Get cached sourcing data from OMSA
    let sourcingData = null;
    try {
      sourcingData = omsaService.getCachedSourcing();
      console.log('Server: Sourcing data:', sourcingData ? 'Available' : 'Not cached');
    } catch (error) {
      console.warn('Server: Could not retrieve sourcing data:', error.message);
    }
    
    // Create order using OMF service with sourcing data
    const createdOrder = await omfService.createOrder(orderData, sourcingData);
    
    console.log('Server: Order created successfully:', createdOrder.externalNumber || createdOrder.orderId);
    
    // Return success response
    res.status(201).json({
      success: true,
      order: createdOrder,
      message: 'Order created successfully'
    });
    
  } catch (error) {
    console.error('Server: Error creating order:', error.message);
    
    // Determine appropriate HTTP status code
    let statusCode = 500;
    if (error.status) {
      statusCode = error.status;
    } else if (error.code === 'INVALID_ORDER_DATA') {
      statusCode = 400;
    }
    
    // Return detailed error response with no fallback
    res.status(statusCode).json({ 
      success: false,
      error: 'Order creation failed',
      message: error.message,
      code: error.code || 'ORDER_CREATION_FAILED',
      details: error.details || null
    });
  }
});

app.get('/api/orders/:orderId', async (req, res) => {
  try {
    // Pass query parameters (like expand) to the OMF service
    const order = await omfService.getOrder(req.params.orderId, req.query);
    res.json(order);
  } catch (error) {
    console.error('Error getting order:', error.message);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

app.put('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { status, reason, notes } = req.body;
    const order = await omfService.updateOrderStatus(req.params.orderId, status, { reason, notes });
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error.message);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.post('/api/orders/:orderId/cancel', async (req, res) => {
  try {
    const result = await omfService.cancelOrder(req.params.orderId, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error cancelling order:', error.message);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

app.get('/api/orders/:orderId/fulfillment', async (req, res) => {
  try {
    const fulfillment = await omfService.getOrderFulfillment(req.params.orderId);
    res.json(fulfillment);
  } catch (error) {
    console.error('Error getting order fulfillment:', error.message);
    res.status(500).json({ error: 'Failed to get order fulfillment' });
  }
});

app.post('/api/orders/:orderId/payment', async (req, res) => {
  try {
    const payment = await omfService.processPayment(req.params.orderId, req.body);
    res.json(payment);
  } catch (error) {
    console.error('Error processing payment:', error.message);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    // Pass all query parameters including expand
    const orders = await omfService.searchOrders(req.query);
    res.json(orders);
  } catch (error) {
    console.error('Error searching orders:', error.message);
    res.status(500).json({ error: 'Failed to search orders' });
  }
});

app.get('/api/orders/:orderId/items', async (req, res) => {
  try {
    const items = await omfService.getOrderItems(req.params.orderId);
    res.json(items);
  } catch (error) {
    console.error('Error getting order items:', error.message);
    res.status(500).json({ error: 'Failed to get order items' });
  }
});

app.get('/api/orderActivities', async (req, res) => {
  try {
    const { itemId } = req.query;
    if (!itemId) {
      return res.status(400).json({ error: 'itemId query parameter is required' });
    }
    const activities = await omfService.getOrderActivities(itemId);
    res.json(activities);
  } catch (error) {
    console.error('Error getting order activities:', error.message);
    res.status(500).json({ error: 'Failed to get order activities' });
  }
});

app.get('/api/orders/:orderId/activities', async (req, res) => {
  try {
    const activities = await omfService.getOrderActivitiesForAllItems(req.params.orderId);
    res.json(activities);
  } catch (error) {
    console.error('Error getting all order activities:', error.message);
    res.status(500).json({ error: 'Failed to get order activities' });
  }
});

// Cart Sourcing Endpoints
app.post('/api/sourcing/cart', async (req, res) => {
  try {
    const { cartItems, options } = req.body;
    const sourcing = await omsaService.performCartSourcing(cartItems, options);
    
    // Ensure consistent response format for frontend
    if (sourcing && sourcing.success) {
      res.json({
        success: true,
        data: sourcing.data, // The actual OMSA response
        source: sourcing.source,
        lastUpdated: sourcing.lastUpdated
      });
    } else {
      res.json({
        success: false,
        error: sourcing.error || 'Sourcing request failed',
        source: sourcing.source || 'Unknown',
        lastUpdated: sourcing.lastUpdated || new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error performing cart sourcing:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to perform cart sourcing',
      source: 'Server-Error',
      lastUpdated: new Date().toISOString()
    });
  }
});

app.get('/api/sourcing/cache', async (req, res) => {
  try {
    const cachedSourcing = omsaService.getCachedSourcing();
    res.json(cachedSourcing || { cached: false });
  } catch (error) {
    console.error('Error getting cached sourcing:', error.message);
    res.status(500).json({ error: 'Failed to get cached sourcing' });
  }
});

app.get('/api/products', async (req, res) => {
  const searchQuery = req.query.search || '';
  
  // Use enhanced mock data with OPPS pricing (for both Cloud Foundry and local development)
  if (isCloudFoundry || true) { // Always use enhanced products for now
    console.log('Using enhanced mock data with OPPS pricing integration');
    
    // Enhanced mock products with OPPS pricing integration
    const baseMockProducts = [
      {
        id: '118',
        ean: '9780201379631',
        description: 'RBO Flaschenöffner',
        unit: 'PC',
        image: '/api/images/products/118.jpg',
        inStoreStock: 25,
        onlineStock: 75,
        isAvailable: true
      },
      {
        id: '29',
        ean: '9999999999987',
        description: 'RBO pen',
        unit: 'PC',
        image: '/api/images/products/29.jpg',
        inStoreStock: 120,
        onlineStock: 200,
        isAvailable: true
      },
      {
        id: '32',
        ean: '7321232123811',
        description: 'RBO Notizbuch',
        unit: 'PC',
        image: '/api/images/products/32.jpg',
        inStoreStock: 45,
        onlineStock: 150,
        isAvailable: true
      },
      {
        id: '33',
        ean: '9999999999963',
        description: 'RBO Bag',
        unit: 'PC',
        image: '/api/images/products/33.jpg',
        inStoreStock: 18,
        onlineStock: 35,
        isAvailable: true
      },
      {
        id: '116',
        ean: '9780201379600',
        description: 'RBO Gas cylinder',
        unit: 'PC',
        image: '/api/images/products/116.jpg',
        inStoreStock: 8,
        onlineStock: 20,
        isAvailable: true
      },
      {
        id: '130',
        ean: '1234567890123',
        description: 'RBO Special Item',
        unit: 'PC',
        image: '/api/images/products/130.jpg',
        inStoreStock: 15,
        onlineStock: 45,
        isAvailable: true
      },
      {
        id: '128',
        ean: '1234567890128',
        description: 'RBO Test Item with Availability',
        unit: 'PC',
        image: '/api/images/products/128.jpg',
        inStoreStock: 50,
        onlineStock: 100,
        isAvailable: true
      }
    ];

    // Enrich mock products with real OPPS pricing
    const mockProducts = [];
    const refreshPrices = req.query.refresh === 'true' || req.query.force === 'true';
    
    // Smart price refresh logic: refresh on search but respect caching for performance
    // This will trigger the OPPS service's session-based refresh logic
    const searchOptions = {
      storeId: req.query.storeId || process.env.DEFAULT_STORE_ID,
      forceRefresh: refreshPrices,
      // Use real-time pricing for individual searches (when search is specific)
      batchMode: !searchQuery || searchQuery.trim().length === 0
    };
    
    for (const product of baseMockProducts) {
      try {
        // Get real pricing from OPPS for this product
        const oppsPricing = await oppsService.getProductPricing(product.id, searchOptions);
        
        if (oppsPricing && oppsPricing[product.id]) {
          // Use real OPPS pricing
          mockProducts.push({
            ...product,
            listPrice: oppsPricing[product.id].listPrice,
            salePrice: oppsPricing[product.id].salePrice,
            currency: oppsPricing[product.id].currency,
            priceSource: 'OPPS'
          });
          console.log(`Product ${product.id}: Using OPPS price €${oppsPricing[product.id].listPrice}`);
        } else {
          // Fallback to default pricing
          mockProducts.push({
            ...product,
            listPrice: 19.99,
            salePrice: 19.99,
            currency: 'EUR',
            priceSource: 'fallback'
          });
          console.log(`Product ${product.id}: Using fallback price €19.99`);
        }
      } catch (error) {
        // Fallback pricing on error
        mockProducts.push({
          ...product,
          listPrice: 19.99,
          salePrice: 19.99,
          currency: 'EUR',
          priceSource: 'fallback-error'
        });
        console.log(`Product ${product.id}: Error getting OPPS price, using fallback`);
      }
    }
    
    // Filter products based on search query
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
    return;
  }
  
  // For local development, try to connect to S/4HANA
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
    
    // Return mock data as fallback for local development
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
  
  // Use enhanced mock data with OPPS pricing (for both Cloud Foundry and local development)
  if (isCloudFoundry || true) { // Always use enhanced products for now
    console.log('Using enhanced mock data with OPPS pricing - Product ID:', productId);
    
    const baseMockProducts = {
      '118': {
        id: '118',
        ean: '9780201379631',
        description: 'RBO Flaschenöffner',
        unit: 'PC',
        image: '/api/images/products/118.jpg',
        inStoreStock: 25,
        onlineStock: 75,
        isAvailable: true
      },
      '29': {
        id: '29',
        ean: '9999999999987',
        description: 'RBO pen',
        unit: 'PC',
        image: '/api/images/products/29.jpg',
        inStoreStock: 120,
        onlineStock: 200,
        isAvailable: true
      },
      '32': {
        id: '32',
        ean: '7321232123811',
        description: 'RBO Notizbuch',
        unit: 'PC',
        image: '/api/images/products/32.jpg',
        inStoreStock: 45,
        onlineStock: 150,
        isAvailable: true
      },
      '33': {
        id: '33',
        ean: '9999999999963',
        description: 'RBO Bag',
        unit: 'PC',
        image: '/api/images/products/33.jpg',
        inStoreStock: 18,
        onlineStock: 35,
        isAvailable: true
      },
      '116': {
        id: '116',
        ean: '9780201379600',
        description: 'RBO Gas cylinder',
        unit: 'PC',
        image: '/api/images/products/116.jpg',
        inStoreStock: 8,
        onlineStock: 20,
        isAvailable: true
      },
      '130': {
        id: '130',
        ean: '1234567890123',
        description: 'RBO Special Item',
        unit: 'PC',
        image: '/api/images/products/130.jpg',
        inStoreStock: 15,
        onlineStock: 45,
        isAvailable: true
      },
      '128': {
        id: '128',
        ean: '1234567890128',
        description: 'RBO Test Item with Availability',
        unit: 'PC',
        image: '/api/images/products/128.jpg',
        inStoreStock: 50,
        onlineStock: 100,
        isAvailable: true
      }
    };
    
    const baseProduct = baseMockProducts[productId];
    if (!baseProduct) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    
    try {
      // Force refresh for individual product requests (real-time pricing and availability)
      const refreshPrices = req.query.refresh === 'true' || req.query.force === 'true';
      
      console.log(`Fetching real-time data for product ${productId}`);
      
      // Get real pricing from OPPS for this product
      const oppsPricing = await oppsService.getProductPricing(productId, { 
        storeId: req.query.storeId || process.env.DEFAULT_STORE_ID,
        forceRefresh: refreshPrices,
        batchMode: false // Force individual real-time pricing
      });
      
      // Get real availability from OMSA for this product
      const omsaAvailability = await omsaService.getProductAvailabilityFromAPI(productId, {
        forceRefresh: refreshPrices
      });
      
      let enrichedProduct = { ...baseProduct };
      
      // Apply OPPS pricing if available
      if (oppsPricing && oppsPricing[productId]) {
        enrichedProduct = {
          ...enrichedProduct,
          listPrice: oppsPricing[productId].listPrice,
          salePrice: oppsPricing[productId].salePrice,
          currency: oppsPricing[productId].currency,
          priceSource: 'OPPS-RealTime'
        };
        console.log(`Product ${productId}: Using OPPS real-time price €${oppsPricing[productId].listPrice}`);
      } else {
        // Fallback to default pricing
        enrichedProduct = {
          ...enrichedProduct,
          listPrice: 19.99,
          salePrice: 19.99,
          currency: 'EUR',
          priceSource: 'fallback'
        };
        console.log(`Product ${productId}: Using fallback price €19.99`);
      }
      
      // Apply OMSA availability if available
      if (omsaAvailability) {
        enrichedProduct = {
          ...enrichedProduct,
          inStoreStock: omsaAvailability.inStoreStock,
          onlineStock: omsaAvailability.onlineStock,
          totalStock: omsaAvailability.totalStock,
          isAvailable: omsaAvailability.isAvailable,
          availabilityDetails: {
            sites: omsaAvailability.sites,
            source: omsaAvailability.source,
            lastUpdated: omsaAvailability.lastUpdated
          }
        };
        console.log(`Product ${productId}: Using ${omsaAvailability.source} availability - In Store: ${omsaAvailability.inStoreStock}, Online: ${omsaAvailability.onlineStock}`);
      } else {
        console.log(`Product ${productId}: Using base availability data`);
      }
      
      res.json(enrichedProduct);
    } catch (error) {
      // Fallback pricing on error
      const enrichedProduct = {
        ...baseProduct,
        listPrice: 19.99,
        salePrice: 19.99,
        currency: 'EUR',
        priceSource: 'fallback-error'
      };
      console.log(`Product ${productId}: Error getting OPPS price, using fallback`);
      res.json(enrichedProduct);
    }
    return;
  }
  
  // For local development, try to connect to S/4HANA
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
    
    // Return mock data as fallback for local development
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

// EAN scanning endpoint
app.get('/api/products/scan/:ean', async (req, res) => {
  const ean = req.params.ean;
  
  console.log('EAN scan request for:', ean);
  
  // Use mock data for Cloud Foundry environment
  if (isCloudFoundry) {
    console.log('Using mock data for Cloud Foundry environment - EAN scan:', ean);
    
    const mockProducts = [
      {
        id: '118',
        ean: '9780201379631',
        description: 'RBO Flaschenöffner',
        listPrice: 15.99,
        unit: 'PC',
        image: '/api/images/products/118.jpg',
        inStoreStock: 25,
        onlineStock: 75,
        isAvailable: true
      },
      {
        id: '29',
        ean: '9999999999987',
        description: 'RBO pen',
        listPrice: 3.50,
        unit: 'PC',
        image: '/api/images/products/29.jpg',
        inStoreStock: 120,
        onlineStock: 200,
        isAvailable: true
      },
      {
        id: '32',
        ean: '7321232123811',
        description: 'RBO Notizbuch',
        listPrice: 8.99,
        unit: 'PC',
        image: '/api/images/products/32.jpg',
        inStoreStock: 45,
        onlineStock: 150,
        isAvailable: true
      },
      {
        id: '33',
        ean: '9999999999963',
        description: 'RBO Bag',
        listPrice: 29.99,
        unit: 'PC',
        image: '/api/images/products/33.jpg',
        inStoreStock: 18,
        onlineStock: 35,
        isAvailable: true
      },
      {
        id: '116',
        ean: '9780201379600',
        description: 'RBO Gas cylinder',
        listPrice: 45.00,
        unit: 'PC',
        image: '/api/images/products/116.jpg',
        inStoreStock: 8,
        onlineStock: 20,
        isAvailable: true
      }
    ];
    
    // Find product by exact EAN match
    const product = mockProducts.find(p => p.ean === ean);
    
    if (product) {
      console.log('Product found by EAN:', product.id, product.description);
      res.json(product);
    } else {
      console.log('Product not found for EAN:', ean);
      res.status(404).json({ error: 'Product not found', ean: ean });
    }
    return;
  }
  
  // For local development, try to connect to S/4HANA
  try {
    const config = await getDestinationConfig();
    
    const requestConfig = {
      params: {
        '$format': 'json',
        '$filter': `ProductStandardID eq '${ean}'`,
        '$select': 'Product,ProductStandardID,BaseUnit,ProductGroup,GrossWeight,NetWeight,WeightUnit'
      },
      headers: config.headers,
      proxy: false
    };
    
    // Only add agent for Cloud Foundry (if needed)
    if (config.agent) {
      requestConfig.httpsAgent = config.agent;
    }
    
    // Search products by EAN in S/4HANA
    const response = await axios.get(
      `${config.url}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product`,
      requestConfig
    );

    const products = response.data.d?.results || [];
    
    if (products.length > 0) {
      // Get the first matching product
      const s4Product = products[0];
      
      // Fetch description for this product
      const descriptions = await fetchProductDescriptions([s4Product.Product], config);
      const product = transformProduct(s4Product, descriptions[s4Product.Product]);
      
      console.log('Product found by EAN in S/4HANA:', product.id, product.description);
      res.json(product);
    } else {
      console.log('Product not found for EAN in S/4HANA:', ean);
      res.status(404).json({ error: 'Product not found', ean: ean });
    }
  } catch (error) {
    console.error('Error scanning EAN:', error.message);
    
    // Return mock data as fallback for local development
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
    
    // Find product by exact EAN match
    const product = mockProducts.find(p => p.ean === ean);
    
    if (product) {
      console.log('Product found by EAN in fallback data:', product.id, product.description);
      res.json(product);
    } else {
      console.log('Product not found for EAN in fallback data:', ean);
      res.status(404).json({ error: 'Product not found', ean: ean });
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