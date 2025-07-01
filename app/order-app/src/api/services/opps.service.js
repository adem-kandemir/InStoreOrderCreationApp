const authService = require('./auth.service');

/**
 * OPPS (Price and Promotion Service)
 * Handles price and promotion-related API calls
 */
class OppsService {
  constructor() {
    this.systemName = 'OPPS';
    this.priceCache = new Map(); // Cache for OPPS pricing data
    this.metadataCache = new Map(); // Cache for metadata URIs
    this.lastFetchTime = null;
    this.cacheExpiryMinutes = 30; // Cache expires after 30 minutes
    this.sessionRequestCount = 0; // Track requests in current session
    this.lastSessionRefresh = null; // Track when we last refreshed for a session
    
    // Start fetching prices at startup
    this.initializePriceCache();
  }

  /**
   * Initialize price cache at startup
   */
  async initializePriceCache() {
    try {
      console.log('OPPS: Initializing price cache at startup...');
      await this.fetchAllPrices();
    } catch (error) {
      console.error('OPPS: Failed to initialize price cache:', error.message);
      console.log('OPPS: Will use fallback pricing data');
    }
  }

  /**
   * Fetch all prices from OPPS API and cache them
   */
  async fetchAllPrices() {
    try {
      console.log('OPPS: Fetching all prices from API...');
      
      const response = await authService.makeAuthenticatedRequest(
        this.systemName,
        '/BasePrices',
        {
          method: 'GET'
        }
      );

      // Transform and cache the pricing data
      this.transformAndCacheOppsPrices(response);
      this.lastFetchTime = Date.now();
      
      console.log(`OPPS: Successfully cached ${this.priceCache.size} product prices`);
      
    } catch (error) {
      console.error('OPPS: Error fetching prices from API:', error.message);
      throw error;
    }
  }

  /**
   * Transform OPPS pricing response and cache it
   * @param {Object} oppsResponse - Raw OPPS API response
   */
  transformAndCacheOppsPrices(oppsResponse) {
    // Handle both possible response formats
    let results = null;
    if (oppsResponse && oppsResponse.d && oppsResponse.d.results) {
      results = oppsResponse.d.results; // OData v2 format
    } else if (oppsResponse && oppsResponse.value) {
      results = oppsResponse.value; // OData v4 format
    }
    
    if (!results || !Array.isArray(results)) {
      console.warn('OPPS: Invalid response format, no results array found');
      console.log('OPPS: Response structure:', JSON.stringify(oppsResponse, null, 2));
      return;
    }

    console.log(`OPPS: Processing ${results.length} price records...`);

    results.forEach(priceRecord => {
      // Transform itemID from OPPS format to our product ID format
      // OPPS: "000000000000000029" (18 chars) -> Our format: "29"
      // OPPS: "000000000000000130" (18 chars) -> Our format: "130"
      const productId = this.transformItemIdToProductId(priceRecord.itemID);
      
      console.log(`OPPS: Mapping item ${priceRecord.itemID} -> product ${productId} (€${priceRecord.priceAmt})`);
      
      const priceData = {
        productId: productId,
        originalItemID: priceRecord.itemID, // Keep original for reference
        listPrice: parseFloat(priceRecord.priceAmt || 0),
        salePrice: parseFloat(priceRecord.priceAmt || 0), // Same as list for now
        currency: priceRecord.currencyCode || 'EUR',
        unitOfMeasure: priceRecord.unitOfMeasureCode || 'PCE',
        priceClassification: priceRecord.priceClassification || 'PRICE_NET',
        businessUnitID: priceRecord.businessUnitID,
        businessUnitType: priceRecord.businessUnitType,
        effectiveDate: priceRecord.effectiveDate,
        expiryDate: priceRecord.expiryDate,
        lastUpdated: priceRecord.lastCalcRelevantChange || new Date().toISOString(),
        tenant: priceRecord.tenant,
        logicalSystem: priceRecord.logicalSystem,
        source: 'OPPS'
      };

      // Cache metadata URI for real-time individual product calls
      if (priceRecord.__metadata && priceRecord.__metadata.uri) {
        const metadataInfo = {
          uri: priceRecord.__metadata.uri,
          id: priceRecord.__metadata.id,
          type: priceRecord.__metadata.type,
          productId: productId,
          businessUnitID: priceRecord.businessUnitID,
          businessUnitType: priceRecord.businessUnitType
        };
        
        // Cache by product ID, store multiple business units if they exist
        if (!this.metadataCache.has(productId)) {
          this.metadataCache.set(productId, []);
        }
        this.metadataCache.get(productId).push(metadataInfo);
        
        console.log(`OPPS: Cached metadata URI for product ${productId}: ${priceRecord.__metadata.uri}`);
      }

      // Cache by product ID, store multiple business units if they exist
      if (!this.priceCache.has(productId)) {
        this.priceCache.set(productId, []);
      }
      this.priceCache.get(productId).push(priceData);
    });

    console.log(`OPPS: Transformed and cached prices for ${this.priceCache.size} products`);
    console.log(`OPPS: Cached metadata URIs for ${this.metadataCache.size} products`);
    
    // Debug: Log all cached metadata
    this.metadataCache.forEach((entries, productId) => {
      console.log(`OPPS: Product ${productId} has ${entries.length} metadata entries`);
    });
  }

  /**
   * Transform OPPS itemID to our product ID format
   * OPPS uses 18-character item IDs with leading zeros
   * @param {string} itemID - OPPS item ID (e.g., "000000000000000029" -> "29")
   * @returns {string} - Our product ID format (e.g., "29")
   */
  transformItemIdToProductId(itemID) {
    if (!itemID) return '';
    
    // OPPS item IDs are 18 characters long with leading zeros
    // Example: "000000000000000029" -> "29"
    // Example: "000000000000000130" -> "130"
    const trimmed = itemID.replace(/^0+/, '');
    
    // Handle edge case where itemID is all zeros
    return trimmed || '0';
  }

  /**
   * Transform our product ID to OPPS itemID format (reverse transformation)
   * @param {string} productId - Our product ID (e.g., "29")
   * @returns {string} - OPPS item ID format (e.g., "000000000000000029")
   */
  transformProductIdToItemId(productId) {
    if (!productId) return '';
    
    // Pad with leading zeros to make it 18 characters
    return productId.padStart(18, '0');
  }

  /**
   * Check if price cache needs refresh
   * @param {Object} options - Options including forceRefresh flag
   * @returns {boolean}
   */
  isCacheExpired(options = {}) {
    // Force refresh if explicitly requested
    if (options.forceRefresh) return true;
    
    // If no data cached, refresh needed
    if (!this.lastFetchTime) return true;
    
    // Check for new session (page refresh) - refresh every 10 requests or 5 minutes
    const now = Date.now();
    const timeSinceLastSessionRefresh = this.lastSessionRefresh ? now - this.lastSessionRefresh : Infinity;
    const shouldRefreshForSession = (
      this.sessionRequestCount === 0 || // First request
      this.sessionRequestCount % 10 === 0 || // Every 10 requests
      timeSinceLastSessionRefresh > 5 * 60 * 1000 // Every 5 minutes
    );
    
    if (shouldRefreshForSession) {
      console.log('OPPS: Refreshing prices for new session/page refresh');
      this.lastSessionRefresh = now;
      return true;
    }
    
    // Regular time-based expiry (30 minutes)
    const expiryTime = this.lastFetchTime + (this.cacheExpiryMinutes * 60 * 1000);
    return now > expiryTime;
  }

  /**
   * Get cached price for a product
   * @param {string} productId - Product ID
   * @param {string} businessUnitID - Optional business unit filter
   * @returns {Object|null} - Cached price data or null
   */
  getCachedPrice(productId, businessUnitID = null) {
    const prices = this.priceCache.get(productId);
    
    if (!prices || prices.length === 0) {
      return null;
    }

    // If business unit specified, filter by it
    if (businessUnitID) {
      const filtered = prices.find(p => p.businessUnitID === businessUnitID);
      return filtered || prices[0]; // Fallback to first price if business unit not found
    }

    // Return first price (could be enhanced to pick best match)
    return prices[0];
  }

  /**
   * Get real-time pricing for a specific product using cached metadata URI
   * @param {string} productId - Product ID
   * @param {string} businessUnitID - Optional business unit filter
   * @returns {Promise<Object|null>} Real-time pricing data
   */
  async getRealTimePricing(productId, businessUnitID = null) {
    try {
      console.log(`OPPS: Looking for metadata URI for product ${productId}, businessUnit: ${businessUnitID}`);
      console.log(`OPPS: Metadata cache has ${this.metadataCache.size} entries`);
      
      const metadataEntries = this.metadataCache.get(productId);
      
      if (!metadataEntries || metadataEntries.length === 0) {
        console.log(`OPPS: No metadata URI found for product ${productId}`);
        console.log(`OPPS: Available products in metadata cache:`, Array.from(this.metadataCache.keys()));
        return null;
      }
      
      console.log(`OPPS: Found ${metadataEntries.length} metadata entries for product ${productId}`);

      // Find the right metadata entry for the business unit
      let selectedMetadata = metadataEntries[0]; // Default to first
      if (businessUnitID) {
        const filtered = metadataEntries.find(entry => entry.businessUnitID === businessUnitID);
        if (filtered) {
          selectedMetadata = filtered;
        }
      }

      console.log(`OPPS: Getting real-time price for product ${productId} using URI: ${selectedMetadata.uri}`);

      // Make direct call to the cached URI
      const response = await authService.makeAuthenticatedRequest(
        this.systemName,
        '', // Empty endpoint since we're using full URI
        {
          method: 'GET',
          url: selectedMetadata.uri // Override the base URL with full URI
        }
      );

      // Transform the single product response
      if (response && (response.d || response)) {
        const priceRecord = response.d || response;
        const realTimePrice = {
          productId: productId,
          originalItemID: priceRecord.itemID,
          listPrice: parseFloat(priceRecord.priceAmt || 0),
          salePrice: parseFloat(priceRecord.priceAmt || 0),
          currency: priceRecord.currencyCode || 'EUR',
          unitOfMeasure: priceRecord.unitOfMeasureCode || 'PCE',
          priceClassification: priceRecord.priceClassification || 'PRICE_NET',
          businessUnitID: priceRecord.businessUnitID,
          businessUnitType: priceRecord.businessUnitType,
          effectiveDate: priceRecord.effectiveDate,
          expiryDate: priceRecord.expiryDate,
          lastUpdated: priceRecord.lastCalcRelevantChange || new Date().toISOString(),
          tenant: priceRecord.tenant,
          logicalSystem: priceRecord.logicalSystem,
          source: 'OPPS-RealTime'
        };

        console.log(`OPPS: Real-time price for product ${productId}: €${realTimePrice.listPrice}`);
        return realTimePrice;
      }

      return null;
    } catch (error) {
      console.error(`Error getting real-time pricing for product ${productId}:`, error.message);
      return null;
    }
  }

  /**
   * Get product pricing information
   * @param {string|Array} productIds - Single product ID or array of product IDs
   * @param {Object} options - Additional options (store, customer, etc.)
   * @returns {Promise<Object>} Pricing information
   */
  async getProductPricing(productIds, options = {}) {
    try {
      const ids = Array.isArray(productIds) ? productIds : [productIds];
      
      // Increment session request count
      this.sessionRequestCount++;
      
      // Check if cache needs refresh (including session-based refresh)
      if (this.isCacheExpired(options)) {
        console.log('OPPS: Cache expired, refreshing...');
        await this.fetchAllPrices();
      }

      // Get pricing from cache
      const pricingData = {};
      const businessUnitID = options.storeId || process.env.DEFAULT_STORE_ID;

      // Process products individually or in batch
      for (const productId of ids) {
        let priceData = null;

        // For individual product searches (single product), get real-time pricing
        if (ids.length === 1 && !options.batchMode) {
          console.log(`OPPS: Single product request for ${productId}, getting real-time pricing...`);
          priceData = await this.getRealTimePricing(productId, businessUnitID);
        }

        // If real-time failed or this is a batch request, use cached data
        if (!priceData) {
          const cachedPrice = this.getCachedPrice(productId, businessUnitID);
          if (cachedPrice) {
            priceData = cachedPrice;
          }
        }

        if (priceData) {
          pricingData[productId] = {
            productId: productId,
            listPrice: priceData.listPrice,
            salePrice: priceData.salePrice,
            currency: priceData.currency,
            unitOfMeasure: priceData.unitOfMeasure,
            priceClassification: priceData.priceClassification,
            businessUnitID: priceData.businessUnitID,
            effectiveDate: priceData.effectiveDate,
            expiryDate: priceData.expiryDate,
            lastUpdated: priceData.lastUpdated,
            priceValid: true,
            source: priceData.source || 'OPPS'
          };
        } else {
          // Product not found in OPPS, use fallback
          console.log(`OPPS: No pricing found for product ${productId}, using fallback`);
          const fallback = this.getFallbackPricing([productId]);
          pricingData[productId] = fallback[productId];
        }
      }

      return pricingData;
      
    } catch (error) {
      console.error('Error getting product pricing:', error.message);
      
      // Return fallback pricing for development
      return this.getFallbackPricing(productIds);
    }
  }

  /**
   * Get active promotions for products
   * @param {string|Array} productIds - Single product ID or array of product IDs
   * @param {Object} options - Additional options (store, customer, etc.)
   * @returns {Promise<Object>} Promotion information
   */
  async getProductPromotions(productIds, options = {}) {
    try {
      const ids = Array.isArray(productIds) ? productIds : [productIds];
      
      const requestData = {
        productIds: ids,
        storeId: options.storeId || process.env.DEFAULT_STORE_ID,
        customerId: options.customerId,
        validDate: options.validDate || new Date().toISOString()
      };

      const response = await authService.makeAuthenticatedRequest(
        this.systemName,
        '/api/v1/promotions/products',
        {
          method: 'POST',
          data: requestData
        }
      );

      return this.transformPromotionsResponse(response);
    } catch (error) {
      console.error('Error getting product promotions:', error.message);
      
      // Return fallback promotions for development
      return this.getFallbackPromotions(productIds);
    }
  }

  /**
   * Get combined price and promotion information
   * @param {string|Array} productIds - Single product ID or array of product IDs
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Combined pricing and promotion data
   */
  async getPriceAndPromotions(productIds, options = {}) {
    try {
      const [pricing, promotions] = await Promise.all([
        this.getProductPricing(productIds, options),
        this.getProductPromotions(productIds, options)
      ]);

      return this.combinePriceAndPromotions(pricing, promotions);
    } catch (error) {
      console.error('Error getting combined price and promotions:', error.message);
      throw error;
    }
  }

  /**
   * Transform OPPS pricing response to standardized format
   * @param {Object} response - Raw OPPS response
   * @returns {Object} Transformed response
   */
  transformPricingResponse(response) {
    const transformed = {};
    
    if (response.products) {
      response.products.forEach(product => {
        transformed[product.productId] = {
          productId: product.productId,
          listPrice: parseFloat(product.listPrice || 0),
          salePrice: parseFloat(product.salePrice || product.listPrice || 0),
          currency: product.currency || 'EUR',
          priceValid: product.priceValid || true,
          lastUpdated: product.lastUpdated || new Date().toISOString()
        };
      });
    }

    return transformed;
  }

  /**
   * Transform OPPS promotions response to standardized format
   * @param {Object} response - Raw OPPS response
   * @returns {Object} Transformed response
   */
  transformPromotionsResponse(response) {
    const transformed = {};
    
    if (response.products) {
      response.products.forEach(product => {
        transformed[product.productId] = {
          productId: product.productId,
          promotions: product.promotions || [],
          hasActivePromotions: (product.promotions || []).length > 0
        };
      });
    }

    return transformed;
  }

  /**
   * Combine pricing and promotion data
   * @param {Object} pricing - Pricing data
   * @param {Object} promotions - Promotions data
   * @returns {Object} Combined data
   */
  combinePriceAndPromotions(pricing, promotions) {
    const combined = {};
    
    // Merge pricing and promotions
    const allProductIds = new Set([...Object.keys(pricing), ...Object.keys(promotions)]);
    
    allProductIds.forEach(productId => {
      combined[productId] = {
        productId,
        ...pricing[productId],
        ...promotions[productId]
      };
    });

    return combined;
  }

  /**
   * Fallback pricing for development/testing
   * @param {string|Array} productIds - Product IDs
   * @returns {Object} Fallback pricing data
   */
  getFallbackPricing(productIds) {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    const fallback = {};
    
    ids.forEach(id => {
      fallback[id] = {
        productId: id,
        listPrice: 19.99,
        salePrice: 19.99,
        currency: 'EUR',
        priceValid: true,
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      };
    });

    return fallback;
  }

  /**
   * Fallback promotions for development/testing
   * @param {string|Array} productIds - Product IDs
   * @returns {Object} Fallback promotions data
   */
  getFallbackPromotions(productIds) {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    const fallback = {};
    
    ids.forEach(id => {
      fallback[id] = {
        productId: id,
        promotions: [],
        hasActivePromotions: false,
        source: 'fallback'
      };
    });

    return fallback;
  }
}

module.exports = new OppsService(); 