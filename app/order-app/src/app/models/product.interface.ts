export interface Product {
  id: string;
  ean: string;
  description: string;
  listPrice: number;
  unit: string;
  image?: string;
  inStoreStock?: number;
  onlineStock?: number;
  isAvailable: boolean;
  salePrice?: number;
  currency?: string;
  priceSource?: string;
  totalStock?: number;
  availabilityDetails?: {
    sites?: Array<{
      siteId: string;
      siteName: string;
      siteType: 'store' | 'online' | 'unknown';
      quantity: number;
      availableFrom: string;
    }>;
    source?: string;
    lastUpdated?: string;
    hasData?: boolean;
    error?: string;
  };
}

export interface ProductSearchResult {
  products: Product[];
  totalCount: number;
} 