const axios = require('axios');

/**
 * Centralized OAuth 2.0 Authentication Service
 * Handles authentication for OPPS, OMSA, and OMF systems
 */
class AuthService {
  constructor() {
    this.tokens = new Map(); // Cache for access tokens
    this.tokenExpiry = new Map(); // Cache for token expiry times
  }

  /**
   * Get OAuth 2.0 access token for a specific system
   * @param {string} system - System name (OPPS, OMSA, OMF)
   * @returns {Promise<string>} Access token
   */
  async getAccessToken(system) {
    const now = Date.now();
    const cachedToken = this.tokens.get(system);
    const expiry = this.tokenExpiry.get(system);

    // Return cached token if still valid (with 5 minute buffer)
    if (cachedToken && expiry && now < (expiry - 300000)) {
      console.log(`Using cached token for ${system}`);
      return cachedToken;
    }

    console.log(`Requesting new access token for ${system}`);
    
    try {
      const credentials = this.getSystemCredentials(system);
      const tokenResponse = await axios.post(
        credentials.tokenUrl,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const accessToken = tokenResponse.data.access_token;
      const expiresIn = tokenResponse.data.expires_in || 3600; // Default 1 hour
      const expiryTime = now + (expiresIn * 1000);

      // Cache the token
      this.tokens.set(system, accessToken);
      this.tokenExpiry.set(system, expiryTime);

      console.log(`New access token obtained for ${system}, expires in ${expiresIn}s`);
      return accessToken;
    } catch (error) {
      console.error(`Error getting access token for ${system}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to authenticate with ${system}: ${error.message}`);
    }
  }

  /**
   * Get system-specific credentials from environment variables or VCAP_SERVICES
   * @param {string} system - System name (OPPS, OMSA, OMF)
   * @returns {Object} System credentials
   */
  getSystemCredentials(system) {
    if (system === 'OPPS') {
      // Read OPPS credentials from VCAP_SERVICES (bound service)
      try {
        const vcapServices = JSON.parse(process.env.VCAP_SERVICES || '{}');
        const oppsService = vcapServices['user-provided']?.find(service => 
          service.name === 'opps-credentials'
        );
        
        if (oppsService && oppsService.credentials) {
          const creds = oppsService.credentials;
          return {
            clientId: creds.client_id,
            clientSecret: creds.client_secret,
            tokenUrl: creds.token_url,
            baseUrl: creds.base_url
          };
        }
        
        // Fallback to environment variables if VCAP_SERVICES not found
        console.log('OPPS: VCAP_SERVICES not found, falling back to environment variables');
      } catch (error) {
        console.error('OPPS: Error parsing VCAP_SERVICES:', error.message);
        console.log('OPPS: Falling back to environment variables');
      }
    }
    
    if (system === 'OMSA') {
      // Read OMSA credentials from VCAP_SERVICES (bound service)
      try {
        const vcapServices = JSON.parse(process.env.VCAP_SERVICES || '{}');
        const omsaService = vcapServices['user-provided']?.find(service => 
          service.name === 'omsa-credentials'
        );
        
        if (omsaService && omsaService.credentials) {
          const creds = omsaService.credentials;
          return {
            clientId: creds.client_id,
            clientSecret: creds.client_secret,
            tokenUrl: creds.token_url,
            baseUrl: creds.base_url
          };
        }
        
        // Fallback to environment variables if VCAP_SERVICES not found
        console.log('OMSA: VCAP_SERVICES not found, falling back to environment variables');
      } catch (error) {
        console.error('OMSA: Error parsing VCAP_SERVICES:', error.message);
        console.log('OMSA: Falling back to environment variables');
      }
    }
    
    // Original logic for OMSA, OMF and fallback for OPPS
    const systemUpper = system.toUpperCase();
    
    const credentials = {
      clientId: process.env[`${systemUpper}_CLIENT_ID`],
      clientSecret: process.env[`${systemUpper}_CLIENT_SECRET`],
      tokenUrl: process.env[`${systemUpper}_TOKEN_URL`],
      baseUrl: process.env[`${systemUpper}_BASE_URL`]
    };

    // Validate that all required credentials are present
    const missing = Object.entries(credentials)
      .filter(([key, value]) => !value)
      .map(([key]) => {
        // Map camelCase to proper env var names
        const envVarMap = {
          clientId: 'CLIENT_ID',
          clientSecret: 'CLIENT_SECRET', 
          tokenUrl: 'TOKEN_URL',
          baseUrl: 'BASE_URL'
        };
        return `${systemUpper}_${envVarMap[key] || key.toUpperCase()}`;
      });

    if (missing.length > 0) {
      console.error(`Missing credentials for ${system}:`, missing);
      if (system === 'OPPS') {
        console.error('OPPS: Make sure opps-credentials service is bound to the application');
        console.error('Available VCAP_SERVICES:', Object.keys(JSON.parse(process.env.VCAP_SERVICES || '{}')));
      } else {
        console.error('Available environment variables:', Object.keys(process.env).filter(key => key.startsWith(systemUpper)));
      }
      throw new Error(`Missing ${system} credentials: ${missing.join(', ')}`);
    }

    return credentials;
  }

  /**
   * Get authenticated headers for API requests
   * @param {string} system - System name (OPPS, OMSA, OMF)
   * @returns {Promise<Object>} Headers object with Authorization
   */
  async getAuthHeaders(system) {
    const accessToken = await this.getAccessToken(system);
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Make authenticated API request
   * @param {string} system - System name (OPPS, OMSA, OMF)
   * @param {string} endpoint - API endpoint path
   * @param {Object} options - Request options (method, data, params)
   * @returns {Promise<Object>} API response data
   */
  async makeAuthenticatedRequest(system, endpoint, options = {}) {
    try {
      const credentials = this.getSystemCredentials(system);
      const headers = await this.getAuthHeaders(system);
      
      const requestConfig = {
        method: options.method || 'GET',
        url: options.url || `${credentials.baseUrl}${endpoint}`, // Allow URL override for metadata calls
        headers: headers,
        ...options
      };

      // Remove the url from options to avoid axios confusion
      delete requestConfig.url_override;

      console.log(`Making ${requestConfig.method} request to ${system}: ${requestConfig.url}`);
      
      const response = await axios(requestConfig);
      return response.data;
    } catch (error) {
      console.error(`Error making request to ${system}:`, error.message);
      
      // If authentication error, clear cached token and retry once
      if (error.response && error.response.status === 401) {
        console.log(`Authentication failed for ${system}, clearing cache and retrying...`);
        this.tokens.delete(system);
        this.tokenExpiry.delete(system);
        
        // Retry once with fresh token
        if (!options._retried) {
          return this.makeAuthenticatedRequest(system, endpoint, { ...options, _retried: true });
        }
      }
      
      throw error;
    }
  }

  /**
   * Clear all cached tokens (useful for testing or forced refresh)
   */
  clearTokenCache() {
    this.tokens.clear();
    this.tokenExpiry.clear();
    console.log('All authentication tokens cleared from cache');
  }
}

// Export singleton instance
module.exports = new AuthService(); 