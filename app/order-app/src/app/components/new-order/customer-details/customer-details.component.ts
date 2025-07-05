import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '../../../pipes/translate.pipe';
import { CustomerDetails, ShippingOption } from '../../../models/cart.interface';

@Component({
  selector: 'app-customer-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe],
  templateUrl: './customer-details.component.html',
  styleUrls: ['./customer-details.component.scss']
})
export class CustomerDetailsComponent implements OnInit {
  @Input() currentStep: 'customer' | 'payment' = 'customer';
  @Input() shippingOptions: ShippingOption[] = [];
  @Input() selectedShipping!: ShippingOption;
  @Input() initialCustomerData?: CustomerDetails;
  
  @Output() backToCartRequested = new EventEmitter<void>();
  @Output() proceedToPaymentRequested = new EventEmitter<{customerData: CustomerDetails, selectedShipping: ShippingOption}>();
  @Output() shippingOptionChanged = new EventEmitter<ShippingOption>();

  customerForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
    
    // Populate form with initial data if provided
    if (this.initialCustomerData) {
      this.customerForm.patchValue({
        firstName: this.initialCustomerData.firstName,
        lastName: this.initialCustomerData.lastName,
        email: this.initialCustomerData.email,
        phone: this.initialCustomerData.phone,
        addressLine1: this.initialCustomerData.address.line1,
        addressLine2: this.initialCustomerData.address.line2,
        zipCode: this.initialCustomerData.address.zipCode,
        city: this.initialCustomerData.address.city,
        country: this.initialCustomerData.address.country
      });
    }
  }

  private initializeForm(): void {
    this.customerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      zipCode: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required]
    });
  }

  onBackToCart(): void {
    this.backToCartRequested.emit();
  }

  onProceedToPayment(): void {
    if (this.customerForm.valid) {
      const customerData: CustomerDetails = {
        firstName: this.customerForm.value.firstName,
        lastName: this.customerForm.value.lastName,
        email: this.customerForm.value.email,
        phone: this.customerForm.value.phone,
        address: {
          line1: this.customerForm.value.addressLine1,
          line2: this.customerForm.value.addressLine2,
          zipCode: this.customerForm.value.zipCode,
          city: this.customerForm.value.city,
          country: this.customerForm.value.country
        }
      };

      this.proceedToPaymentRequested.emit({
        customerData,
        selectedShipping: this.selectedShipping
      });
    }
  }

  onShippingOptionChange(option: ShippingOption): void {
    this.selectedShipping = option;
    this.shippingOptionChanged.emit(option);
  }

  get isFormValid(): boolean {
    return this.customerForm.valid;
  }

  get isReadonly(): boolean {
    return this.currentStep === 'payment';
  }

  getCustomerData(): CustomerDetails | null {
    if (!this.customerForm.valid) {
      return null;
    }

    return {
      firstName: this.customerForm.value.firstName,
      lastName: this.customerForm.value.lastName,
      email: this.customerForm.value.email,
      phone: this.customerForm.value.phone,
      address: {
        line1: this.customerForm.value.addressLine1,
        line2: this.customerForm.value.addressLine2,
        zipCode: this.customerForm.value.zipCode,
        city: this.customerForm.value.city,
        country: this.customerForm.value.country
      }
    };
  }

  resetForm(): void {
    this.customerForm.reset();
  }
} 