import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CartService, CartItem } from '../../services/cart.service';
import { SalesService, PaymentSplit } from '../../services/sales.service';
import { AuthService } from '../../services/auth.service';
import { PaymentMethodsService, PaymentMethod } from '../../services/payment-methods.service';
import { ProductService, Product } from '../../services/product.service';

@Component({
  selector: 'app-current-sale',
  templateUrl: './current-sale.component.html',
  styleUrls: ['./current-sale.component.css']
})
export class CurrentSaleComponent implements OnInit, OnDestroy {
  private readonly CURRENT_ACCOUNT_CODE = 'cuenta_corriente';

  saleItems: CartItem[] = [];
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm = '';
  isLoadingProducts = false;
  productError = '';
  paymentMethods: PaymentMethod[] = [];
  paymentSplits: PaymentSplit[] = [{ method: '', amount: 0 }];
  errorMessage = '';
  customerName = '';
  paymentDueDate: string | null = null;
  userId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private salesService: SalesService,
    private authService: AuthService,
    private paymentMethodsService: PaymentMethodsService,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.cartService.getCart()
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.saleItems = items;
        this.updateInitialAmount();
      });

    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user && user.id) {
          if (user.id !== this.userId) {
            this.userId = user.id;
            this.loadPaymentMethods();
            this.loadProducts();
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

  loadProducts() {
    this.isLoadingProducts = true;
    this.productError = '';
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.productError = 'No pudimos cargar los productos disponibles';
      },
      complete: () => {
        this.isLoadingProducts = false;
      }
    });
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    const normalized = term.trim().toLowerCase();
    this.filteredProducts = normalized
      ? this.products.filter(p => p.name.toLowerCase().includes(normalized))
      : this.products;
  }

  addProductToSale(product: Product) {
    if (!product?.id) return;
    const existing = this.saleItems.find(item => item.id === product.id);
    if (existing) {
      existing.quantity = this.normalizeQuantity(existing.quantity + this.getQuantityStep(existing), existing.unit_of_measure);
      existing.price = product.price;
    } else {
      this.saleItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.price,
        quantity: 1,
        unit_of_measure: product.unit_of_measure || 'unidad'
      });
    }
    this.updateInitialAmount();
  }

  updateItemQuantity(productId: string, quantity: number) {
    const item = this.saleItems.find(it => it.id === productId);
    if (!item) return;
    const normalized = this.normalizeQuantity(quantity, item.unit_of_measure);
    if (normalized <= 0) {
      this.removeItem(productId);
    } else {
      item.quantity = normalized;
    }
    this.updateInitialAmount();
  }

  getQuantityStep(item: CartItem): number {
    return this.isWeightUnit(item.unit_of_measure) ? 0.01 : 1;
  }

  getQuantityMin(item: CartItem): number {
    return this.isWeightUnit(item.unit_of_measure) ? 0.01 : 1;
  }

  getUnitLabel(item: CartItem): string {
    const unit = (item.unit_of_measure || 'unidad').toLowerCase();
    if (unit === 'kg') return 'kg';
    if (unit === 'gs') return 'gs';
    return 'unidad';
  }

  private normalizeQuantity(value: number, unit?: string | null): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    const min = this.isWeightUnit(unit) ? 0.01 : 1;
    const clamped = Math.max(0, parsed);
    if (this.isWeightUnit(unit)) {
      return Number(Math.max(min, clamped).toFixed(2));
    }
    return Math.max(min, Math.round(clamped));
  }

  private isWeightUnit(unit?: string | null): boolean {
    const normalized = (unit || '').toLowerCase();
    return normalized === 'kg';
  }

  removeItem(productId: string) {
    this.saleItems = this.saleItems.filter(item => item.id !== productId);
    this.updateInitialAmount();
  }

  getTotal(): number {
    return this.saleItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  updateInitialAmount() {
    if (this.paymentSplits.length === 0) return;

    const total = this.getTotal();

    if (this.paymentSplits.length === 1) {
      this.paymentSplits[0].amount = total;
      return;
    }

    const currentTotal = this.paymentSplits.reduce((sum, split) => sum + (split.amount || 0), 0);

    if (currentTotal === 0) {
      this.paymentSplits[0].amount = total;
      return;
    }

    const remaining = total - currentTotal;
    if (Math.abs(remaining) > 0.01) {
      const lastSplit = this.paymentSplits[this.paymentSplits.length - 1];
      lastSplit.amount = Math.max(0, (lastSplit.amount || 0) + remaining);
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
    const requiresCurrentAccountData = this.usesCurrentAccount();
    const hasCurrentAccountData = !requiresCurrentAccountData || (this.customerName.trim().length > 0 && !!this.paymentDueDate);
    return this.saleItems.length > 0 && allMethodsSelected && totalCorrect && hasCurrentAccountData;
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

    if (this.usesCurrentAccount() && (!this.customerName.trim() || !this.paymentDueDate)) {
      this.errorMessage = 'Completa nombre del cliente y fecha de pago';
      return;
    }

    const normalizedSplits = this.paymentSplits.map(split => ({
      ...split,
      method: this.normalizeMethodCode(split.method)
    }));
    const paymentMethods = normalizedSplits.map(split => split.method).join(',');

    this.salesService.createSale(this.userId, this.saleItems, paymentMethods, normalizedSplits, {
      customerName: this.customerName.trim() || null,
      paymentDueDate: this.paymentDueDate
    })
      .subscribe({
        next: () => {
          this.cartService.clearCart();
          this.saleItems = [];
          this.paymentSplits = [{ method: '', amount: 0 }];
          this.customerName = '';
          this.paymentDueDate = null;
          this.errorMessage = '';
          this.updateInitialAmount();
        },
        error: (error: Error) => {
          console.error('Error registering sale:', error);
          this.errorMessage = error.message || 'Error al registrar la venta';
        }
      });
  }

  usesCurrentAccount(): boolean {
    return this.paymentSplits.some(split => this.isCurrentAccount(split.method));
  }

  isCurrentAccount(method?: string | null): boolean {
    const normalized = this.normalizeMethodCode(method);
    if (!normalized) return false;
    if (normalized === this.CURRENT_ACCOUNT_CODE) return true;

    const matched = this.paymentMethods.find(candidate => {
      const code = this.normalizeMethodCode(candidate.code);
      const name = this.normalizeMethodCode(candidate.name);
      return code === normalized || name === normalized;
    });

    if (!matched) return false;
    return this.normalizeMethodCode(matched.code) === this.CURRENT_ACCOUNT_CODE ||
      this.normalizeMethodCode(matched.name) === this.CURRENT_ACCOUNT_CODE;
  }

  normalizeMethodCode(method?: string | null): string {
    if (!method) return '';
    return method
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, '_')
      .replace(/_+/g, '_');
  }
}
