import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-product-carousel',
  templateUrl: './product-carousel.component.html',
  styleUrls: ['./product-carousel.component.css']
})
export class ProductCarouselComponent implements OnInit {
  products: Product[] = [];
  visibleProducts: Product[] = [];
  skeletonCards = Array.from({ length: 5 });
  currentGroup = 0;
  productsPerGroup = 5;
  totalGroups: number[] = [];
  categoryChips: string[] = [];
  categoryCount = 0;
  isLoading = true;
  isSliding = false;
  error: string | null = null;
  private readonly fallbackImage = 'https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=900&q=60';

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadRitualProducts();
  }

  private loadRitualProducts() {
    this.isLoading = true;
    this.productService.getProducts().subscribe({
      next: (products) => {
        const showcases = this.buildCategoryShowcases(products);
        this.products = showcases;
        this.categoryCount = showcases.length;
        this.categoryChips = showcases
          .map(product => this.getCategoryLabel(product))
          .filter((label, index, arr) => arr.indexOf(label) === index)
          .slice(0, 6);
        this.calculateGroups();
        this.showGroup(0);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ritual products:', error);
        this.error = 'Error loading ritual products';
        this.isLoading = false;
      }
    });
  }

  private buildCategoryShowcases(products: Product[]): Product[] {
    const scored = [...products].sort((a, b) => this.getProductScore(b) - this.getProductScore(a));
    const categoryMap = new Map<string, Product>();

    for (const product of scored) {
      const categoryLabel = this.getCategoryLabel(product);
      if (!categoryMap.has(categoryLabel)) {
        categoryMap.set(categoryLabel, product);
      }
    }

    return Array.from(categoryMap.values());
  }

  private getProductScore(product: Product): number {
    const seasonalScore = product.seasonal ? 3 : 0;
    const discountScore = product.discount ? 2 : 0;
    const ratingScore = product.rating ? Math.min(product.rating, 5) / 5 : 0;
    const stockScore = (product.stock ?? 0) > 0 ? 1 : 0;
    const createdAt = product.created_at ? Date.parse(product.created_at) : 0;

    return seasonalScore + discountScore + ratingScore + stockScore + createdAt / 1e13;
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

  addToCart(product: Product) {
    if (!product?.id) {
      return;
    }

    if ((product.stock ?? 0) <= 0) {
      return;
    }

    const unitPrice = product.discount ? this.getDisplayPrice(product) : product.price;

    this.cartService.addToCart({
      id: product.id,
      name: product.name,
      price: unitPrice,
      originalPrice: product.price,
      quantity: 1,
      unit_of_measure: product.unit_of_measure || 'unidad'
    });
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

  getStockBadgeLabel(product: Product): string {
    const stock = product?.stock ?? 0;
    if (stock <= 0) {
      return 'Sin stock';
    }
    if (stock <= 5) {
      return 'Últimas unidades';
    }
    return 'Disponible';
  }

  getStockBadgeClass(product: Product): string {
    const stock = product?.stock ?? 0;
    if (stock <= 0) {
      return 'out';
    }
    if (stock <= 5) {
      return 'low';
    }
    return 'ok';
  }

  getStockBadgeIcon(product: Product): string {
    const stock = product?.stock ?? 0;
    if (stock <= 0) {
      return 'fa-times-circle';
    }
    if (stock <= 5) {
      return 'fa-bolt';
    }
    return 'fa-check-circle';
  }

  getCategoryLabel(product: Product): string {
    return product?.category_name || product?.category || 'Colección Mate';
  }

  trackByProductId(_index: number, product: Product): string {
    return product.id;
  }

  getPrimaryImage(product: Product): string {
    if (product?.image_urls?.length) {
      return product.image_urls[0];
    }

    if (product?.image) {
      return product.image;
    }

    return this.fallbackImage;
  }

  handleImageError(event: Event) {
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }

    if (target.src === this.fallbackImage) {
      return;
    }

    target.onerror = null;
    target.src = this.fallbackImage;
  }
}