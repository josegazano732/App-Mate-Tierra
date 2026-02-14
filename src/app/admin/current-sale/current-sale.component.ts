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
  globalDiscountPercent = 0;
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
        this.saleItems = items.map(item => this.normalizeSaleItem(item));
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
      existing.originalPrice = product.price;
      existing.price = this.applyLineDiscount(existing, existing.lineDiscountPercent || 0, product.price);
    } else {
      this.saleItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.price,
        quantity: 1,
        unit_of_measure: product.unit_of_measure || 'unidad',
        lineDiscountPercent: 0
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

  private normalizeSaleItem(item: CartItem): CartItem {
    const original = item.originalPrice ?? item.price;
    const percent = this.toPercent(item.lineDiscountPercent ?? 0);
    const price = this.applyLineDiscount({ ...item, originalPrice: original }, percent, original);
    return { ...item, originalPrice: original, price, lineDiscountPercent: percent };
  }

  setLineDiscount(item: CartItem, raw: string | number) {
    const percent = this.toPercent(raw);
    item.lineDiscountPercent = percent;
    item.price = this.applyLineDiscount(item, percent);
    this.updateInitialAmount();
  }

  private applyLineDiscount(item: CartItem, percent: number, basePrice?: number): number {
    const base = basePrice ?? item.originalPrice ?? item.price;
    const factor = Math.max(0, 1 - percent / 100);
    return this.round(base * factor);
  }

  getLineUnitPrice(item: CartItem): number {
    return this.round(item.price ?? 0);
  }

  private toPercent(value: any): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(100, parsed);
  }

  private round(value: number): number {
    return Number((Number(value) || 0).toFixed(2));
  }

  removeItem(productId: string) {
    this.saleItems = this.saleItems.filter(item => item.id !== productId);
    this.updateInitialAmount();
  }

  getTotal(): number {
    const subtotal = this.getSubtotal();
    const factor = Math.max(0, 1 - (this.globalDiscountPercent || 0) / 100);
    return this.round(subtotal * factor);
  }

  getSubtotal(): number {
    return this.saleItems.reduce((total, item) => total + (this.getLineUnitPrice(item) * item.quantity), 0);
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

    const globalFactor = Math.max(0, 1 - (this.globalDiscountPercent || 0) / 100);
    const discountedItems = this.saleItems.map(item => ({
      ...item,
      price: this.round(this.getLineUnitPrice(item) * globalFactor),
      originalPrice: item.originalPrice ?? item.price
    }));

    this.salesService.createSale(this.userId, discountedItems, paymentMethods, normalizedSplits, {
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
