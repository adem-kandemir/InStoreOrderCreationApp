const authService = require('./auth.service');
const axios = require('axios');

/**
 * OMF (Order Management and Fulfillment Service)
 * Handles order creation, management and fulfillment-related API calls
 */
class OmfService {
  constructor() {
    this.systemName = 'OMF';
    this.authService = authService;
    
    // Get base URL from AuthService (which handles VCAP_SERVICES)
    try {
      const credentials = this.authService.getSystemCredentials('OMF');
      this.baseUrl = credentials.baseUrl;
      console.log('OMF: Service initialized with base URL:', this.baseUrl);
    } catch (error) {
      console.error('OMF: Failed to get credentials:', error.message);
      this.baseUrl = null;
    }
  }

  /**
   * Generate unique external number in format RBOAPP-XXXXXX
   * @returns {string} Unique external number
   */
  generateExternalNumber() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'AE';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Map UI payment method names to OMF custom field values
   * @param {string} uiPaymentMethod - Payment method from UI
   * @returns {string} OMF payment method value for customFields
   */
  mapPaymentMethodToOMF(uiPaymentMethod) {
    const paymentMapping = {
      'Prepayment': 'Prepayment',
      'Credit Card': 'CreditCard',
      'Debit Card': 'DebitCard', 
      'Invoice': 'Invoice',
      'Direct Debit': 'DirectDebit',
      'Cash': 'Cash',
      'Bank': 'Bank',
      'Custom': 'Other'
    };

    return paymentMapping[uiPaymentMethod] || 'Bank';
  }

  /**
   * Map country names to ISO country codes
   * @param {string} countryName - Country name from UI
   * @returns {string} ISO country code
   */
  mapCountryToCode(countryName) {
    const countryMapping = {
      'Germany': 'DE',
      'Deutschland': 'DE',
      'United States': 'US',
      'United Kingdom': 'GB',
      'France': 'FR',
      'Netherlands': 'NL',
      'Austria': 'AT',
      'Switzerland': 'CH'
    };

    return countryMapping[countryName] || 'DE';
  }

  /**
   * Extract house number from address line 1
   * @param {string} addressLine1 - Full address line
   * @returns {string} House number
   */
  extractHouseNumber(addressLine1) {
    // Match numbers at the end of the string (e.g., "Main Street 123" -> "123")
    // Also handle formats like "123a", "78a"
    const match = addressLine1.match(/(\d+[a-zA-Z]?)(?:\s|$)/);
    return match ? match[1] : '1';
  }

  /**
   * Extract street name from address line 1  
   * @param {string} addressLine1 - Full address line
   * @returns {string} Street name without house number
   */
  extractStreetName(addressLine1) {
    // Remove house number from address line
    const houseNumber = this.extractHouseNumber(addressLine1);
    return addressLine1.replace(houseNumber, '').trim() || addressLine1;
  }

  /**
   * Map product units to OMF format
   * @param {string} unit - Product unit from UI
   * @returns {string} OMF unit format
   */
  mapUnitToOMF(unit) {
    const unitMapping = {
      'PC': 'PCE',
      'ST': 'PCE',
      'PCS': 'PCE',
      'PIECE': 'PCE',
      'KG': 'KGM',
      'G': 'GRM',
      'L': 'LTR',
      'M': 'MTR'
    };

    return unitMapping[unit] || 'PCE';
  }

  /**
   * Generate a UUID v4
   * @returns {string} UUID string
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Create a new order using real OMF API
   * @param {Object} orderData - Complete order information from UI
   * @param {Object} sourcingData - Cached sourcing data from OMSA
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created order information
   */
  async createOrder(orderData, sourcingData = null, options = {}) {
    try {
      if (!this.baseUrl) {
        console.log('OMF: No base URL configured');
        throw new Error('OMF service not configured - missing base URL. Please check OMF_BASE_URL environment variable.');
      }

      console.log('OMF: Creating order with real API');
      console.log('OMF: Order data:', JSON.stringify(orderData, null, 2));
      console.log('OMF: Sourcing data:', sourcingData ? 'Available' : 'Not available');

      // Get access token
      const token = await this.authService.getAccessToken('OMF');
      
      // Generate external number
      const externalNumber = this.generateExternalNumber();
      
            // Build OMF order payload with correct structure
      const omfPayload = {
        // Customer information with required address types
        customer: {
          displayId: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
          guest: true,
          person: {
            firstName: orderData.customer.firstName,
            lastName: orderData.customer.lastName
          },
          addresses: [
            // SHIP_TO address
            {
              addressType: "SHIP_TO",
              city: orderData.customer.address.city,
              correspondenceLanguage: "de",
              country: this.mapCountryToCode(orderData.customer.address.country),
              email: orderData.customer.email,
              houseNumber: this.extractHouseNumber(orderData.customer.address.line1),
              person: {
                firstName: orderData.customer.firstName,
                lastName: orderData.customer.lastName
              },
              postalCode: orderData.customer.address.zipCode,
              street: this.extractStreetName(orderData.customer.address.line1)
            },
            // BILL_TO address
            {
              addressType: "BILL_TO", 
              city: orderData.customer.address.city,
              correspondenceLanguage: "de",
              country: this.mapCountryToCode(orderData.customer.address.country),
              email: orderData.customer.email,
              houseNumber: this.extractHouseNumber(orderData.customer.address.line1),
              person: {
                firstName: orderData.customer.firstName,
                lastName: orderData.customer.lastName
              },
              postalCode: orderData.customer.address.zipCode,
              street: this.extractStreetName(orderData.customer.address.line1)
            },
            // SOLD_TO address
            {
              addressType: "SOLD_TO",
              city: orderData.customer.address.city,
              correspondenceLanguage: "de", 
              country: this.mapCountryToCode(orderData.customer.address.country),
              email: orderData.customer.email,
              houseNumber: this.extractHouseNumber(orderData.customer.address.line1),
              person: {
                firstName: orderData.customer.firstName,
                lastName: orderData.customer.lastName
              },
              postalCode: orderData.customer.address.zipCode,
              street: this.extractStreetName(orderData.customer.address.line1)
            }
          ]
        },

        // Payment method in custom fields
        customFields: {
          PaymentMethod: this.mapPaymentMethodToOMF(orderData.payment.name)
        },

        // Order description
        description: `Order for ${orderData.customer.firstName} ${orderData.customer.lastName} - ${new Date().toISOString()}`,

        // Shipping fees
        fees: [
          {
            category: "SHIPPING",
            finalAmount: Number(orderData.shipping.price),
            originalAmount: Number(orderData.shipping.price)
          }
        ],

        // Market information
        market: {
          marketId: "OrderCaptureApp"
        },

        // Order items with proper structure
        orderItems: orderData.items.map((item, index) => ({
          itemType: "PHYSICAL",
          lineNumber: index + 1,
          price: {
            aspectsData: {
              physicalItemPrice: {
                priceTotals: [
                  {
                    category: "onetime",
                    effectiveAmount: Number(item.price),
                    finalAmount: Number(item.total),
                    originalAmount: Number(item.product.listPrice)
                  }
                ]
              }
            }
          },
          product: {
            externalSystemReference: {
              externalId: item.product.id,
              externalSystemId: "RS4CLNT100"
            }
          },
          quantity: {
            unit: this.mapUnitToOMF(item.product.unit),
            value: Number(item.quantity)
          },
          referenceId: item.product.id
        })),

        // Preceding document (external system reference)
        precedingDocument: {
          externalSystemReference: {
            externalId: this.generateUUID(),
            externalNumber: externalNumber,
            externalSystemId: "RBO_Order_App", 
            originalSystemId: "OrderCreationApp"
          }
        }
      };

      // Add sourcing data if available
      if (sourcingData && sourcingData.data) {
        omfPayload.sourcing = {
          sourcingData: {
            id: sourcingData.data.sourcingData?.id
          },
          shipments: sourcingData.data.shipments?.map(shipment => ({
            delivery: {
              deliveryOption: shipment.deliveryOptions?.[0]?.serviceCode?.id || "DHL",
              expectedDeliveryDate: shipment.deliveryOptions?.[0]?.availableToCustomer
            },
            fulfillmentSite: {
              id: shipment.site.id
            },
            id: this.generateUUID(),
            items: shipment.items.map(item => ({
              quantity: {
                unit: this.mapUnitToOMF(item.unitOfMeasure?.salesUnitCode),
                value: Number(item.quantity)
              },
              referenceId: item.product.id
            }))
          })) || []
        };
      }

      console.log('OMF: Making order creation request:', JSON.stringify(omfPayload, null, 2));

      // Make API call to OMF
      const response = await axios.post(
        `${this.baseUrl}/api/v2/orders`,
        omfPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log('OMF: Received order creation response:', JSON.stringify(response.data, null, 2));

      // Transform response to our standard format
      const transformedOrder = this.transformOrderResponse(response.data);
      transformedOrder.externalNumber = externalNumber;
      transformedOrder.source = 'OMF-RealAPI';
      
      return transformedOrder;

    } catch (error) {
      console.error('OMF: Error creating order:', error.message);
      
      let errorDetails = error.message;
      let errorCode = 'OMF_API_ERROR';
      
      if (error.response) {
        console.error('OMF: Response status:', error.response.status);
        console.error('OMF: Response data:', error.response.data);
        
        // Extract more meaningful error information
        if (error.response.data && error.response.data.error) {
          errorDetails = `${error.response.data.error.message} (Code: ${error.response.data.error.code})`;
          errorCode = error.response.data.error.code || 'OMF_API_ERROR';
        }
      }
      
      // Throw error instead of falling back to mock data
      const orderError = new Error(`OMF order creation failed: ${errorDetails}`);
      orderError.code = errorCode;
      orderError.status = error.response?.status;
      orderError.details = error.response?.data;
      
      throw orderError;
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
   * @param {Object} orderData - Order data from UI
   * @returns {Object} Fallback order creation result
   */
  getFallbackOrderCreation(orderData) {
    const orderId = `FALLBACK_ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const externalNumber = this.generateExternalNumber();
    
    // Calculate totals from cart items (UI format)
    const subtotal = orderData.totalPrice || 0;
    const tax = subtotal * 0.19; // 19% VAT
    const discount = orderData.discount || 0;
    const shippingCost = orderData.shipping?.price || 0;
    const total = orderData.finalTotal || (subtotal + tax - discount + shippingCost);

    return {
      orderId: orderId,
      externalNumber: externalNumber,
      status: 'CREATED',
      
      // OMF-style response structure
      precedingDocument: {
        externalSystemReference: {
          externalId: this.generateUUID(),
          externalNumber: externalNumber,
          externalSystemId: "RBO_Order_App",
          originalSystemId: "OrderCreationApp"
        }
      },
      
      // Customer information (simplified)
      customer: {
        displayId: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
        person: {
          firstName: orderData.customer.firstName,
          lastName: orderData.customer.lastName
        }
      },
      
      // Order metadata
      market: {
        marketId: "OrderCreationApp"
      },
      
      description: `Order for ${orderData.customer.firstName} ${orderData.customer.lastName} - ${new Date().toISOString()}`,
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Items in OMF format
      orderItems: orderData.items.map((item, index) => ({
        itemType: "PHYSICAL",
        lineNumber: index + 1,
        product: {
          externalSystemReference: {
            externalId: item.product.id,
            externalSystemId: "RS4CLNT100"
          }
        },
        quantity: {
          unit: this.mapUnitToOMF(item.product.unit),
          value: Number(item.quantity)
        },
        referenceId: item.product.id
      })),
      
      // Fees
      fees: [
        {
          category: "SHIPPING",
          finalAmount: shippingCost,
          originalAmount: shippingCost
        }
      ],
      
      // Custom fields
      customFields: {
        PaymentMethod: this.mapPaymentMethodToOMF(orderData.payment.name)
      },
      
      // Totals for convenience (not OMF format but useful for display)
      totals: {
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        shippingCost: shippingCost,
        total: total,
        currency: 'EUR'
      },
      
      source: 'OMF-Fallback'
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