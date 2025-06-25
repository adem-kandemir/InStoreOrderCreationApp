import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Language = 'en' | 'de';

export interface Translations {
  [key: string]: string | Translations;
}

@Injectable({
  providedIn: 'root'
})
export class LocalizationService {
  private currentLanguageSubject = new BehaviorSubject<Language>('en');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  private translations: Record<Language, Translations> = {
    en: {
      // Header
      header: {
        newOrder: 'New Order',
        orders: 'Orders',
        settings: 'Settings',
        language: 'Language'
      },
      
      // Search
      search: {
        placeholder: 'Search products by description or number',
        searching: 'Searching...',
        noResults: 'No products found'
      },
      
      // Product Table
      table: {
        id: 'ID',
        ean: 'EAN',
        description: 'Product description',
        listPrice: 'List price',
        unit: 'Unit'
      },
      
      // Product Details
      productDetails: {
        title: 'Product details',
        listPrice: 'List price',
        availability: 'Availability',
        inStore: 'In store available',
        online: 'Online available',
        otherLocations: 'Stock in other branches',
        pieces: 'pieces',
        addToCart: 'Add to cart',
        refresh: 'Refresh product details'
      },
      
      // Cart
      cart: {
        title: 'Cart',
        empty: 'Cart is empty',
        emptyInstruction: 'Please select a product and add it to the cart.',
        product: 'Product',
        quantity: 'Quantity',
        listPrice: 'List price',
        price: 'Price',
        total: 'Total',
        totalOriginal: 'Total Price (Original)',
        discount: 'Discount',
        finalTotal: 'Total',
        emptyCart: 'Empty cart',
        continue: 'Continue to Customer details'
      },
      
      // Customer Details
      customer: {
        title: 'Customer details',
        personalInfo: 'Personal Information',
        firstName: 'First name',
        lastName: 'Last name',
        email: 'Email',
        phone: 'Phone number (optional)',
        addressInfo: 'Address Information',
        addressLine1: 'Address Line 1',
        addressLine2: 'Address Line 2',
        zipCode: 'Zip Code',
        city: 'City',
        country: 'Country',
        shippingOption: 'Shipping option',
        delivery: 'Delivery',
        days: 'days',
        cancelOrder: 'Cancel Order',
        continuePayment: 'Continue to Payment',
        completed: 'Completed'
      },
      
      // Payment
      payment: {
        title: 'Payment option',
        prepayment: 'Prepayment',
        prepaymentDesc: 'Please transfer confirmation number to the cashier and pay with the available payment options.',
        placeOrder: 'Place Order'
      },
      
      // Success
      success: {
        title: 'Congratulations! The order has been placed successfully.',
        confirmationNumber: 'Order confirmation number',
        newOrder: 'New Order'
      },
      
      // Error
      error: {
        title: 'Something went wrong and the order was not placed successfully :(',
        message: 'Please try again or contact your IT administrator.',
        newOrder: 'New Order'
      },
      
      // Common
      common: {
        back: 'Back',
        required: 'required'
      }
    },
    
    de: {
      // Header
      header: {
        newOrder: 'Neue Bestellung',
        orders: 'Bestellungen',
        settings: 'Einstellungen',
        language: 'Sprache'
      },
      
      // Search
      search: {
        placeholder: 'Produkte nach Beschreibung oder Nummer suchen',
        searching: 'Suche läuft...',
        noResults: 'Keine Produkte gefunden'
      },
      
      // Product Table
      table: {
        id: 'ID',
        ean: 'EAN',
        description: 'Produktbeschreibung',
        listPrice: 'Listenpreis',
        unit: 'Einheit'
      },
      
      // Product Details
      productDetails: {
        title: 'Produktdetails',
        listPrice: 'Listenpreis',
        availability: 'Verfügbarkeit',
        inStore: 'In Filiale verfügbar',
        online: 'Online verfügbar',
        otherLocations: 'Bestand in weiteren Filialen',
        pieces: 'Stück',
        addToCart: 'zum Warenkorb hinzufügen',
        refresh: 'Produktdetails aktualisieren'
      },
      
      // Cart
      cart: {
        title: 'Warenkorb',
        empty: 'Warenkorb ist leer',
        emptyInstruction: 'Bitte wählen Sie ein Produkt aus und fügen Sie es zum Warenkorb hinzu.',
        product: 'Produkt',
        quantity: 'Menge',
        listPrice: 'Listenpreis',
        price: 'Preis',
        total: 'Gesamt',
        totalOriginal: 'Gesamtpreis (Original)',
        discount: 'Rabatt',
        finalTotal: 'Gesamt',
        emptyCart: 'Warenkorb leeren',
        continue: 'Weiter zu Kundendaten'
      },
      
      // Customer Details
      customer: {
        title: 'Kundendaten',
        personalInfo: 'Persönliche Informationen',
        firstName: 'Vorname',
        lastName: 'Nachname',
        email: 'E-Mail',
        phone: 'Telefonnummer (optional)',
        addressInfo: 'Adressinformationen',
        addressLine1: 'Adresszeile 1',
        addressLine2: 'Adresszeile 2',
        zipCode: 'Postleitzahl',
        city: 'Stadt',
        country: 'Land',
        shippingOption: 'Versandoption',
        delivery: 'Lieferung',
        days: 'Tage',
        cancelOrder: 'Bestellung stornieren',
        continuePayment: 'Weiter zur Zahlung',
        completed: 'Abgeschlossen'
      },
      
      // Payment
      payment: {
        title: 'Zahlungsoption',
        prepayment: 'Vorauskasse',
        prepaymentDesc: 'Bitte übertragen Sie die Bestätigungsnummer an den Kassierer und zahlen Sie mit den verfügbaren Zahlungsoptionen.',
        placeOrder: 'Bestellung aufgeben'
      },
      
      // Success
      success: {
        title: 'Herzlichen Glückwunsch! Die Bestellung wurde erfolgreich aufgegeben.',
        confirmationNumber: 'Bestellbestätigungsnummer',
        newOrder: 'Neue Bestellung'
      },
      
      // Error
      error: {
        title: 'Etwas ist schief gelaufen und die Bestellung wurde nicht erfolgreich aufgegeben :(',
        message: 'Bitte versuchen Sie es erneut oder wenden Sie sich an Ihren IT-Administrator.',
        newOrder: 'Neue Bestellung'
      },
      
      // Common
      common: {
        back: 'Zurück',
        required: 'erforderlich'
      }
    }
  };

  constructor() {
    // Load saved language from localStorage or default to English
    if (this.isBrowser()) {
      const savedLanguage = localStorage.getItem('selectedLanguage') as Language;
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'de')) {
        this.currentLanguageSubject.next(savedLanguage);
      }
    }
  }

  getCurrentLanguage(): Language {
    return this.currentLanguageSubject.value;
  }

  setLanguage(language: Language): void {
    this.currentLanguageSubject.next(language);
    if (this.isBrowser()) {
      localStorage.setItem('selectedLanguage', language);
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  translate(key: string): string {
    const language = this.getCurrentLanguage();
    const keys = key.split('.');
    let translation: any = this.translations[language];
    
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        // Fallback to English if translation not found
        translation = this.translations.en;
        for (const fallbackKey of keys) {
          if (translation && typeof translation === 'object' && fallbackKey in translation) {
            translation = translation[fallbackKey];
          } else {
            return key; // Return key if no translation found
          }
        }
        break;
      }
    }
    
    return typeof translation === 'string' ? translation : key;
  }

  // Helper method for templates
  t(key: string): string {
    return this.translate(key);
  }
} 