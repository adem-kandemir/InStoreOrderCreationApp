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

// Helper function to execute S/4HANA requests via SAP Cloud SDK
async function executeS4HanaRequest(path, options = {}) {
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
  
  try {
    // Escape single quotes in search query (declare at top level for use in catch blocks)
    const escapedQuery = searchQuery.replace(/'/g, "''");
    
    // Build request parameters (no $format - using Accept header instead)
    const requestParams = {
      '$select': 'Product,ProductStandardID,BaseUnit,ProductGroup,GrossWeight,NetWeight,WeightUnit'
    };
    
    // If search query is provided, use direct OData filtering
    if (searchQuery) {
      // Build filter for substring search on Product ID or ProductStandardID (EAN)
      // Use OData v2 substringof function (SAP typically uses OData v2)
      const filter = `substringof('${escapedQuery}',Product) eq true or substringof('${escapedQuery}',ProductStandardID) eq true`;
      requestParams['$filter'] = filter;
      requestParams['$top'] = '10'; // Limit search results
    } else {
      // If no search, return empty results (don't prefetch all products)
      return res.json({
        products: [],
        totalCount: 0,
        message: 'Please enter a search term to find products'
      });
    }
    
    console.log('Searching products with filter:', requestParams['$filter']);
    
    let data;
    let products = [];
    
    try {
      // Try the substringof filter first
      data = await executeS4HanaRequest('/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product', {
        params: requestParams
      });
      products = data.d?.results || [];
    } catch (filterError) {
      console.log('Substringof filter failed, trying startswith filter:', filterError.message);
      
      // Fallback to startswith if substringof doesn't work
      const startswithFilter = `startswith(Product,'${escapedQuery}') eq true or startswith(ProductStandardID,'${escapedQuery}') eq true`;
      requestParams['$filter'] = startswithFilter;
      
      try {
        data = await executeS4HanaRequest('/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product', {
          params: requestParams
        });
        products = data.d?.results || [];
      } catch (startswithError) {
        console.log('Startswith filter also failed, trying exact match:', startswithError.message);
        
        // Final fallback: exact match
        const exactFilter = `Product eq '${escapedQuery}' or ProductStandardID eq '${escapedQuery}'`;
        requestParams['$filter'] = exactFilter;
        
        try {
          data = await executeS4HanaRequest('/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product', {
            params: requestParams
          });
          products = data.d?.results || [];
        } catch (exactError) {
          console.log('All filter attempts failed:', exactError.message);
          throw exactError;
        }
      }
    }
    
    // Fetch descriptions for found products with language preference
    const productIds = products.map(p => p.Product);
    const preferredLanguage = req.headers['accept-language']?.substring(0, 2)?.toUpperCase() || req.query.lang?.toUpperCase() || 'EN';
    const descriptions = await fetchProductDescriptions(productIds, preferredLanguage);
    
    // Transform products with descriptions
    const transformedProducts = products.map(p => 
      transformProduct(p, descriptions[p.Product])
    );
    
    console.log(`Found ${transformedProducts.length} products for search: "${searchQuery}"`);
    
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
    
    // Return error response - no more mock data fallback
    res.status(500).json({
      error: 'Failed to fetch products from S/4HANA',
      message: error.message,
      products: [],
      totalCount: 0
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
      const product = transformProduct(data.d, descriptions[productId]);
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error.message);
    
    // Return error response - no more mock data fallback
    res.status(500).json({ 
      error: 'Failed to fetch product from S/4HANA',
      message: error.message,
      productId: productId
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
      const product = transformProduct(s4Product, descriptions[s4Product.Product]);
      
      console.log('Product found by EAN in S/4HANA:', product.id, product.description);
      res.json(product);
    } else {
      console.log('Product not found for EAN in S/4HANA:', ean);
      res.status(404).json({ error: 'Product not found', ean: ean });
    }
  } catch (error) {
    console.error('Error scanning EAN:', error.message);
    
    // Return error response - no more mock data fallback
    res.status(500).json({ 
      error: 'Failed to scan EAN in S/4HANA',
      message: error.message,
      ean: ean
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