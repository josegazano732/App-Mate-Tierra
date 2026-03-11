import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartItem, CartService } from '../../services/cart.service';
import { Product, ProductService } from '../../services/product.service';

@Component({
  selector: 'app-whatsapp-catalog',
  templateUrl: './whatsapp-catalog.component.html',
  styleUrls: ['./whatsapp-catalog.component.css']
})
export class WhatsappCatalogComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  searchTerm = '';
  selectedCategory = '';
  availableCategories: string[] = [];

  currentPage = 1;
  productsPerPage = 12;
  totalPages = 1;

  orderItems: CartItem[] = [];
  orderCount = 0;
  orderSubtotal = 0;
  showWhatsAppConfirmModal = false;
  paymentMethod: 'efectivo' | 'transferencia' | '' = '';
  deliveryMethod: 'domicilio' | 'retiro' | '' = '';
  customerName = '';
  customerLastName = '';
  customerAddress = '';
  confirmError = '';

  private readonly whatsappCategories = ['hierbas', 'alimentos secos'];
  private readonly whatsappPhone = '5493758459113';
  private readonly productImageFallback = 'https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=900&q=60';
  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.cartService.getCart().subscribe(items => {
      const catalogItems = items.filter(item => this.isCategoryEnabled(item.category_name || item.category || ''));
      this.orderItems = catalogItems;
      this.orderCount = catalogItems.reduce((total, item) => total + item.quantity, 0);
      this.orderSubtotal = catalogItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    });
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.productService.getProducts().subscribe({
      next: products => {
        const catalogProducts = products.filter(product => {
          const hasWholesalePrice = this.getWholesalePrice(product) > 0;
          return hasWholesalePrice && this.isCategoryEnabled(product.category_name || product.category || '');
        });
        this.products = this.sortByCategoryThenName(catalogProducts);
        this.availableCategories = this.buildCategories(this.products);
        this.applyFilters();
        this.isLoading = false;
      },
      error: err => {
        console.error('Error loading WhatsApp catalog:', err);
        this.errorMessage = 'No se pudo cargar el catalogo mayorista. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const normalizedSearch = this.normalizeText(this.searchTerm.trim());

    this.filteredProducts = this.products.filter(product => {
      const category = product.category_name || product.category || '';
      const categoryMatch = this.selectedCategory === '' || category === this.selectedCategory;
      if (!categoryMatch) return false;

      if (!normalizedSearch) return true;

      const name = this.normalizeText(product.name || '');
      const description = this.normalizeText(product.description || '');
      return name.includes(normalizedSearch) || description.includes(normalizedSearch);
    });

    this.currentPage = 1;
    this.updateDisplayedProducts();
  }

  updateDisplayedProducts(): void {
    const start = (this.currentPage - 1) * this.productsPerPage;
    const end = start + this.productsPerPage;
    this.displayedProducts = this.filteredProducts.slice(start, end);
    this.totalPages = Math.max(1, Math.ceil(this.filteredProducts.length / this.productsPerPage));
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addOrder(product: Product): void {
    if (product.stock === 0) return;
    const wholesalePrice = this.getWholesalePrice(product);
    if (wholesalePrice <= 0) return;

    this.cartService.addToCart({
      id: product.id,
      name: product.name,
      price: wholesalePrice,
      quantity: 1,
      unit_of_measure: product.unit_of_measure || 'unidad',
      category_name: product.category_name || product.category,
      category: product.category
    });
  }

  increaseOrder(product: Product): void {
    const quantity = this.getProductQuantity(product);
    this.cartService.updateQuantity(product.id, quantity + 1, this.getWholesalePrice(product));
  }

  decreaseOrder(product: Product): void {
    const quantity = this.getProductQuantity(product);
    if (quantity <= 0) return;
    this.cartService.updateQuantity(product.id, quantity - 1, this.getWholesalePrice(product));
  }

  getProductQuantity(product: Product): number {
    return this.orderItems.find(item => item.id === product.id)?.quantity || 0;
  }

  openWhatsAppConfirmModal(): void {
    if (!this.orderItems.length) return;
    this.confirmError = '';
    this.showWhatsAppConfirmModal = true;
  }

  closeWhatsAppConfirmModal(): void {
    this.showWhatsAppConfirmModal = false;
  }

  clearOrder(): void {
    this.cartService.clearCart();
    this.confirmError = '';
    this.showWhatsAppConfirmModal = false;
  }

  confirmAndSendOrderViaWhatsApp(): void {
    if (!this.orderItems.length) return;
    if (!this.canConfirmOrder()) {
      this.confirmError = 'Completa los datos requeridos para continuar.';
      return;
    }

    this.confirmError = '';

    const lines = this.orderItems
      .map(item => {
        const lineTotal = item.price * item.quantity;
        return `- ${item.name} x${item.quantity} | ${this.formatPrice(item.price)} | Total: ${this.formatPrice(lineTotal)}`;
      })
      .join('\n');

    const message = [
      'Hola, quiero hacer este pedido del catalogo mayorista:',
      '',
      `Nombre: ${this.customerName.trim()} ${this.customerLastName.trim()}`,
      `Pago: ${this.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}`,
      `Entrega: ${this.deliveryMethod === 'domicilio' ? 'Envio a domicilio' : 'Retiro por tienda'}`,
      this.deliveryMethod === 'domicilio' ? `Direccion: ${this.customerAddress.trim()}` : 'Direccion: Retira por tienda',
      '',
      lines,
      '',
      `Cantidad de productos: ${this.orderCount}`,
      `Subtotal: ${this.formatPrice(this.orderSubtotal)}`
    ].join('\n');

    const url = `https://wa.me/${this.whatsappPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
    this.closeWhatsAppConfirmModal();
  }

  canConfirmOrder(): boolean {
    const hasName = this.customerName.trim().length > 1;
    const hasLastName = this.customerLastName.trim().length > 1;
    const hasPayment = this.paymentMethod !== '';
    const hasDelivery = this.deliveryMethod !== '';
    const hasAddressIfNeeded = this.deliveryMethod !== 'domicilio' || this.customerAddress.trim().length > 4;
    return hasName && hasLastName && hasPayment && hasDelivery && hasAddressIfNeeded;
  }

  onDeliveryMethodChange(mode: 'domicilio' | 'retiro' | ''): void {
    this.deliveryMethod = mode;
    if (mode === 'retiro') {
      this.customerAddress = '';
    }
  }

  goToCart(): void {
    this.router.navigate(['/carrito']);
  }

  goToProducts(): void {
    this.router.navigate(['/productos']);
  }

  getPrimaryImage(product: Product): string {
    if (product?.image_urls?.length) return product.image_urls[0];
    if (product?.image) return product.image;
    return this.productImageFallback;
  }

  handleProductImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target || target.src === this.productImageFallback) return;
    target.onerror = null;
    target.src = this.productImageFallback;
  }

  private buildCategories(products: Product[]): string[] {
    const unique = new Set<string>();
    products.forEach(product => {
      const category = product.category_name || product.category || '';
      if (category.trim()) unique.add(category);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  private sortByCategoryThenName(products: Product[]): Product[] {
    return [...products].sort((a, b) => {
      const categoryA = a.category_name || a.category || '';
      const categoryB = b.category_name || b.category || '';
      const byCategory = categoryA.localeCompare(categoryB, 'es', { sensitivity: 'base' });
      if (byCategory !== 0) return byCategory;
      return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
    });
  }

  private isCategoryEnabled(categoryName: string): boolean {
    const normalized = this.normalizeText(categoryName).trim();
    return this.whatsappCategories.some(category => normalized.includes(category));
  }

  private normalizeText(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  getWholesalePrice(product: Product): number {
    const value = product?.wholesale_price;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  formatPrice(value: number | null | undefined): string {
    const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return this.priceFormatter.format(amount);
  }
}
