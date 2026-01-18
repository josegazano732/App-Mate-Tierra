import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../services/cart.service';
import { ProductService, Product } from '../services/product.service';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

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
  isLoading = true;
  currentPage = 1;
  productsPerPage = 10;
  totalPages = 1;
  errorMessage: string | null = null;
  availableProducts = 0;
  private readonly productImageFallback = 'https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=900&q=60';

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProducts();
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
    } else {
      this.filteredProducts = [...this.products];
    }
    this.updateAvailableProducts();
    this.updateDisplayedProducts();
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

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.updateDisplayedProducts();
    }
  }

  addToCart(product: Product) {
    this.cartService.addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    });
  }

  viewProductDetails(product: Product) {
    this.router.navigate(['/productos', product.id]);
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
}