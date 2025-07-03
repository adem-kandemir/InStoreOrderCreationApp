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
   * @param {Object} queryParams - Query parameters (e.g., expand)
   * @returns {Promise<Object>} Order information
   */
  async getOrder(orderId, queryParams = {}) {
    try {
      if (!this.baseUrl) {
        throw new Error('OMF service not configured - missing base URL');
      }

      // Get access token
      const token = await this.authService.getAccessToken('OMF');
      
      // Build URL with query parameters
      let url = `${this.baseUrl}/api/v2/orders/${orderId}`;
      const params = new URLSearchParams();
      
      // Add expand parameters if present
      if (queryParams.expand) {
        // Handle both single expand and multiple expand parameters
        const expandParams = Array.isArray(queryParams.expand) ? queryParams.expand : [queryParams.expand];
        expandParams.forEach(param => params.append('expand', param));
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('OMF: Fetching order with URL:', url);
      
      const response = await axios.get(
        url,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );

      // Return raw response when expand is used, otherwise transform
      if (queryParams.expand) {
        return response.data;
      }
      
      return this.transformOrderResponse(response.data);
    } catch (error) {
      console.error('Error getting order:', error.message);
      throw error;
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
   * Get order items with expanded price information
   * @param {string} orderId - Order ID
   * @returns {Promise<Array>} Order items with price details
   */
  async getOrderItems(orderId) {
    try {
      if (!this.baseUrl) {
        throw new Error('OMF service not configured - missing base URL');
      }

      // Get access token
      const token = await this.authService.getAccessToken('OMF');
      
      const response = await axios.get(
        `${this.baseUrl}/api/v2/orders/${orderId}/items?expand=price`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log('OMF: Order items response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('OMF: Error getting order items:', error.message);
      throw error;
    }
  }

  /**
   * Get activities for a specific order item
   * @param {string} itemId - Item ID
   * @returns {Promise<Array>} Activities for the item
   */
  async getOrderActivities(itemId) {
    try {
      if (!this.baseUrl) {
        throw new Error('OMF service not configured - missing base URL');
      }

      // Get access token
      const token = await this.authService.getAccessToken('OMF');
      
      const response = await axios.get(
        `${this.baseUrl}/api/v1/orderActivities?itemId=${itemId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log('OMF: Activities response for item', itemId, ':', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('OMF: Error getting order activities:', error.message);
      throw error;
    }
  }

  /**
   * Get all activities for all items in an order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Map of itemId to activities
   */
  async getOrderActivitiesForAllItems(orderId) {
    try {
      // First get all items for the order
      const items = await this.getOrderItems(orderId);
      
      // Then get activities for each item in parallel
      const activitiesPromises = items.map(item => 
        this.getOrderActivities(item.id)
          .then(activities => ({ itemId: item.id, activities }))
          .catch(error => ({ 
            itemId: item.id, 
            activities: [], 
            error: error.message 
          }))
      );

      const activitiesResults = await Promise.all(activitiesPromises);
      
      // Convert to a map for easier access
      const activitiesMap = {};
      activitiesResults.forEach(result => {
        activitiesMap[result.itemId] = result.activities;
      });

      return activitiesMap;
    } catch (error) {
      console.error('OMF: Error getting all order activities:', error.message);
      throw error;
    }
  }

  /**
   * Search orders by criteria
   * @param {Object} searchCriteria - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchOrders(searchCriteria) {
    try {
      if (!this.baseUrl) {
        throw new Error('OMF service not configured - missing base URL');
      }

      console.log('OMF: Searching orders with criteria:', searchCriteria);

      // Get access token
      const token = await this.authService.getAccessToken('OMF');
      
      const params = new URLSearchParams();
      
      // Map frontend parameters to OMF API parameters
      if (searchCriteria.displayId) params.append('displayId', searchCriteria.displayId);
      if (searchCriteria.precedingDocumentNumber) params.append('precedingDocumentNumber', searchCriteria.precedingDocumentNumber);
      if (searchCriteria.customerFirstName) params.append('customerFirstName', searchCriteria.customerFirstName);
      if (searchCriteria.customerLastName) params.append('customerLastName', searchCriteria.customerLastName);
      if (searchCriteria.status) params.append('status', searchCriteria.status);
      if (searchCriteria.marketId) params.append('marketId', searchCriteria.marketId);
      if (searchCriteria.owner) params.append('owner', searchCriteria.owner);
      if (searchCriteria.customerCuid) params.append('customerCuid', searchCriteria.customerCuid);
      if (searchCriteria.precedingDocumentSystemId) params.append('precedingDocumentSystemId', searchCriteria.precedingDocumentSystemId);
      if (searchCriteria.precedingDocumentId) params.append('precedingDocumentId', searchCriteria.precedingDocumentId);
      if (searchCriteria.modifiedAfter) params.append('modifiedAfter', searchCriteria.modifiedAfter);
      if (searchCriteria.createdAfter) params.append('createdAfter', searchCriteria.createdAfter);
      if (searchCriteria.createdBefore) params.append('createdBefore', searchCriteria.createdBefore);
      if (searchCriteria.transferHoldEndBefore) params.append('transferHoldEndBefore', searchCriteria.transferHoldEndBefore);
      if (searchCriteria.customerDisplayId) params.append('customerDisplayId', searchCriteria.customerDisplayId);
      if (searchCriteria.customerMiddleName) params.append('customerMiddleName', searchCriteria.customerMiddleName);
      if (searchCriteria.shipToPartyCuid) params.append('shipToPartyCuid', searchCriteria.shipToPartyCuid);
      if (searchCriteria.shipToPartyFirstName) params.append('shipToPartyFirstName', searchCriteria.shipToPartyFirstName);
      if (searchCriteria.shipToPartyMiddleName) params.append('shipToPartyMiddleName', searchCriteria.shipToPartyMiddleName);
      if (searchCriteria.shipToPartyLastName) params.append('shipToPartyLastName', searchCriteria.shipToPartyLastName);
      
      // Pagination parameters
      if (searchCriteria.page !== undefined) params.append('page', searchCriteria.page.toString());
      if (searchCriteria.size !== undefined) params.append('size', searchCriteria.size.toString());
      
      // Sort parameter
      if (searchCriteria.sort) params.append('sort', searchCriteria.sort);
      
      // Expand parameter
      if (searchCriteria.expand) params.append('expand', searchCriteria.expand);

      console.log('OMF: Making search request with params:', params.toString());

      const response = await axios.get(
        `${this.baseUrl}/api/v2/orders?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log('OMF: Search response received');

      // Handle both array response and paginated response
      if (Array.isArray(response.data)) {
        return {
          content: response.data,
          totalElements: response.data.length,
          totalPages: 1,
          size: response.data.length,
          number: 0,
          source: 'OMF-RealAPI'
        };
      }
      
      // Paginated response
      return {
        content: response.data.content || response.data.orders || [],
        totalElements: response.data.totalElements || response.data.totalCount || 0,
        totalPages: response.data.totalPages || 1,
        size: response.data.size || 20,
        number: response.data.number || 0,
        source: 'OMF-RealAPI'
      };
      
    } catch (error) {
      console.error('OMF: Error searching orders:', error.message);
      if (error.response) {
        console.error('OMF: Response status:', error.response.status);
        console.error('OMF: Response data:', error.response.data);
      }
      throw error;
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
}

module.exports = new OmfService(); 