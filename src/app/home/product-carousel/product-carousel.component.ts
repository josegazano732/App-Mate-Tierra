import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';

@Component({
  selector: 'app-product-carousel',
  templateUrl: './product-carousel.component.html',
  styleUrls: ['./product-carousel.component.css']
})
export class ProductCarouselComponent implements OnInit {
  products: Product[] = [];
  visibleProducts: Product[] = [];
  currentGroup = 0;
  productsPerGroup = 4;
  totalGroups: number[] = [];
  isLoading = true;
  isSliding = false;
  error: string | null = null;

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSeasonalProducts();
  }

  private loadSeasonalProducts() {
    this.isLoading = true;
    this.productService.getSeasonalProducts(10).subscribe({
      next: (products) => {
        this.products = products;
        this.calculateGroups();
        this.showGroup(0);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading seasonal products:', error);
        this.error = 'Error loading seasonal products';
        this.isLoading = false;
      }
    });
  }

  private calculateGroups() {
    const numberOfGroups = Math.ceil(this.products.length / this.productsPerGroup);
    this.totalGroups = Array(numberOfGroups).fill(0).map((_, i) => i);
  }

  private async animateGroupChange(callback: () => void) {
    this.isSliding = true;
    await new Promise(resolve => setTimeout(resolve, 300));
    callback();
    await new Promise(resolve => setTimeout(resolve, 50));
    this.isSliding = false;
  }

  showGroup(groupIndex: number) {
    if (groupIndex >= 0 && groupIndex < this.totalGroups.length) {
      this.animateGroupChange(() => {
        this.currentGroup = groupIndex;
        const start = this.currentGroup * this.productsPerGroup;
        const end = start + this.productsPerGroup;
        this.visibleProducts = this.products.slice(start, end);
      });
    }
  }

  prevGroup() {
    if (this.currentGroup > 0) {
      this.showGroup(this.currentGroup - 1);
    }
  }

  nextGroup() {
    if (this.currentGroup < this.totalGroups.length - 1) {
      this.showGroup(this.currentGroup + 1);
    }
  }

  goToProduct(productId: string) {
    this.router.navigate(['/productos', productId]);
  }

  getDisplayPrice(product: Product): number {
    if (!product?.price && product?.price !== 0) {
      return 0;
    }

    if (!product?.discount) {
      return product.price;
    }

    const safeDiscount = Math.min(Math.max(product.discount, 0), 100);
    const discountedPrice = product.price * (1 - safeDiscount / 100);
    return Math.max(Number(discountedPrice.toFixed(2)), 0);
  }

  getRating(product: Product): number {
    return product?.rating ? Number(product.rating.toFixed(1)) : 4.8;
  }

  getReviews(product: Product): number {
    return product?.reviews ?? 24;
  }
}