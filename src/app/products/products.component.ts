import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService, CartItem } from '../services/cart.service';
import { ProductService, Product } from '../services/product.service';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { CategoryService } from '../services/category.service';
import { Category } from '../models/category.model';

@Component({
  selector: 'app-products',
  templateUrl: 'products.component.html',
  styleUrls: ['products.component.css'],
  animations: [
    trigger('productAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger('50ms', animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })))
        ], { optional: true })
      ])
    ])
  ]
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = [];
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  cartItems: CartItem[] = [];
  cartItemCount = 0;
  cartTotal = 0;
  showWhatsAppConfirmModal = false;
  submitAttempted = false;
  paymentMethod: 'efectivo' | 'transferencia' | '' = '';
  deliveryMethod: 'domicilio' | 'retiro' | '' = '';
  customerName = '';
  customerLastName = '';
  customerAddress = '';
  confirmError = '';
  isLoading = true;
  currentPage = 1;
  productsPerPage = 10;
  totalPages = 1;
  errorMessage: string | null = null;
  availableProducts = 0;
  private activeCategoryName = '';
  readonly categoryImageFallback = 'assets/images/Isotipo - VerdePng.png';
  private readonly productImageFallback = 'https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=900&q=60';
  private readonly prioritizedKeywords = ['mates', 'termera', 'termos'];
  private readonly whatsappPhone = '5493758459113';
  private readonly currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  });

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
    this.cartService.getCart().subscribe(items => {
      this.cartItems = items;
      this.cartItemCount = items.reduce((total, item) => total + item.quantity, 0);
      this.cartTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    });
  }

  loadProducts() {
    this.isLoading = true;
    this.errorMessage = null;
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoading = false;
        this.errorMessage = 'Could not load products. Please try again later.';
      }
    });
  }

  onFilterChange(filter: {search: string, category: string}) {
    this.applyFilters(filter);
  }

  applyFilters(filter?: {search: string, category: string}) {
    if (filter) {
      this.filteredProducts = this.products.filter(product =>
        (product.name.toLowerCase().includes(filter.search.toLowerCase()) ||
         product.description.toLowerCase().includes(filter.search.toLowerCase())) &&
        (filter.category === '' || product.category_name === filter.category)
      );
      this.activeCategoryName = filter.category?.trim() || '';
    } else {
      this.filteredProducts = [...this.products];
      this.activeCategoryName = '';
    }

    this.setSelectedCategory(this.activeCategoryName);
    this.currentPage = 1;
    this.filteredProducts = this.sortProductsByPriority(this.filteredProducts);
    this.updateAvailableProducts();
    this.updateDisplayedProducts();
  }

  private loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.setSelectedCategory(this.activeCategoryName);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  private sortProductsByPriority(products: Product[]): Product[] {
    return [...products].sort((a, b) => {
      const priorityA = this.getProductPriority(a);
      const priorityB = this.getProductPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
    });
  }

  private getProductPriority(product: Product): number {
    const name = this.normalizeText(product.name);
    const category = this.normalizeText(product.category_name || '');
    const combined = `${name} ${category}`.trim();

    const index = this.prioritizedKeywords.findIndex(keyword => combined.includes(keyword));
    return index === -1 ? 999 : index;
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  updateDisplayedProducts() {
    const startIndex = (this.currentPage - 1) * this.productsPerPage;
    const endIndex = startIndex + this.productsPerPage;
    this.displayedProducts = this.filteredProducts.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.filteredProducts.length / this.productsPerPage);
  }

  private updateAvailableProducts() {
    this.availableProducts = this.filteredProducts.filter(product => product.stock > 0).length;
  }

  private setSelectedCategory(categoryName: string) {
    const normalized = categoryName?.trim();
    if (!normalized) {
      this.selectedCategory = null;
      return;
    }

    this.selectedCategory = this.categories.find(category => category.name === normalized) || null;
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.updateDisplayedProducts();
      this.scrollToTop();
    }
  }

  private scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addToCart(product: Product) {
    this.cartService.addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      unit_of_measure: product.unit_of_measure || 'unidad',
      category_name: product.category_name || product.category,
      category: product.category
    });
  }

  viewProductDetails(product: Product) {
    this.router.navigate(['/productos', product.id]);
  }

  goToCart() {
    this.router.navigate(['/carrito']);
  }

  clearCart() {
    this.cartService.clearCart();
  }

  openWhatsAppConfirmModal() {
    if (!this.cartItems.length) {
      return;
    }

    this.confirmError = '';
    this.submitAttempted = false;
    this.showWhatsAppConfirmModal = true;
  }

  closeWhatsAppConfirmModal() {
    this.showWhatsAppConfirmModal = false;
    this.submitAttempted = false;
  }

  sendCartViaWhatsApp() {
    if (!this.cartItems.length) {
      return;
    }

    this.submitAttempted = true;
    const validationErrors = this.getConfirmValidationErrors();
    if (validationErrors.length > 0) {
      this.confirmError = validationErrors.join('\n');
      return;
    }

    this.confirmError = '';

    const itemsText = this.cartItems
      .map(item => {
        const quantity = this.formatCartQuantity(item);
        const lineTotal = this.currencyFormatter.format(item.price * item.quantity);
        return `• ${item.name} | ${quantity} | Total: ${lineTotal}`;
      })
      .join('\n');

    const total = this.currencyFormatter.format(this.cartTotal);
    const message = [
      'Hola quiero confirmar mi pedido:',
      '',
      `Nombre: ${this.customerName.trim()} ${this.customerLastName.trim()}`,
      `Pago: ${this.paymentMethod === 'efectivo' ? 'Pago en Efectivo' : 'Pago por Transferencia'}`,
      `Entrega: ${this.deliveryMethod === 'domicilio' ? 'Envio a Domicilio' : 'Retiro por Tienda'}`,
      this.deliveryMethod === 'domicilio'
        ? `Direccion: ${this.customerAddress.trim()}`
        : 'Direccion: Retira por tienda',
      '',
      itemsText,
      '',
      `Total estimado: ${total}`
    ].join('\n');
    window.open(`https://wa.me/${this.whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    this.closeWhatsAppConfirmModal();
  }

  onDeliveryMethodChange(mode: 'domicilio' | 'retiro' | '') {
    this.deliveryMethod = mode;
    if (mode === 'retiro') {
      this.customerAddress = '';
    }
  }

  formatConfirmCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  isPaymentSelected(): boolean {
    return this.paymentMethod !== '';
  }

  isDeliverySelected(): boolean {
    return this.deliveryMethod !== '';
  }

  isAddressRequired(): boolean {
    return this.deliveryMethod === 'domicilio';
  }

  private getConfirmValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.isPaymentSelected()) {
      errors.push('Seleccioná un metodo de pago.');
    }

    if (!this.isDeliverySelected()) {
      errors.push('Seleccioná un tipo de entrega.');
    }

    if (this.customerName.trim().length <= 1) {
      errors.push('Ingresá tu nombre.');
    }

    if (this.customerLastName.trim().length <= 1) {
      errors.push('Ingresá tu apellido.');
    }

    if (this.isAddressRequired() && this.customerAddress.trim().length <= 4) {
      errors.push('Ingresá una direccion valida.');
    }

    return errors;
  }

  retryLoading() {
    this.loadProducts();
  }

  getPrimaryImage(product: Product): string {
    if (product?.image_urls?.length) {
      return product.image_urls[0];
    }

    if (product?.image) {
      return product.image;
    }

    return this.productImageFallback;
  }

  handleProductImageError(event: Event) {
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }

    if (target.src === this.productImageFallback) {
      return;
    }

    target.onerror = null;
    target.src = this.productImageFallback;
  }

  getWhatsAppLink(product: Product): string {
    const price = typeof product?.price === 'number' ? product.price.toFixed(2) : 'N/A';
    const imageUrl = this.getPrimaryImage(product);
    const message = `Hola! Quiero consultar por el producto: ${product.name}. Precio: ${price}. Imagen: ${imageUrl}`;
    return `https://wa.me/${this.whatsappPhone}?text=${encodeURIComponent(message)}`;
  }

  getActiveCategoryImage(): string {
    if (this.selectedCategory?.image) {
      return this.selectedCategory.image;
    }

    return this.categoryImageFallback;
  }

  handleCategoryImageError(event: Event) {
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }

    if (target.src === this.categoryImageFallback) {
      return;
    }

    target.onerror = null;
    target.src = this.categoryImageFallback;
  }

  formatCartQuantity(item: CartItem): string {
    const quantity = Number.isInteger(item.quantity) ? item.quantity.toString() : item.quantity.toFixed(2);
    const unit = item.unit_of_measure || 'unidad';
    return `${quantity} ${unit}`;
  }

}
