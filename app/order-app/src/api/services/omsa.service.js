const authService = require('./auth.service');

/**
 * OMSA (Sourcing and Availability Service)
 * Handles product sourcing and availability-related API calls
 */
class OmsaService {
  constructor() {
    this.systemName = 'OMSA';
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

      const response = await authService.makeAuthenticatedRequest(
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
      
      // Return fallback availability for development
      return this.getFallbackAvailability(productIds);
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

      const response = await authService.makeAuthenticatedRequest(
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
      
      // Return fallback sourcing for development
      return this.getFallbackSourcing(productIds);
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

      const response = await authService.makeAuthenticatedRequest(
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
      
      // Return fallback stock levels for development
      return this.getFallbackStockLevels(productIds);
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

      const response = await authService.makeAuthenticatedRequest(
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
      
      // Return fallback reservation for development
      return this.getFallbackReservation(reservations);
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

      const response = await authService.makeAuthenticatedRequest(
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
}

module.exports = new OmsaService(); 