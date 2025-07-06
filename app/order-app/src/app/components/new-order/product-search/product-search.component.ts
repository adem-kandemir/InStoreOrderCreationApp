import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

import { ProductService } from '../../../services/product.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { Product, ProductSearchResult } from '../../../models/product.interface';

@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './product-search.component.html',
  styleUrls: ['./product-search.component.scss']
})
export class ProductSearchComponent implements OnInit, OnDestroy {
  @Input() searchQuery = '';
  @Input() isSearching = false;
  @Input() searchResults: Product[] = [];
  @Input() searchError = false;
  @Input() searchErrorType: string | null = null;
  @Input() searchErrorMessage: string | null = null;
  @Input() selectedProduct: Product | null = null;
  
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() searchResultsChange = new EventEmitter<Product[]>();
  @Output() isSearchingChange = new EventEmitter<boolean>();
  @Output() searchErrorChange = new EventEmitter<boolean>();
  @Output() searchErrorTypeChange = new EventEmitter<string | null>();
  @Output() searchErrorMessageChange = new EventEmitter<string | null>();
  @Output() productSelected = new EventEmitter<Product>();
  @Output() retrySearchRequested = new EventEmitter<void>();
  
  // Pagination properties
  currentPage = 1;
  pageSize = 5;
  hasMore = false;
  isLoadingMore = false;
  private allResults: Product[] = [];
  
  // Barcode scanner properties
  isScanningBarcode = false;
  scannerError: string | null = null;
  private html5QrCode: Html5Qrcode | null = null;
  
  // Search subject for debouncing
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    // Set up search with debouncing
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged(), // Only search if the value changed
      switchMap(query => {
        if (query.trim().length === 0) {
          // Clear results if search is empty
          this.resetPagination();
          this.updateSearchResults([]);
          this.updateIsSearching(false);
          return [];
        }
        
        // Reset pagination for new search
        this.resetPagination();
        this.updateIsSearching(true);
        console.log(`🔍 ProductSearchComponent: Searching for "${query}" with top=${this.pageSize}, skip=0`);
        return this.productService.searchProducts(query, { 
          top: this.pageSize, 
          skip: 0 
        });
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result: ProductSearchResult) => {
        this.updateIsSearching(false);
        
        if (result.error) {
          // Handle error state
          this.updateSearchError(true);
          this.updateSearchErrorType(result.errorType || 'unknown');
          this.updateSearchErrorMessage(result.userMessage || 'Unable to search products at this time');
          this.updateSearchResults([]);
          this.resetPagination();
        } else {
          // Handle success state
          this.updateSearchError(false);
          this.updateSearchErrorType(null);
          this.updateSearchErrorMessage(null);
          
          // Update pagination state
          this.allResults = result.products;
          this.hasMore = result.hasMore || false;
          this.currentPage = result.currentPage || 1;
          
          this.updateSearchResults(this.allResults);
        }
      },
      error: () => {
        this.updateIsSearching(false);
        this.updateSearchError(true);
        this.updateSearchErrorType('unknown');
        this.updateSearchErrorMessage('Unable to search products at this time');
        this.updateSearchResults([]);
        this.resetPagination();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up barcode scanner
    if (this.html5QrCode) {
      this.stopBarcodeScanning();
    }
  }

  onSearchInput(): void {
    this.searchQueryChange.emit(this.searchQuery);
    this.searchSubject.next(this.searchQuery);
  }

  onSearch(): void {
    // This is now called when Enter is pressed
    if (this.searchQuery.trim().length > 0) {
      this.searchSubject.next(this.searchQuery);
    }
  }

  onRetrySearch(): void {
    this.retrySearchRequested.emit();
    if (this.searchQuery.trim().length > 0) {
      this.updateSearchError(false);
      this.updateSearchErrorType(null);
      this.updateSearchErrorMessage(null);
      this.searchSubject.next(this.searchQuery);
    }
  }

  onSelectProduct(product: Product): void {
    this.productSelected.emit(product);
  }

  // Pagination methods
  resetPagination(): void {
    this.currentPage = 1;
    this.hasMore = false;
    this.isLoadingMore = false;
    this.allResults = [];
  }

  async loadMoreResults(): Promise<void> {
    if (!this.hasMore || this.isLoadingMore || !this.searchQuery.trim()) {
      return;
    }

    this.isLoadingMore = true;
    const skip = this.currentPage * this.pageSize;

    try {
      console.log(`📄 ProductSearchComponent: Loading more results for "${this.searchQuery}" with top=${this.pageSize}, skip=${skip}`);
      const result = await this.productService.searchProducts(this.searchQuery, {
        top: this.pageSize,
        skip: skip
      }).toPromise();

      if (result && !result.error) {
        // Append new results to existing ones
        this.allResults = [...this.allResults, ...result.products];
        this.hasMore = result.hasMore || false;
        this.currentPage = result.currentPage || (this.currentPage + 1);
        
        this.updateSearchResults(this.allResults);
      }
    } catch (error) {
      console.error('Error loading more results:', error);
    } finally {
      this.isLoadingMore = false;
    }
  }

  getErrorTitle(): string {
    switch (this.searchErrorType) {
      case 'system_unavailable':
        return 'System Temporarily Unavailable';
      case 'timeout':
        return 'Request Timeout';
      case 'authentication':
        return 'Authentication Error';
      case 'service_not_found':
        return 'Service Not Found';
      default:
        return 'Search Error';
    }
  }

  // Barcode scanner methods
  async startBarcodeScanning(): Promise<void> {
    try {
      this.isScanningBarcode = true;
      this.scannerError = null;
      
      // Wait for the DOM element to be available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.html5QrCode = new Html5Qrcode('barcode-scanner');
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      await this.html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText, decodedResult) => {
          console.log('Barcode scanned:', decodedText);
          this.processBarcodeResult(decodedText);
        },
        (errorMessage) => {
          // Handle scan errors silently - these are common during scanning
        }
      );
      
    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      this.scannerError = 'Unable to start camera. Please check permissions and try again.';
      this.isScanningBarcode = false;
    }
  }

  private async processBarcodeResult(ean: string): Promise<void> {
    try {
      // Stop scanning first
      await this.stopBarcodeScanning();
      
      // Search for product by EAN
      console.log('Searching for product with EAN:', ean);
      
      const result = await this.productService.searchProductByEAN(ean);
      
      if (result) {
        console.log('Product found:', result);
        
        // Update search query to show the EAN
        this.searchQuery = ean;
        this.searchQueryChange.emit(this.searchQuery);
        
        // Update search results with the found product
        this.updateSearchResults([result]);
        
        // Auto-select the product
        this.onSelectProduct(result);
        
        // Clear any previous errors
        this.updateSearchError(false);
        this.updateSearchErrorType(null);
        this.updateSearchErrorMessage(null);
      } else {
        console.log('No product found for EAN:', ean);
        this.searchQuery = ean;
        this.searchQueryChange.emit(this.searchQuery);
        this.updateSearchResults([]);
      }
    } catch (error) {
      console.error('Error processing barcode result:', error);
      this.searchQuery = ean;
      this.searchQueryChange.emit(this.searchQuery);
      this.updateSearchError(true);
      this.updateSearchErrorType('barcode_error');
      this.updateSearchErrorMessage('Product not found for this barcode');
    }
  }

  async stopBarcodeScanning(): Promise<void> {
    try {
      if (this.html5QrCode && this.html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      }
    } catch (error) {
      console.error('Error stopping barcode scanner:', error);
    } finally {
      this.html5QrCode = null;
      this.isScanningBarcode = false;
      this.scannerError = null;
    }
  }

  // Helper methods to emit changes
  private updateSearchResults(results: Product[]): void {
    this.searchResults = results;
    this.searchResultsChange.emit(results);
  }

  private updateIsSearching(isSearching: boolean): void {
    this.isSearching = isSearching;
    this.isSearchingChange.emit(isSearching);
  }

  private updateSearchError(error: boolean): void {
    this.searchError = error;
    this.searchErrorChange.emit(error);
  }

  private updateSearchErrorType(errorType: string | null): void {
    this.searchErrorType = errorType;
    this.searchErrorTypeChange.emit(errorType);
  }

  private updateSearchErrorMessage(message: string | null): void {
    this.searchErrorMessage = message;
    this.searchErrorMessageChange.emit(message);
  }
} 