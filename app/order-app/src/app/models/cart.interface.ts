import { Product } from './product.interface';

export interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  total: number;
}

export interface Cart {
  items: CartItem[];
  totalPrice: number;
  discount: number;
  finalTotal: number;
}

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: {
    line1: string;
    line2?: string;
    zipCode: string;
    city: string;
    country: string;
  };
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: number;
}

export interface PaymentOption {
  id: string;
  name: string;
  description?: string;
}

export interface Order {
  id?: string;
  confirmationNumber?: string;
  items: CartItem[];
  customer: CustomerDetails;
  shipping: ShippingOption;
  payment: PaymentOption;
  totalPrice: number;
  discount: number;
  shippingCost: number;
  finalTotal: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
}

// Sourcing interfaces
export interface SourcingRequest {
  strategy: {
    id: number;
  };
  items: Array<{
    product: {
      id: string;
    };
    quantity: number;
    unitOfMeasure: {
      salesUnitCode: string;
    };
  }>;
  destination: {
    'isoCode3166-1': string;
  };
  reservation: {
    status: string;
  };
  trace: {
    sourcingResults: {
      enabled: string;
    };
    sites: {
      enabled: string;
    };
  };
}

// Raw OMSA sourcing response from API
export interface OMSASourcingData {
  sourcingData: {
    id: string;
  };
  shipments: Array<{
    id: string;
    site: {
      id: string;
    };
    deliveryOptions: Array<{
      availableToCustomer: string;
      serviceCode: {
        id: string;
      };
    }>;
    items: Array<{
      product: {
        id: string;
      };
      quantity: number;
      unitOfMeasure: {
        salesUnitCode: string;
      };
      availableFrom: string;
    }>;
  }>;
  reservation: {
    id: string;
    status: string;
  };
  trace: {
    id: string;
  };
}

// Wrapper for sourcing response with status info
export interface SourcingResponse {
  success: boolean;
  data: OMSASourcingData | null;
  source: string;
  lastUpdated: string;
  error?: string;
} 