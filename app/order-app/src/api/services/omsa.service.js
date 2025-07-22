const axios = require('axios');
const authService = require('./auth.service');

/**
 * OMSA (Sourcing and Availability Service)
 * Handles product sourcing and availability-related API calls
 */
class OmsaService {
  constructor() {
    this.systemName = 'OMSA';
    this.authService = authService;
    this.baseUrl = null;
    this.tokenCache = new Map();
    this.availabilityCache = new Map();
    this.lastCacheUpdate = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Cache for sourcing data
    this.sourcingCache = null;
    this.sourcingTimestamp = null;
    
    // Site mapping for inventory availability
    this.siteMapping = {
      '1100': { type: 'online', name: 'Online Store 1100' },    // Online distribution center
      '1104': { type: 'store', name: 'Store 1104' },    // In-store location
      '1106': { type: 'store', name: 'Store 1106' },    // In-store location
      '1105': { type: 'store', name: 'Store 1105' },    // In-store location
      '1107': { type: 'store', name: 'Store 1107' }     // In-store location  
    };
    
    this.initialize();
  }

  /**
   * Initialize OMSA service with credentials
   */
  async initialize() {
    try {
      const credentials = this.authService.getSystemCredentials('OMSA');
      this.baseUrl = credentials.baseUrl;
      console.log('OMSA: Service initialized with base URL:', this.baseUrl);
    } catch (error) {
      console.error('OMSA: Failed to initialize service:', error.message);
      console.log('OMSA: No availability data will be available');
    }
  }

  /**
   * Get product availability information
   * @param {string|Array} productIds - Single product ID or array of product IDs
   * @param {Object} options - Additional options (store, location, etc.)
   * @returns {Promise<Object>} Availability information
   */
  async getProductAvailability(productIds, options = {}) {
    try {
      const ids = Array.isArray(productIds) ? productIds : [productIds];
      
      const requestData = {
        productIds: ids,
        storeId: options.storeId || process.env.DEFAULT_STORE_ID,
        locationId: options.locationId,
        channel: options.channel || 'INSTORE',
        requestedQuantity: options.quantity || 1
      };

      const response = await this.authService.makeAuthenticatedRequest(
        this.systemName,
        '/api/v1/availability/products',
        {
          method: 'POST',
          data: requestData
        }
      );

      return this.transformAvailabilityResponse(response);
    } catch (error) {
      console.error('Error getting product availability:', error.message);
      
      // Return no availability data on error
      const ids = Array.isArray(productIds) ? productIds : [productIds];
      const noAvailabilityData = {};
      
      ids.forEach(id => {
        noAvailabilityData[id] = {
          productId: id,
          isAvailable: false,
          totalAvailable: 0,
          inStoreStock: 0,
          warehouseStock: 0,
          source: 'OMSA-Error',
          error: error.message,
          lastUpdated: new Date().toISOString(),
          hasData: false
        };
      });
      
      return noAvailabilityData;
    }
  }

  /**
   * Get product sourcing information (where to source from)
   * @param {string|Array} productIds - Single product ID or array of product IDs
   * @param {Object} options - Additional options (store, quantity, etc.)
   * @returns {Promise<Object>} Sourcing information
   */
  async getProductSourcing(productIds, options = {}) {
    try {
      const ids = Array.isArray(productIds) ? productIds : [productIds];
      
      const requestData = {
        productIds: ids,
        storeId: options.storeId || process.env.DEFAULT_STORE_ID,
        requestedQuantity: options.quantity || 1,
        deliveryDate: options.deliveryDate,
        preferredSources: options.preferredSources || ['INSTORE', 'WAREHOUSE', 'SUPPLIER']
      };

      const response = await this.authService.makeAuthenticatedRequest(
        this.systemName,
        '/api/v1/sourcing/products',
        {
          method: 'POST',
          data: requestData
        }
      );

      return this.transformSourcingResponse(response);
    } catch (error) {
      console.error('Error getting product sourcing:', error.message);
      
      // Return no sourcing data on error
      const ids = Array.isArray(productIds) ? productIds : [productIds];
      const noSourcingData = {};
      
      ids.forEach(id => {
        noSourcingData[id] = {
          productId: id,
          sources: [],
          recommendedSource: null,
          estimatedFulfillment: null,
          source: 'OMSA-Error',
          error: error.message,
          hasData: false
        };
      });
      
      return noSourcingData;
    }
  }

  /**
   * Get stock levels for products across different locations
   * @param {string|Array} productIds - Single product ID or array of product IDs
   * @param {Object} options - Additional options (locations, etc.)
   * @returns {Promise<Object>} Stock level information
   */
  async getStockLevels(productIds, options = {}) {
    try {
      const ids = Array.isArray(productIds) ? productIds : [productIds];
      
      const requestData = {
        productIds: ids,
        storeId: options.storeId || process.env.DEFAULT_STORE_ID,
        includeLocations: options.includeLocations || ['INSTORE', 'WAREHOUSE'],
        includeReserved: options.includeReserved || false
      };

      const response = await this.authService.makeAuthenticatedRequest(
        this.systemName,
        '/api/v1/stock/products',
        {
          method: 'POST',
          data: requestData
        }
      );

      return this.transformStockResponse(response);
    } catch (error) {
      console.error('Error getting stock levels:', error.message);
      
      // Return no stock data on error
      const ids = Array.isArray(productIds) ? productIds : [productIds];
      const noStockData = {};
      
      ids.forEach(id => {
        noStockData[id] = {
          productId: id,
          locations: [],
          totalStock: 0,
          availableStock: 0,
          reservedStock: 0,
          source: 'OMSA-Error',
          error: error.message,
          hasData: false
        };
      });
      
      return noStockData;
    }
  }

  /**
   * Reserve stock for products (temporary hold before order confirmation)
   * @param {Array} reservations - Array of reservation requests
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Reservation results
   */
  async reserveStock(reservations, options = {}) {
    try {
      const requestData = {
        reservations: reservations.map(res => ({
          productId: res.productId,
          quantity: res.quantity,
          storeId: res.storeId || process.env.DEFAULT_STORE_ID,
          customerId: res.customerId || options.customerId,
          reservationTimeout: res.timeout || 1800000 // 30 minutes default
        })),
        orderId: options.orderId,
        sessionId: options.sessionId
      };

      const response = await this.authService.makeAuthenticatedRequest(
        this.systemName,
        '/api/v1/stock/reserve',
        {
          method: 'POST',
          data: requestData
        }
      );

      return this.transformReservationResponse(response);
    } catch (error) {
      console.error('Error reserving stock:', error.message);
      
      // Return failed reservation on error
      return {
        success: false,
        reservations: [],
        sessionId: null,
        expiresAt: null,
        source: 'OMSA-Error',
        error: error.message,
        hasData: false
      };
    }
  }

  /**
   * Release stock reservations
   * @param {string|Array} reservationIds - Reservation IDs to release
   * @returns {Promise<Object>} Release results
   */
  async releaseStockReservation(reservationIds) {
    try {
      const ids = Array.isArray(reservationIds) ? reservationIds : [reservationIds];
      
      const requestData = {
        reservationIds: ids
      };

      const response = await this.authService.makeAuthenticatedRequest(
        this.systemName,
        '/api/v1/stock/release',
        {
          method: 'POST',
          data: requestData
        }
      );

      return response;
    } catch (error) {
      console.error('Error releasing stock reservation:', error.message);
      throw error;
    }
  }

  /**
   * Transform OMSA availability response to standardized format
   * @param {Object} response - Raw OMSA response
   * @returns {Object} Transformed response
   */
  transformAvailabilityResponse(response) {
    const transformed = {};
    
    if (response.products) {
      response.products.forEach(product => {
        transformed[product.productId] = {
          productId: product.productId,
          isAvailable: product.isAvailable || false,
          totalAvailable: parseInt(product.totalAvailable || 0),
          inStoreStock: parseInt(product.inStoreStock || 0),
          warehouseStock: parseInt(product.warehouseStock || 0),
          estimatedDelivery: product.estimatedDelivery,
          lastUpdated: product.lastUpdated || new Date().toISOString()
        };
      });
    }

    return transformed;
  }

  /**
   * Transform OMSA sourcing response to standardized format
   * @param {Object} response - Raw OMSA response
   * @returns {Object} Transformed response
   */
  transformSourcingResponse(response) {
    const transformed = {};
    
    if (response.products) {
      response.products.forEach(product => {
        transformed[product.productId] = {
          productId: product.productId,
          sources: product.sources || [],
          recommendedSource: product.recommendedSource,
          estimatedFulfillment: product.estimatedFulfillment
        };
      });
    }

    return transformed;
  }

  /**
   * Transform OMSA stock response to standardized format
   * @param {Object} response - Raw OMSA response
   * @returns {Object} Transformed response
   */
  transformStockResponse(response) {
    const transformed = {};
    
    if (response.products) {
      response.products.forEach(product => {
        transformed[product.productId] = {
          productId: product.productId,
          locations: product.locations || [],
          totalStock: parseInt(product.totalStock || 0),
          availableStock: parseInt(product.availableStock || 0),
          reservedStock: parseInt(product.reservedStock || 0)
        };
      });
    }

    return transformed;
  }

  /**
   * Transform OMSA reservation response to standardized format
   * @param {Object} response - Raw OMSA response
   * @returns {Object} Transformed response
   */
  transformReservationResponse(response) {
    const transformed = {
      success: response.success || false,
      reservations: response.reservations || [],
      sessionId: response.sessionId,
      expiresAt: response.expiresAt
    };

    return transformed;
  }

  /**
   * Fallback availability for development/testing
   * @param {string|Array} productIds - Product IDs
   * @returns {Object} Fallback availability data
   */
  getFallbackAvailability(productIds) {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    const fallback = {};
    
    ids.forEach(id => {
      fallback[id] = {
        productId: id,
        isAvailable: true,
        totalAvailable: Math.floor(Math.random() * 100) + 10,
        inStoreStock: Math.floor(Math.random() * 50) + 5,
        warehouseStock: Math.floor(Math.random() * 100) + 20,
        estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      };
    });

    return fallback;
  }

  /**
   * Fallback sourcing for development/testing
   * @param {string|Array} productIds - Product IDs
   * @returns {Object} Fallback sourcing data
   */
  getFallbackSourcing(productIds) {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    const fallback = {};
    
    ids.forEach(id => {
      fallback[id] = {
        productId: id,
        sources: [
          { location: 'INSTORE', available: true, quantity: Math.floor(Math.random() * 50) + 5 },
          { location: 'WAREHOUSE', available: true, quantity: Math.floor(Math.random() * 100) + 20 }
        ],
        recommendedSource: 'INSTORE',
        estimatedFulfillment: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        source: 'fallback'
      };
    });

    return fallback;
  }

  /**
   * Fallback stock levels for development/testing
   * @param {string|Array} productIds - Product IDs
   * @returns {Object} Fallback stock data
   */
  getFallbackStockLevels(productIds) {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    const fallback = {};
    
    ids.forEach(id => {
      const totalStock = Math.floor(Math.random() * 150) + 25;
      const reservedStock = Math.floor(Math.random() * 10);
      
      fallback[id] = {
        productId: id,
        locations: [
          { location: 'INSTORE', stock: Math.floor(Math.random() * 50) + 5 },
          { location: 'WAREHOUSE', stock: Math.floor(Math.random() * 100) + 20 }
        ],
        totalStock: totalStock,
        availableStock: totalStock - reservedStock,
        reservedStock: reservedStock,
        source: 'fallback'
      };
    });

    return fallback;
  }

  /**
   * Fallback reservation for development/testing
   * @param {Array} reservations - Reservation requests
   * @returns {Object} Fallback reservation data
   */
  getFallbackReservation(reservations) {
    return {
      success: true,
      reservations: reservations.map(res => ({
        productId: res.productId,
        quantity: res.quantity,
        reservationId: `FALLBACK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'RESERVED'
      })),
      sessionId: `FALLBACK_SESSION_${Date.now()}`,
      expiresAt: new Date(Date.now() + 1800000).toISOString(), // 30 minutes
      source: 'fallback'
    };
  }

  /**
   * Get product availability from OMSA API
   * @param {string} productId - Product ID
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Availability data
   */
  async getProductAvailabilityFromAPI(productId, options = {}) {
    try {
      if (!this.baseUrl) {
        console.log('OMSA: No base URL configured, no availability data available');
        return {
          productId: productId,
          inStoreStock: 0,
          onlineStock: 0,
          totalStock: 0,
          isAvailable: false,
          sites: [],
          source: 'OMSA-NotConfigured',
          lastUpdated: new Date().toISOString(),
          hasData: false
        };
      }

      // Check cache first (unless force refresh)
      if (!options.forceRefresh && this.availabilityCache.has(productId)) {
        const cached = this.availabilityCache.get(productId);
        if (cached.timestamp > Date.now() - this.cacheTimeout) {
          console.log(`OMSA: Using cached availability for product ${productId}`);
          return cached.data;
        }
      }

      console.log(`OMSA: Fetching real-time availability for product ${productId}`);
      
      // Get access token
      console.log(`OMSA: Attempting to get access token...`);
      const token = await this.authService.getAccessToken('OMSA');
      console.log(`OMSA: Access token obtained successfully`);
      
      // Prepare request body with correct OMSA API format
      const requestBody = {
        items: [
          {
            product: {
              id: productId
            },
            unitOfMeasure: {
              salesUnitCode: "PCE"
            }
          }
        ],
        sites: [
          {
            id: "1100"
          },
          {
            id: "1104"
          },
          {
            id: "1106"
          },
          {
            id: "1105"
          },
          {
            id: "1107"
          }
        ]
      };

      // Make API call
      console.log(`OMSA: Making API call to ${this.baseUrl}/v1/inventory/availableToSellBySite`);
      console.log(`OMSA: Request body:`, JSON.stringify(requestBody, null, 2));
      
      const response = await axios.post(
        `${this.baseUrl}/v1/inventory/availableToSellBySite`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log(`OMSA: Received availability response for product ${productId}`);
      console.log(`OMSA: Response data:`, JSON.stringify(response.data, null, 2));
      
      // Transform response to our format
      const availability = this.transformAvailabilityResponse(response.data, productId);
      
      // Cache the result
      this.availabilityCache.set(productId, {
        data: availability,
        timestamp: Date.now()
      });
      
      return availability;

    } catch (error) {
      console.error(`OMSA: Error fetching availability for product ${productId}:`, error.message);
      
      if (error.response) {
        console.error('OMSA: Response status:', error.response.status);
        console.error('OMSA: Response data:', error.response.data);
      }
      
      // Return no availability data on error
      console.log('OMSA: No availability data available due to error');
      return {
        productId: productId,
        inStoreStock: 0,
        onlineStock: 0,
        totalStock: 0,
        isAvailable: false,
        sites: [],
        source: 'OMSA-Error',
        error: error.message,
        lastUpdated: new Date().toISOString(),
        hasData: false
      };
    }
  }

  /**
   * Transform OMSA API response to our product format
   * @param {Object} omsaResponse - Raw OMSA API response
   * @param {string} productId - Product ID
   * @returns {Object} Transformed availability data
   */
  transformAvailabilityResponse(omsaResponse, productId) {
    try {
      if (!omsaResponse.items || omsaResponse.items.length === 0) {
        console.warn(`OMSA: No availability data found for product ${productId}`);
        return {
          productId: productId,
          inStoreStock: 0,
          onlineStock: 0,
          totalStock: 0,
          isAvailable: false,
          sites: [],
          source: 'OMSA-NoData',
          lastUpdated: new Date().toISOString(),
          hasData: false
        };
      }

      const item = omsaResponse.items[0];
      let inStoreStock = 0;
      let onlineStock = 0;
      const siteDetails = [];

      if (item.quantityBySites) {
        item.quantityBySites.forEach(siteData => {
          const siteId = siteData.site.id;
          const siteInfo = this.siteMapping[siteId];
          
          if (siteData.timelines && siteData.timelines.length > 0) {
            const timeline = siteData.timelines[0]; // Use first timeline
            const quantity = timeline.quantity || 0;
            
            siteDetails.push({
              siteId: siteId,
              siteName: siteInfo?.name || `Site ${siteId}`,
              siteType: siteInfo?.type || 'unknown',
              quantity: quantity,
              availableFrom: timeline.availableFrom
            });

            // Aggregate quantities by type
            if (siteInfo?.type === 'store') {
              inStoreStock += quantity;
            } else if (siteInfo?.type === 'online') {
              onlineStock += quantity;
            }
          }
        });
      }

      const result = {
        productId: productId,
        inStoreStock: inStoreStock,
        onlineStock: onlineStock,
        totalStock: inStoreStock + onlineStock,
        isAvailable: (inStoreStock + onlineStock) > 0,
        sites: siteDetails,
        source: 'OMSA-RealTime',
        lastUpdated: new Date().toISOString()
      };

      console.log(`OMSA: Product ${productId} availability - In Store: ${inStoreStock}, Online: ${onlineStock}`);
      return result;

    } catch (error) {
      console.error('OMSA: Error transforming response:', error.message);
      return {
        productId: productId,
        inStoreStock: 0,
        onlineStock: 0,
        totalStock: 0,
        isAvailable: false,
        sites: [],
        source: 'OMSA-TransformError',
        error: error.message,
        lastUpdated: new Date().toISOString(),
        hasData: false
      };
    }
  }

  /**
   * Get fallback availability data with 3-site structure for development/testing
   * @param {string} productId - Product ID
   * @returns {Object} Mock availability data
   */
  getNewFallbackAvailability(productId) {
    // Mock data based on the 3 sites with varying stock levels
    const mockData = {
      '29': { inStore: 120, online: 200 },
      '32': { inStore: 45, online: 80 },
      '118': { inStore: 25, online: 75 },
      '123': { inStore: 15, online: 35 },
      '116': { inStore: 8, online: 22 },
      '130': { inStore: 60, online: 100 }
    };

    const stock = mockData[productId] || { inStore: 10, online: 25 };
    
    return {
      productId: productId,
      inStoreStock: stock.inStore,
      onlineStock: stock.online,
      totalStock: stock.inStore + stock.online,
      isAvailable: (stock.inStore + stock.online) > 0,
      sites: [
        {
          siteId: '1100',
          siteName: 'Online Store 1100',
          siteType: 'online',
          quantity: stock.online,
          availableFrom: new Date().toISOString().split('T')[0]
        },
        {
          siteId: '1104',
          siteName: 'Store 1104',
          siteType: 'store',
          quantity: Math.floor(stock.inStore * 0.25),
          availableFrom: new Date().toISOString().split('T')[0]
        },
        {
          siteId: '1106',
          siteName: 'Store 1106',
          siteType: 'store',
          quantity: Math.floor(stock.inStore * 0.25),
          availableFrom: new Date().toISOString().split('T')[0]
        },
        {
          siteId: '1105',
          siteName: 'Store 1105',
          siteType: 'store',
          quantity: Math.floor(stock.inStore * 0.25),
          availableFrom: new Date().toISOString().split('T')[0]
        },
        {
          siteId: '1107', 
          siteName: 'Store 1107',
          siteType: 'store',
          quantity: Math.floor(stock.inStore * 0.25),
          availableFrom: new Date().toISOString().split('T')[0]
        }
      ],
      source: 'OMSA-Fallback',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Batch fetch availability for multiple products
   * @param {string[]} productIds - Array of product IDs
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Map of productId to availability data
   */
  async getBatchAvailability(productIds, options = {}) {
    const results = {};
    
    // For now, make individual calls
    // TODO: Implement true batch API if OMSA supports it
    for (const productId of productIds) {
      try {
        results[productId] = await this.getProductAvailabilityFromAPI(productId, options);
      } catch (error) {
        console.error(`OMSA: Failed to get availability for product ${productId}:`, error.message);
        results[productId] = {
          productId: productId,
          inStoreStock: 0,
          onlineStock: 0,
          totalStock: 0,
          isAvailable: false,
          sites: [],
          source: 'OMSA-BatchError',
          error: error.message,
          lastUpdated: new Date().toISOString(),
          hasData: false
        };
      }
    }
    
    return results;
  }

  /**
   * Perform sourcing request for cart items
   * @param {Array} cartItems - Array of cart items with product and quantity
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Sourcing response
   */
  async performCartSourcing(cartItems, options = {}) {
    try {
      if (!this.baseUrl) {
        console.log('OMSA: No base URL configured, no sourcing data available');
        return {
          success: false,
          error: 'OMSA not configured',
          source: 'OMSA-NotConfigured',
          lastUpdated: new Date().toISOString()
        };
      }

      if (!cartItems || cartItems.length === 0) {
        console.log('OMSA: No cart items provided for sourcing');
        // Clear cache if cart is empty
        this.sourcingCache = null;
        this.sourcingTimestamp = null;
        return {
          success: true,
          cartEmpty: true,
          source: 'OMSA-EmptyCart',
          lastUpdated: new Date().toISOString()
        };
      }

      console.log(`OMSA: Performing sourcing for ${cartItems.length} cart items`);

      // Get access token
      const token = await this.authService.getAccessToken('OMSA');
      
      // Build request body according to OMSA API specification
      const requestBody = {
        strategy: {
          id: 1
        },
        items: cartItems.map(item => ({
          product: {
            id: item.product.id
          },
          quantity: Number(parseFloat(item.quantity).toFixed(1)),
          unitOfMeasure: {
            salesUnitCode: 'PCE' // Standardize to PCE for OMSA compatibility
          }
        })),
        destination: {
          'isoCode3166-1': options.countryCode || 'DE'
        },
        reservation: {
          status: 'PENDING'
        },
        trace: {
          sourcingResults: {
            enabled: 'true'
          },
          sites: {
            enabled: 'true'
          }
        }
      };

      console.log('OMSA: Making sourcing request:', JSON.stringify(requestBody, null, 2));

      // Make sourcing API call
      const response = await axios.post(
        `${this.baseUrl}/v1/sourcing`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log('OMSA: Received sourcing response:', JSON.stringify(response.data, null, 2));

      // Cache the response
      this.sourcingCache = {
        success: true,
        data: response.data,
        cartItems: cartItems,
        source: 'OMSA-Sourcing',
        lastUpdated: new Date().toISOString()
      };
      this.sourcingTimestamp = Date.now();

      return this.sourcingCache;

    } catch (error) {
      console.error('OMSA: Error performing cart sourcing:', error.message);
      
      if (error.response) {
        console.error('OMSA: Sourcing response status:', error.response.status);
        console.error('OMSA: Sourcing response data:', error.response.data);
      }

      return {
        success: false,
        error: error.message,
        source: 'OMSA-SourcingError',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Get cached sourcing data
   * @returns {Object|null} Cached sourcing data or null
   */
  getCachedSourcing() {
    return this.sourcingCache;
  }

  /**
   * Check if sourcing cache is valid
   * @returns {boolean} True if cache is valid
   */
  isSourcingCacheValid() {
    if (!this.sourcingCache || !this.sourcingTimestamp) {
      return false;
    }
    
    // Cache is valid for 10 minutes
    const cacheTimeout = 10 * 60 * 1000;
    return (Date.now() - this.sourcingTimestamp) < cacheTimeout;
  }

  /**
   * Clear availability cache
   */
  clearCache() {
    this.availabilityCache.clear();
    this.sourcingCache = null;
    this.sourcingTimestamp = null;
    console.log('OMSA: Availability and sourcing cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.availabilityCache.size,
      lastUpdate: this.lastCacheUpdate,
      cacheTimeout: this.cacheTimeout
    };
  }
}

module.exports = new OmsaService(); 