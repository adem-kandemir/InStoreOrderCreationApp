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
        noResults: 'No products found',
        noProductsFound: 'No products found for'
      },
      
      // Barcode Scanner
      scanner: {
        title: 'Barcode Scanner',
        instructions: 'Point your camera at a barcode to scan it',
        cancel: 'Cancel'
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
        refresh: 'Refresh product details',
        noAvailability: 'No availability information available',
        detailedAvailability: 'Detailed Availability',
        updated: 'Updated'
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
        continue: 'Continue to Customer details',
        sourcing: 'Sourcing Information',
        site: 'Site',
        availableFrom: 'Available from',
        noSourcing: 'No sourcing data available',
        sourcingError: 'Sourcing request failed'
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
      
      // Unauthorized
      unauthorized: {
        title: 'Access Denied',
        message: 'You do not have the necessary permissions to access this application.',
        currentUser: 'Current User',
        roles: 'Assigned Roles',
        contactAdmin: 'Contact Administrator',
        logout: 'Logout'
      },
      
      // Settings
      settings: {
        title: 'Settings',
        description: 'Customize your application appearance and preferences.',
        appInfo: 'Application Information',
        companyName: 'Company Name',
        appTitle: 'Application Title',
        customization: 'Customization',
        favicon: 'Favicon',
        faviconDesc: 'Upload a custom favicon for your browser tab (recommended: 32x32px, max 1MB)',
        banner: 'Banner Image',
        bannerDesc: 'Upload a banner image for your application header (recommended: 1200x200px)',
        userAvatar: 'Default User Avatar',
        userAvatarDesc: 'Upload a default avatar image for users (recommended: square image)',
        chooseFavicon: 'Choose Favicon',
        chooseBanner: 'Choose Banner',
        chooseAvatar: 'Choose Avatar',
        uploading: 'Uploading',
        remove: 'Remove',
        actions: 'Actions',
        resetDefaults: 'Reset to Defaults'
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
        noResults: 'Keine Produkte gefunden',
        noProductsFound: 'Keine Produkte gefunden für'
      },
      
      // Barcode Scanner
      scanner: {
        title: 'Barcode-Scanner',
        instructions: 'Richten Sie Ihre Kamera auf einen Barcode, um ihn zu scannen',
        cancel: 'Abbrechen'
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
        refresh: 'Produktdetails aktualisieren',
        noAvailability: 'Verfügbarkeitsinformationen nicht verfügbar',
        detailedAvailability: 'Detaillierte Verfügbarkeit',
        updated: 'Aktualisiert'
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
        continue: 'Weiter zu Kundendaten',
        sourcing: 'Sourcing-Informationen',
        site: 'Standort',
        availableFrom: 'Verfügbar ab',
        noSourcing: 'Keine Sourcing-Daten verfügbar',
        sourcingError: 'Sourcing-Anfrage fehlgeschlagen'
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
      
      // Unauthorized
      unauthorized: {
        title: 'Zugriff verweigert',
        message: 'Sie haben nicht die erforderlichen Berechtigungen, um auf diese Anwendung zuzugreifen.',
        currentUser: 'Aktueller Benutzer',
        roles: 'Zugewiesene Rollen',
        contactAdmin: 'Administrator kontaktieren',
        logout: 'Abmelden'
      },
      
      // Settings
      settings: {
        title: 'Einstellungen',
        description: 'Passen Sie das Erscheinungsbild und die Einstellungen Ihrer Anwendung an.',
        appInfo: 'Anwendungsinformationen',
        companyName: 'Firmenname',
        appTitle: 'Anwendungstitel',
        customization: 'Anpassung',
        favicon: 'Favicon',
        faviconDesc: 'Laden Sie ein benutzerdefiniertes Favicon für Ihren Browser-Tab hoch (empfohlen: 32x32px, max 1MB)',
        banner: 'Banner-Bild',
        bannerDesc: 'Laden Sie ein Banner-Bild für Ihren Anwendungsheader hoch (empfohlen: 1200x200px)',
        userAvatar: 'Standard-Benutzer-Avatar',
        userAvatarDesc: 'Laden Sie ein Standard-Avatar-Bild für Benutzer hoch (empfohlen: quadratisches Bild)',
        chooseFavicon: 'Favicon wählen',
        chooseBanner: 'Banner wählen',
        chooseAvatar: 'Avatar wählen',
        uploading: 'Wird hochgeladen',
        remove: 'Entfernen',
        actions: 'Aktionen',
        resetDefaults: 'Auf Standard zurücksetzen'
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