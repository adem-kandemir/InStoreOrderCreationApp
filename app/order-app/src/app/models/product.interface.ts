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
}

export interface ProductSearchResult {
  products: Product[];
  totalCount: number;
} 