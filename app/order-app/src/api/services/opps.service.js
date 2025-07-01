const authService = require('./auth.service');

/**
 * OPPS (Price and Promotion Service)
 * Handles price and promotion-related API calls
 */
class OppsService {
  constructor() {
    this.systemName = 'OPPS';
    this.priceCache = new Map(); // Cache for OPPS pricing data
    this.lastFetchTime = null;
    this.cacheExpiryMinutes = 30; // Cache expires after 30 minutes
    
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
    if (!oppsResponse || !oppsResponse.value) {
      console.warn('OPPS: Invalid response format, no value array found');
      return;
    }

    oppsResponse.value.forEach(priceRecord => {
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

      // Cache by product ID, store multiple business units if they exist
      if (!this.priceCache.has(productId)) {
        this.priceCache.set(productId, []);
      }
      this.priceCache.get(productId).push(priceData);
    });

    console.log(`OPPS: Transformed and cached prices for ${this.priceCache.size} products`);
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
   * @returns {boolean}
   */
  isCacheExpired() {
    if (!this.lastFetchTime) return true;
    
    const expiryTime = this.lastFetchTime + (this.cacheExpiryMinutes * 60 * 1000);
    return Date.now() > expiryTime;
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
   * Get product pricing information
   * @param {string|Array} productIds - Single product ID or array of product IDs
   * @param {Object} options - Additional options (store, customer, etc.)
   * @returns {Promise<Object>} Pricing information
   */
  async getProductPricing(productIds, options = {}) {
    try {
      const ids = Array.isArray(productIds) ? productIds : [productIds];
      
      // Check if cache needs refresh
      if (this.isCacheExpired()) {
        console.log('OPPS: Cache expired, refreshing...');
        await this.fetchAllPrices();
      }

      // Get pricing from cache
      const pricingData = {};
      const businessUnitID = options.storeId || process.env.DEFAULT_STORE_ID;

      ids.forEach(productId => {
        const cachedPrice = this.getCachedPrice(productId, businessUnitID);
        
        if (cachedPrice) {
          pricingData[productId] = {
            productId: productId,
            listPrice: cachedPrice.listPrice,
            salePrice: cachedPrice.salePrice,
            currency: cachedPrice.currency,
            unitOfMeasure: cachedPrice.unitOfMeasure,
            priceClassification: cachedPrice.priceClassification,
            businessUnitID: cachedPrice.businessUnitID,
            effectiveDate: cachedPrice.effectiveDate,
            expiryDate: cachedPrice.expiryDate,
            lastUpdated: cachedPrice.lastUpdated,
            priceValid: true,
            source: 'OPPS'
          };
        } else {
          // Product not found in OPPS, use fallback
          console.log(`OPPS: No pricing found for product ${productId}, using fallback`);
          const fallback = this.getFallbackPricing([productId]);
          pricingData[productId] = fallback[productId];
        }
      });

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