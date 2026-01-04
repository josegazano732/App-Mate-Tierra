import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CartService, CartItem } from '../../services/cart.service';
import { SalesService, PaymentSplit } from '../../services/sales.service';
import { AuthService } from '../../services/auth.service';
import { PaymentMethodsService, PaymentMethod } from '../../services/payment-methods.service';

@Component({
  selector: 'app-current-sale',
  templateUrl: './current-sale.component.html',
  styleUrls: ['./current-sale.component.css']
})
export class CurrentSaleComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  paymentMethods: PaymentMethod[] = [];
  paymentSplits: PaymentSplit[] = [{ method: '', amount: 0 }];
  errorMessage = '';
  userId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private salesService: SalesService,
    private authService: AuthService,
    private paymentMethodsService: PaymentMethodsService
  ) {}

  ngOnInit() {
    this.cartService.getCart()
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.cartItems = items;
        this.updateInitialAmount();
      });

    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user && user.id) {
          if (user.id !== this.userId) {
            this.userId = user.id;
            this.loadPaymentMethods();
          }
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPaymentMethods() {
    this.paymentMethodsService.getActivePaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.updateInitialAmount();
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        this.errorMessage = 'Error al cargar los métodos de pago';
      }
    });
  }

  getTotal(): number {
    return this.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  updateInitialAmount() {
    if (this.paymentSplits.length > 0) {
      this.paymentSplits[0].amount = this.getTotal();
    }
  }

  addPaymentSplit() {
    if (this.canAddMoreSplits()) {
      this.paymentSplits.push({ method: '', amount: 0 });
    }
  }

  removePaymentSplit(index: number) {
    this.paymentSplits.splice(index, 1);
    this.updateRemainingAmount();
  }

  updateRemainingAmount() {
    const total = this.getTotal();
    const currentTotal = this.paymentSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
    const remaining = total - currentTotal;

    if (remaining < 0) {
      const lastModifiedSplit = this.paymentSplits[this.paymentSplits.length - 1];
      lastModifiedSplit.amount = Math.max(0, lastModifiedSplit.amount + remaining);
    }
  }

  getRemainingAmount(): number {
    const total = this.getTotal();
    const currentTotal = this.paymentSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
    return total - currentTotal;
  }

  getMaxAmount(index: number): number {
    const total = this.getTotal();
    const otherSplitsTotal = this.paymentSplits.reduce((sum, split, i) =>
      i !== index ? sum + (split.amount || 0) : sum, 0);
    return total - otherSplitsTotal;
  }

  canAddMoreSplits(): boolean {
    return this.paymentSplits.length < this.paymentMethods.length &&
      this.getRemainingAmount() > 0;
  }

  canRegisterSale(): boolean {
    const allMethodsSelected = this.paymentSplits.every(split => split.method && split.amount > 0);
    const totalCorrect = Math.abs(this.getRemainingAmount()) < 0.01;
    return this.cartItems.length > 0 && allMethodsSelected && totalCorrect;
  }

  registerSale() {
    if (!this.canRegisterSale()) {
      this.errorMessage = 'Por favor, complete todos los métodos de pago correctamente';
      return;
    }

    if (!this.userId) {
      this.errorMessage = 'Error de autenticación';
      return;
    }

    const paymentMethods = this.paymentSplits.map(split => split.method).join(',');

    this.salesService.createSale(this.userId, this.cartItems, paymentMethods, this.paymentSplits)
      .subscribe({
        next: () => {
          this.cartService.clearCart();
          this.paymentSplits = [{ method: '', amount: 0 }];
          this.errorMessage = '';
        },
        error: (error: Error) => {
          console.error('Error registering sale:', error);
          this.errorMessage = error.message || 'Error al registrar la venta';
        }
      });
  }
}
