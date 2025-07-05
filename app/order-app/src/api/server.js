const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');

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

// Helper function to execute S/4HANA requests via SAP Cloud SDK or direct connection
async function executeS4HanaRequest(path, options = {}) {
  // Check if running locally (not in Cloud Foundry) - use direct connection
  console.log('DEBUG: isCloudFoundry =', isCloudFoundry, 'CF_INSTANCE_INDEX =', process.env.CF_INSTANCE_INDEX);
  if (!isCloudFoundry) {
    console.log('DEBUG: Using direct connection path');
    return await executeDirectS4HanaRequest(path, options);
  }
  
  console.log('DEBUG: Using Cloud SDK path');
  
  try {
    console.log('Using SAP Cloud SDK to connect to destination RS4');
    
    // Build the URL with properly encoded query parameters
    let fullUrl = path;
    if (options.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        searchParams.append(key, value);
      });
      fullUrl = `${path}?${searchParams.toString()}`;
    }
    
    const requestConfig = {
      method: 'GET',
      url: fullUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    console.log('Executing request via Cloud SDK:', requestConfig);
    
    const response = await executeHttpRequest(
      { destinationName: 'RS4' },
      requestConfig
    );
    
    return response.data;
  } catch (error) {
    console.error('Error in executeS4HanaRequest:', error.message);
    throw error;
  }
}

// Helper function to execute direct S/4HANA requests for local development
async function executeDirectS4HanaRequest(path, options = {}) {
  try {
    console.log('Using direct connection to S/4HANA for local development');
    
    const baseUrl = process.env.S4HANA_BASE_URL || 'http://MERCHANDISE.REALCORE.DE:8000';
    const username = process.env.S4HANA_USERNAME;
    const password = process.env.S4HANA_PASSWORD;
    
    // Build the URL with properly encoded query parameters
    let fullUrl = path;
    if (options.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        searchParams.append(key, value);
      });
      fullUrl = `${path}?${searchParams.toString()}`;
    }
    
    const requestConfig = {
      method: 'GET',
      url: `${baseUrl}${fullUrl}`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };
    
    // Add Basic Authentication if credentials are provided
    if (username && password) {
      requestConfig.auth = {
        username: username,
        password: password
      };
      console.log('Using Basic Authentication for S/4HANA connection');
    } else {
      console.warn('No S/4HANA credentials found. Set S4HANA_USERNAME and S4HANA_PASSWORD in env.local');
    }
    
    console.log('Executing direct request:', {
      ...requestConfig,
      auth: requestConfig.auth ? { username: requestConfig.auth.username, password: '[HIDDEN]' } : undefined
    });
    
    const response = await axios.get(requestConfig.url, {
      headers: requestConfig.headers,
      timeout: requestConfig.timeout,
      auth: requestConfig.auth
    });
    
    return response.data;
  } catch (error) {
    console.error('Error in executeDirectS4HanaRequest:', error.message);
    throw error;
  }
}

// Helper function to fetch data from on-premise system (using SAP Cloud SDK)
async function fetchFromOnPremise(path, options = {}) {
  try {
    console.log('Fetching from S/4HANA:', path);
    return await executeS4HanaRequest(path, options);
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

// Helper function to fetch product descriptions with language preference
async function fetchProductDescriptions(productIds, preferredLanguage = 'EN') {
  try {
    if (productIds.length === 0) return {};
    
    const descriptions = {};
    
    // Fetch descriptions for each product using navigation property
    for (const productId of productIds) {
      try {
        const data = await executeS4HanaRequest(`/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product('${productId}')/to_Description`, {
          params: {}
        });
        
        if (data && data.d && data.d.results) {
          const availableDescriptions = data.d.results;
          let selectedDescription = '';
          
          // Language selection logic:
          // 1. Try preferred language first
          let preferredDesc = availableDescriptions.find(desc => desc.Language === preferredLanguage);
          if (preferredDesc) {
            selectedDescription = preferredDesc.ProductDescription;
          } else {
            // 2. If preferred language not found, try English
            let englishDesc = availableDescriptions.find(desc => desc.Language === 'EN');
            if (englishDesc) {
              selectedDescription = englishDesc.ProductDescription;
            } else {
              // 3. If English not found, take the first available description
              if (availableDescriptions.length > 0) {
                selectedDescription = availableDescriptions[0].ProductDescription;
              }
            }
          }
          
          descriptions[productId] = selectedDescription;
          console.log(`Product ${productId}: Using description "${selectedDescription}" (language priority: ${preferredLanguage} -> EN -> first available)`);
        }
      } catch (error) {
        console.error(`Error fetching description for product ${productId}:`, error.message);
        descriptions[productId] = `Product ${productId}`; // Fallback
      }
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

// Enhanced product transformation with OPPS pricing and OMSA availability
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
      console.log(`OPPS: Using real pricing for product ${productId}: €${pricing.listPrice}`);
    } else {
      console.log(`OPPS: No pricing found for product ${productId}, using fallback`);
    }
  } catch (error) {
    console.log(`OPPS: Error getting pricing for product ${productId}, using fallback:`, error.message);
  }

  // Get real availability from OMSA
  let availability = { 
    inStoreStock: 0, 
    onlineStock: 0, 
    isAvailable: false 
  }; // Default fallback
  
  try {
    const omsaAvailability = await omsaService.getProductAvailabilityFromAPI(productId, { storeId });
    if (omsaAvailability && omsaAvailability.hasData !== false) {
      availability = {
        inStoreStock: omsaAvailability.inStoreStock || 0,
        onlineStock: omsaAvailability.onlineStock || 0,
        isAvailable: omsaAvailability.isAvailable || false
      };
      console.log(`OMSA: Using real availability for product ${productId}: Store=${availability.inStoreStock}, Online=${availability.onlineStock}`);
    } else {
      console.log(`OMSA: No availability data for product ${productId}, using fallback`);
      // Use mock data as fallback when OMSA is not available
      availability = {
        inStoreStock: Math.floor(Math.random() * 100),
        onlineStock: Math.floor(Math.random() * 100),
        isAvailable: true
      };
    }
  } catch (error) {
    console.log(`OMSA: Error getting availability for product ${productId}, using fallback:`, error.message);
    // Use mock data as fallback when OMSA fails
    availability = {
      inStoreStock: Math.floor(Math.random() * 100),
      onlineStock: Math.floor(Math.random() * 100),
      isAvailable: true
    };
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
    inStoreStock: availability.inStoreStock,
    onlineStock: availability.onlineStock,
    isAvailable: availability.isAvailable
  };
}

// Search products by Product ID and ProductStandardID (EAN)
async function searchProductsByFields(escapedQuery) {
  const requestParams = {
    '$select': 'Product,ProductStandardID,BaseUnit,ProductGroup,GrossWeight,NetWeight,WeightUnit',
    '$top': '10'
  };
  
  try {
    // Try substringof filter first
    const filter = `substringof('${escapedQuery}',Product) eq true or substringof('${escapedQuery}',ProductStandardID) eq true`;
    requestParams['$filter'] = filter;
    
    console.log('Searching products by fields with filter:', filter);
    
    const data = await executeS4HanaRequest('/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product', {
      params: requestParams
    });
    return data.d?.results || [];
  } catch (filterError) {
    console.log('Substringof filter failed, trying startswith filter:', filterError.message);
    
    // Fallback to startswith if substringof doesn't work
    const startswithFilter = `startswith(Product,'${escapedQuery}') eq true or startswith(ProductStandardID,'${escapedQuery}') eq true`;
    requestParams['$filter'] = startswithFilter;
    
    try {
      const data = await executeS4HanaRequest('/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product', {
        params: requestParams
      });
      return data.d?.results || [];
    } catch (startswithError) {
      console.log('Startswith filter also failed, trying exact match:', startswithError.message);
      
      // Final fallback: exact match
      const exactFilter = `Product eq '${escapedQuery}' or ProductStandardID eq '${escapedQuery}'`;
      requestParams['$filter'] = exactFilter;
      
      try {
        const data = await executeS4HanaRequest('/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product', {
          params: requestParams
        });
        return data.d?.results || [];
      } catch (exactError) {
        console.log('All product field filter attempts failed:', exactError.message);
        // If all attempts failed with 502, throw the error to trigger proper error handling
        if (exactError.message.includes('502')) {
          throw exactError;
        }
        return [];
      }
    }
  }
}

// Search products by description using A_ProductDescription
async function searchProductsByDescription(escapedQuery, preferredLanguage = 'EN') {
  try {
    console.log(`Searching product descriptions for: "${escapedQuery}" in language: ${preferredLanguage}`);
    
    // Build filter for description search
    // Search in ProductDescription field with language preference
    const descriptionFilter = `substringof('${escapedQuery}',ProductDescription) eq true and Language eq '${preferredLanguage}'`;
    
    const requestParams = {
      '$select': 'Product,Language,ProductDescription',
      '$filter': descriptionFilter,
      '$top': '10'
    };
    
    console.log('Searching descriptions with filter:', descriptionFilter);
    
    let descriptionData;
    try {
      // Try with preferred language first
      descriptionData = await executeS4HanaRequest('/sap/opu/odata/sap/API_PRODUCT_SRV/A_ProductDescription', {
        params: requestParams
      });
    } catch (langError) {
      console.log(`Description search failed for language ${preferredLanguage}, trying without language filter:`, langError.message);
      
      // Fallback: search without language filter
      const generalFilter = `substringof('${escapedQuery}',ProductDescription) eq true`;
      requestParams['$filter'] = generalFilter;
      
      try {
        descriptionData = await executeS4HanaRequest('/sap/opu/odata/sap/API_PRODUCT_SRV/A_ProductDescription', {
          params: requestParams
        });
      } catch (generalError) {
        console.log('Description search with substringof failed, trying startswith:', generalError.message);
        
        // Try startswith as fallback
        const startswithFilter = `startswith(ProductDescription,'${escapedQuery}') eq true`;
        requestParams['$filter'] = startswithFilter;
        
        try {
          descriptionData = await executeS4HanaRequest('/sap/opu/odata/sap/API_PRODUCT_SRV/A_ProductDescription', {
            params: requestParams
          });
        } catch (startswithError) {
          console.log('All description filter attempts failed:', startswithError.message);
          // If all attempts failed with 502, throw the error to trigger proper error handling
          if (startswithError.message.includes('502')) {
            throw startswithError;
          }
          return [];
        }
      }
    }
    
    const descriptions = descriptionData.d?.results || [];
    console.log(`Found ${descriptions.length} matching descriptions`);
    
    if (descriptions.length === 0) {
      return [];
    }
    
    // Get unique product IDs from description results
    const productIds = [...new Set(descriptions.map(d => d.Product))];
    
    // Fetch the actual product data for these IDs
    const productPromises = productIds.map(async (productId) => {
      try {
        const productData = await executeS4HanaRequest(`/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product('${productId}')`, {
          params: {
            '$select': 'Product,ProductStandardID,BaseUnit,ProductGroup,GrossWeight,NetWeight,WeightUnit'
          }
        });
        return productData.d;
      } catch (error) {
        console.log(`Failed to fetch product ${productId}:`, error.message);
        return null;
      }
    });
    
    const products = await Promise.all(productPromises);
    return products.filter(p => p !== null);
    
  } catch (error) {
    console.error('Error searching product descriptions:', error.message);
    return [];
  }
}

// Helper function to check if service is configured
function isServiceConfigured(serviceName) {
  const systemUpper = serviceName.toUpperCase();
  
  // Check environment variables first
  if (process.env[`${systemUpper}_BASE_URL`]) {
    return 'configured';
  }
  
  // Check VCAP_SERVICES for bound services
  try {
    const vcapServices = JSON.parse(process.env.VCAP_SERVICES || '{}');
    const serviceKey = `${serviceName.toLowerCase()}-credentials`;
    const boundService = vcapServices['user-provided']?.find(service => 
      service.name === serviceKey
    );
    
    if (boundService && boundService.credentials && boundService.credentials.base_url) {
      return 'configured';
    }
  } catch (error) {
    // VCAP_SERVICES parsing failed, continue to fallback check
  }
  
  return 'fallback';
}

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: isCloudFoundry ? 'Cloud Foundry' : 'Local Development',
    services: {
      opps: isServiceConfigured('opps'),
      omsa: isServiceConfigured('omsa'),
      omf: isServiceConfigured('omf')
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
  
  try {
    // Escape single quotes in search query (declare at top level for use in catch blocks)
    const escapedQuery = searchQuery.replace(/'/g, "''");
    
    // If search query is provided, use direct OData filtering
    if (searchQuery) {
      console.log(`Searching products for: "${searchQuery}"`);
      
      // Get language preference
      const preferredLanguage = req.headers['accept-language']?.substring(0, 2)?.toUpperCase() || req.query.lang?.toUpperCase() || 'EN';
      
      // Search in both A_Product and A_ProductDescription
      const [productResults, descriptionResults] = await Promise.all([
        searchProductsByFields(escapedQuery),
        searchProductsByDescription(escapedQuery, preferredLanguage)
      ]);
      
      // Combine results and remove duplicates
      const allProducts = [...productResults, ...descriptionResults];
      const uniqueProducts = allProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.Product === product.Product)
      );
      
      // Fetch descriptions for all found products
      const productIds = uniqueProducts.map(p => p.Product);
      const descriptions = await fetchProductDescriptions(productIds, preferredLanguage);
      
      // Transform products with descriptions
      const transformedProducts = uniqueProducts.map(p => 
        transformProduct(p, descriptions[p.Product])
      );
      
      console.log(`Found ${transformedProducts.length} products for search: "${searchQuery}"`);
      
      res.json({
        products: transformedProducts,
        totalCount: transformedProducts.length
      });
    } else {
      // If no search, return empty results (don't prefetch all products)
      return res.json({
        products: [],
        totalCount: 0,
        message: 'Please enter a search term to find products'
      });
    }
  } catch (error) {
    console.error('Error fetching products:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    // Determine error type for better user experience
    let errorType = 'unknown';
    let userMessage = 'Unable to search products at this time';
    
    if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
      errorType = 'system_unavailable';
      userMessage = 'The product system is temporarily unavailable. Please try again later.';
    } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      errorType = 'timeout';
      userMessage = 'The request timed out. Please try again.';
    } else if (error.message.includes('401') || error.message.includes('403')) {
      errorType = 'authentication';
      userMessage = 'Authentication error. Please contact support.';
    } else if (error.message.includes('404')) {
      errorType = 'service_not_found';
      userMessage = 'Product service not found. Please contact support.';
    }
    
    // Return user-friendly error response
    res.status(503).json({
      error: 'Service temporarily unavailable',
      errorType: errorType,
      userMessage: userMessage,
      technicalMessage: error.message,
      products: [],
      totalCount: 0,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  
  try {
    // Fetch specific product from S/4HANA using SAP Cloud SDK
    const data = await executeS4HanaRequest(`/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product('${productId}')`, {
      params: {
        '$select': 'Product,ProductStandardID,BaseUnit,ProductGroup,GrossWeight,NetWeight,WeightUnit'
      }
    });

    if (data && data.d) {
      // Fetch description for this product with language preference
      const preferredLanguage = req.headers['accept-language']?.substring(0, 2)?.toUpperCase() || req.query.lang?.toUpperCase() || 'EN';
      const descriptions = await fetchProductDescriptions([productId], preferredLanguage);
      const product = await transformProductWithPricing(data.d, descriptions[productId]);
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error.message);
    
    // Determine error type for better user experience
    let errorType = 'unknown';
    let userMessage = 'Unable to load product details at this time';
    
    if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
      errorType = 'system_unavailable';
      userMessage = 'The product system is temporarily unavailable. Please try again later.';
    } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      errorType = 'timeout';
      userMessage = 'The request timed out. Please try again.';
    } else if (error.message.includes('401') || error.message.includes('403')) {
      errorType = 'authentication';
      userMessage = 'Authentication error. Please contact support.';
    } else if (error.message.includes('404')) {
      errorType = 'service_not_found';
      userMessage = 'Product service not found. Please contact support.';
    }
    
    // Return user-friendly error response
    res.status(503).json({ 
      error: 'Service temporarily unavailable',
      errorType: errorType,
      userMessage: userMessage,
      technicalMessage: error.message,
      productId: productId,
      timestamp: new Date().toISOString()
    });
  }
});

// EAN scanning endpoint
app.get('/api/products/scan/:ean', async (req, res) => {
  const ean = req.params.ean;
  
  console.log('EAN scan request for:', ean);
  
  try {
    // Search products by EAN in S/4HANA using SAP Cloud SDK
    const data = await executeS4HanaRequest('/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product', {
      params: {
        '$filter': `ProductStandardID eq '${ean}'`,
        '$select': 'Product,ProductStandardID,BaseUnit,ProductGroup,GrossWeight,NetWeight,WeightUnit'
      }
    });

    const products = data.d?.results || [];
    
    if (products.length > 0) {
      // Get the first matching product
      const s4Product = products[0];
      
      // Fetch description for this product with language preference
      const preferredLanguage = req.headers['accept-language']?.substring(0, 2)?.toUpperCase() || req.query.lang?.toUpperCase() || 'EN';
      const descriptions = await fetchProductDescriptions([s4Product.Product], preferredLanguage);
      const product = await transformProductWithPricing(s4Product, descriptions[s4Product.Product]);
      
      console.log('Product found by EAN in S/4HANA:', product.id, product.description);
      res.json(product);
    } else {
      console.log('Product not found for EAN in S/4HANA:', ean);
      res.status(404).json({ error: 'Product not found', ean: ean });
    }
  } catch (error) {
    console.error('Error scanning EAN:', error.message);
    
    // Determine error type for better user experience
    let errorType = 'unknown';
    let userMessage = 'Unable to scan barcode at this time';
    
    if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
      errorType = 'system_unavailable';
      userMessage = 'The product system is temporarily unavailable. Please try again later.';
    } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      errorType = 'timeout';
      userMessage = 'The request timed out. Please try again.';
    } else if (error.message.includes('401') || error.message.includes('403')) {
      errorType = 'authentication';
      userMessage = 'Authentication error. Please contact support.';
    } else if (error.message.includes('404')) {
      errorType = 'service_not_found';
      userMessage = 'Product service not found. Please contact support.';
    }
    
    // Return user-friendly error response
    res.status(503).json({ 
      error: 'Service temporarily unavailable',
      errorType: errorType,
      userMessage: userMessage,
      technicalMessage: error.message,
      ean: ean,
      timestamp: new Date().toISOString()
    });
  }
});

// Product image endpoint (placeholder)
app.get('/api/products/:id/image', (req, res) => {
  // In a real implementation, this would fetch from a document service
  // For now, return a placeholder or redirect to a default image
  res.redirect(`/assets/images/products/${req.params.id}.jpg`);
});

// Test endpoint to check destination connectivity
app.get('/api/test-destination', async (req, res) => {
  try {
    console.log('Testing destination RS4 connectivity...');
    
    // Try different common S/4HANA OData service paths
    const servicePaths = [
      '/sap/opu/odata/sap/API_PRODUCT_SRV/$metadata',
      '/sap/opu/odata/sap/API_PRODUCT_SRV',
      '/sap/opu/odata/SAP/API_PRODUCT_SRV/$metadata',
      '/sap/opu/odata/SAP/API_PRODUCT_SRV'
    ];
    
    for (const servicePath of servicePaths) {
      try {
        console.log(`Trying service path: ${servicePath}`);
        const data = await executeS4HanaRequest(servicePath, {
          params: servicePath.includes('$metadata') ? {} : { '$top': '1' }
        });
        
        console.log(`SUCCESS: Service path ${servicePath} is working!`);
        return res.json({ 
          status: 'success', 
          message: `OData service found at path: ${servicePath}`,
          workingPath: servicePath,
          serviceAvailable: true
        });
      } catch (error) {
        console.log(`Failed service path ${servicePath}: ${error.message}`);
        continue;
      }
    }
    
    // If all service paths fail, try basic connectivity
    try {
      const fallbackData = await executeS4HanaRequest('/sap/bc/ping', {
        params: {}
      });
      
      console.log('Basic connectivity test successful');
      res.json({ 
        status: 'partial_success', 
        message: 'Destination RS4 is reachable but OData service path not found',
        basicConnectivity: true,
        testedPaths: servicePaths
      });
    } catch (basicError) {
      console.error('Basic connectivity test also failed:', basicError.message);
      
      res.status(500).json({ 
        status: 'error', 
        message: 'Destination RS4 connection failed',
        testedPaths: servicePaths,
        basicError: basicError.message
      });
    }
  } catch (error) {
    console.error('Test destination failed:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Test destination failed',
      error: error.message
    });
  }
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