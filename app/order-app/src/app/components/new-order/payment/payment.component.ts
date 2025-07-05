import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '../../../pipes/translate.pipe';
import { PaymentOption } from '../../../models/cart.interface';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit {
  @Input() paymentOptions: PaymentOption[] = [];
  @Input() selectedPayment!: PaymentOption;
  @Input() isProcessingOrder: boolean = false;
  
  @Output() backToCustomerRequested = new EventEmitter<void>();
  @Output() cancelOrderRequested = new EventEmitter<void>();
  @Output() placeOrderRequested = new EventEmitter<PaymentOption>();
  @Output() paymentOptionChanged = new EventEmitter<PaymentOption>();

  constructor() {}

  ngOnInit(): void {
    // Ensure we have a selected payment option
    if (!this.selectedPayment && this.paymentOptions.length > 0) {
      this.selectedPayment = this.paymentOptions[0];
    }
  }

  onBackToCustomer(): void {
    this.backToCustomerRequested.emit();
  }

  onCancelOrder(): void {
    this.cancelOrderRequested.emit();
  }

  onPlaceOrder(): void {
    if (this.selectedPayment && !this.isProcessingOrder) {
      this.placeOrderRequested.emit(this.selectedPayment);
    }
  }

  onPaymentOptionChange(option: PaymentOption): void {
    this.selectedPayment = option;
    this.paymentOptionChanged.emit(option);
  }

  get hasValidPaymentOption(): boolean {
    return !!this.selectedPayment;
  }

  get canPlaceOrder(): boolean {
    return this.hasValidPaymentOption && !this.isProcessingOrder;
  }
} 