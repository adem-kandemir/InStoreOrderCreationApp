const authService = require('./auth.service');

/**
 * OMF (Order Management and Fulfillment Service)
 * Handles order creation, management and fulfillment-related API calls
 */
class OmfService {
  constructor() {
    this.systemName = 'OMF';
  }

  /**
   * Create a new order
   * @param {Object} orderData - Order information
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created order information
   */
  async createOrder(orderData, options = {}) {
    try {
      const requestData = {
        storeId: orderData.storeId || process.env.DEFAULT_STORE_ID,
        customerId: orderData.customerId,
        employeeId: orderData.employeeId,
        orderType: orderData.orderType || 'INSTORE',
        channel: orderData.channel || 'POS',
        items: orderData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount || 0,
          reservationId: item.reservationId
        })),
        payment: orderData.payment,
        delivery: orderData.delivery,
        notes: orderData.notes
      };

      const response = await authService.makeAuthenticatedRequest(
        this.systemName,
        '/api/v1/orders',
        {
          method: 'POST',
          data: requestData
        }
      );

      return this.transformOrderResponse(response);
    } catch (error) {
      console.error('Error creating order:', error.message);
      
      // Return fallback order creation for development
      return this.getFallbackOrderCreation(orderData);
    }
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order information
   */
  async getOrder(orderId) {
    try {
      const response = await authService.makeAuthenticatedRequest(
        this.systemName,
        `/api/v1/orders/${orderId}`,
        {
          method: 'GET'
        }
      );

      return this.transformOrderResponse(response);
    } catch (error) {
      console.error('Error getting order:', error.message);
      
      // Return fallback order for development
      return this.getFallbackOrder(orderId);
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated order information
   */
  async updateOrderStatus(orderId, status, options = {}) {
    try {
      const requestData = {
        status: status,
        reason: options.reason,
        notes: options.notes,
        updatedBy: options.updatedBy
      };

      const response = await authService.makeAuthenticatedRequest(
        this.systemName,
        `/api/v1/orders/${orderId}/status`,
        {
          method: 'PUT',
          data: requestData
        }
      );

      return this.transformOrderResponse(response);
    } catch (error) {
      console.error('Error updating order status:', error.message);
      throw error;
    }
  }

  /**
   * Cancel order
   * @param {string} orderId - Order ID
   * @param {Object} options - Cancellation options
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelOrder(orderId, options = {}) {
    try {
      const requestData = {
        reason: options.reason || 'Customer cancellation',
        refundRequired: options.refundRequired || false,
        restockItems: options.restockItems || true,
        cancelledBy: options.cancelledBy
      };

      const response = await authService.makeAuthenticatedRequest(
        this.systemName,
        `/api/v1/orders/${orderId}/cancel`,
        {
          method: 'POST',
          data: requestData
        }
      );

      return response;
    } catch (error) {
      console.error('Error cancelling order:', error.message);
      throw error;
    }
  }

  /**
   * Get order fulfillment status
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Fulfillment status
   */
  async getOrderFulfillment(orderId) {
    try {
      const response = await authService.makeAuthenticatedRequest(
        this.systemName,
        `/api/v1/orders/${orderId}/fulfillment`,
        {
          method: 'GET'
        }
      );

      return this.transformFulfillmentResponse(response);
    } catch (error) {
      console.error('Error getting order fulfillment:', error.message);
      
      // Return fallback fulfillment for development
      return this.getFallbackFulfillment(orderId);
    }
  }

  /**
   * Process order payment
   * @param {string} orderId - Order ID
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(orderId, paymentData) {
    try {
      const requestData = {
        paymentMethod: paymentData.method,
        amount: paymentData.amount,
        currency: paymentData.currency || 'EUR',
        cardToken: paymentData.cardToken,
        transactionReference: paymentData.transactionReference
      };

      const response = await authService.makeAuthenticatedRequest(
        this.systemName,
        `/api/v1/orders/${orderId}/payment`,
        {
          method: 'POST',
          data: requestData
        }
      );

      return this.transformPaymentResponse(response);
    } catch (error) {
      console.error('Error processing payment:', error.message);
      
      // Return fallback payment for development
      return this.getFallbackPayment(orderId, paymentData);
    }
  }

  /**
   * Search orders by criteria
   * @param {Object} searchCriteria - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchOrders(searchCriteria) {
    try {
      const params = new URLSearchParams();
      
      if (searchCriteria.storeId) params.append('storeId', searchCriteria.storeId);
      if (searchCriteria.customerId) params.append('customerId', searchCriteria.customerId);
      if (searchCriteria.status) params.append('status', searchCriteria.status);
      if (searchCriteria.dateFrom) params.append('dateFrom', searchCriteria.dateFrom);
      if (searchCriteria.dateTo) params.append('dateTo', searchCriteria.dateTo);
      if (searchCriteria.limit) params.append('limit', searchCriteria.limit.toString());
      if (searchCriteria.offset) params.append('offset', searchCriteria.offset.toString());

      const response = await authService.makeAuthenticatedRequest(
        this.systemName,
        `/api/v1/orders?${params.toString()}`,
        {
          method: 'GET'
        }
      );

      return this.transformOrderListResponse(response);
    } catch (error) {
      console.error('Error searching orders:', error.message);
      
      // Return fallback search results for development
      return this.getFallbackOrderSearch(searchCriteria);
    }
  }

  /**
   * Transform OMF order response to standardized format
   * @param {Object} response - Raw OMF response
   * @returns {Object} Transformed response
   */
  transformOrderResponse(response) {
    return {
      orderId: response.orderId || response.id,
      orderNumber: response.orderNumber,
      status: response.status,
      storeId: response.storeId,
      customerId: response.customerId,
      employeeId: response.employeeId,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
      items: response.items || [],
      totals: {
        subtotal: parseFloat(response.totals?.subtotal || 0),
        tax: parseFloat(response.totals?.tax || 0),
        discount: parseFloat(response.totals?.discount || 0),
        total: parseFloat(response.totals?.total || 0)
      },
      payment: response.payment,
      delivery: response.delivery,
      fulfillment: response.fulfillment
    };
  }

  /**
   * Transform OMF fulfillment response to standardized format
   * @param {Object} response - Raw OMF response
   * @returns {Object} Transformed response
   */
  transformFulfillmentResponse(response) {
    return {
      orderId: response.orderId,
      status: response.status,
      items: response.items || [],
      tracking: response.tracking,
      estimatedDelivery: response.estimatedDelivery,
      actualDelivery: response.actualDelivery,
      carrier: response.carrier,
      updates: response.updates || []
    };
  }

  /**
   * Transform OMF payment response to standardized format
   * @param {Object} response - Raw OMF response
   * @returns {Object} Transformed response
   */
  transformPaymentResponse(response) {
    return {
      success: response.success || false,
      transactionId: response.transactionId,
      paymentMethod: response.paymentMethod,
      amount: parseFloat(response.amount || 0),
      currency: response.currency,
      status: response.status,
      processedAt: response.processedAt,
      reference: response.reference
    };
  }

  /**
   * Transform OMF order list response to standardized format
   * @param {Object} response - Raw OMF response
   * @returns {Object} Transformed response
   */
  transformOrderListResponse(response) {
    return {
      orders: (response.orders || []).map(order => this.transformOrderResponse(order)),
      totalCount: response.totalCount || 0,
      hasMore: response.hasMore || false,
      nextOffset: response.nextOffset
    };
  }

  /**
   * Fallback order creation for development/testing
   * @param {Object} orderData - Order data
   * @returns {Object} Fallback order creation result
   */
  getFallbackOrderCreation(orderData) {
    const orderId = `FALLBACK_ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orderNumber = `ORD-${Date.now()}`;
    
    const subtotal = orderData.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const tax = subtotal * 0.19; // 19% VAT
    const discount = orderData.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const total = subtotal + tax - discount;

    return {
      orderId: orderId,
      orderNumber: orderNumber,
      status: 'CREATED',
      storeId: orderData.storeId || process.env.DEFAULT_STORE_ID,
      customerId: orderData.customerId,
      employeeId: orderData.employeeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: orderData.items,
      totals: {
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        total: total
      },
      payment: orderData.payment,
      delivery: orderData.delivery,
      source: 'fallback'
    };
  }

  /**
   * Fallback order for development/testing
   * @param {string} orderId - Order ID
   * @returns {Object} Fallback order data
   */
  getFallbackOrder(orderId) {
    return {
      orderId: orderId,
      orderNumber: `ORD-${Date.now()}`,
      status: 'PROCESSING',
      storeId: process.env.DEFAULT_STORE_ID || 'STORE001',
      customerId: 'CUSTOMER001',
      employeeId: 'EMPLOYEE001',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          productId: '118',
          quantity: 1,
          unitPrice: 19.99,
          discountAmount: 0
        }
      ],
      totals: {
        subtotal: 19.99,
        tax: 3.80,
        discount: 0,
        total: 23.79
      },
      source: 'fallback'
    };
  }

  /**
   * Fallback fulfillment for development/testing
   * @param {string} orderId - Order ID
   * @returns {Object} Fallback fulfillment data
   */
  getFallbackFulfillment(orderId) {
    return {
      orderId: orderId,
      status: 'IN_PROGRESS',
      items: [
        {
          productId: '118',
          quantity: 1,
          status: 'PICKED',
          location: 'WAREHOUSE_A'
        }
      ],
      tracking: `TRACK_${orderId}`,
      estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      carrier: 'DHL',
      updates: [
        {
          timestamp: new Date().toISOString(),
          status: 'IN_PROGRESS',
          message: 'Order is being prepared'
        }
      ],
      source: 'fallback'
    };
  }

  /**
   * Fallback payment for development/testing
   * @param {string} orderId - Order ID
   * @param {Object} paymentData - Payment data
   * @returns {Object} Fallback payment result
   */
  getFallbackPayment(orderId, paymentData) {
    return {
      success: true,
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentMethod: paymentData.method,
      amount: paymentData.amount,
      currency: paymentData.currency || 'EUR',
      status: 'COMPLETED',
      processedAt: new Date().toISOString(),
      reference: `REF_${orderId}`,
      source: 'fallback'
    };
  }

  /**
   * Fallback order search for development/testing
   * @param {Object} searchCriteria - Search criteria
   * @returns {Object} Fallback search results
   */
  getFallbackOrderSearch(searchCriteria) {
    return {
      orders: [
        {
          orderId: 'FALLBACK_ORDER_001',
          orderNumber: 'ORD-001',
          status: 'COMPLETED',
          storeId: 'STORE001',
          customerId: 'CUSTOMER001',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          totals: { total: 23.79 }
        },
        {
          orderId: 'FALLBACK_ORDER_002',
          orderNumber: 'ORD-002',
          status: 'PROCESSING',
          storeId: 'STORE001',
          customerId: 'CUSTOMER002',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          totals: { total: 45.99 }
        }
      ],
      totalCount: 2,
      hasMore: false,
      source: 'fallback'
    };
  }
}

module.exports = new OmfService(); 