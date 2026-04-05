import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-product-carousel',
  templateUrl: './product-carousel.component.html',
  styleUrls: ['./product-carousel.component.css']
})
export class ProductCarouselComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollGallery')
  set scrollGalleryRef(element: ElementRef<HTMLDivElement> | undefined) {
    this.scrollGallery = element;

    if (!element) {
      this.stopAutoScroll();
      this.cleanupScrollListeners();
      return;
    }

    this.cleanupScrollListeners();
    this.setupScrollListeners();
    this.syncScrollPosition();
    this.startAutoScroll();
  }

  private scrollGallery?: ElementRef<HTMLDivElement>;
  private readonly autoScrollDelay = 3000;
  private readonly resumeDelay = 10000;
  private readonly autoScrollStep = 356;
  
  products: Product[] = [];
  skeletonCards = Array.from({ length: 5 });
  categoryChips: string[] = [];
  categoryCount = 0;
  isLoading = true;
  error: string | null = null;
  private readonly fallbackImage = 'https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=900&q=60';
  private autoScrollTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeAutoScrollTimer: ReturnType<typeof setTimeout> | null = null;
  private animationTimers: Array<ReturnType<typeof setTimeout>> = [];
  private scrollPosition = 0;
  private userHasControl = false;
  private isAutoScrolling = false;
  private lastScrollLeft = 0;
  private autoScrollRunId = 0;
  private removeScrollListeners: Array<() => void> = [];

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadRitualProducts();
  }

  ngAfterViewInit() {
    this.syncScrollPosition();
  }

  ngOnDestroy() {
    this.stopAutoScroll();
    this.cleanupScrollListeners();
  }

  private setupScrollListeners() {
    const gallery = this.scrollGallery?.nativeElement;
    if (!gallery) {
      return;
    }

    const addListener = (eventName: string, handler: EventListener, options?: AddEventListenerOptions) => {
      gallery.addEventListener(eventName, handler, options);
      this.removeScrollListeners.push(() => gallery.removeEventListener(eventName, handler, options));
    };

    addListener('scroll', this.handleScroll, { passive: true });
    addListener('wheel', this.handleUserInteraction, { passive: true });
    addListener('touchstart', this.handleUserInteraction, { passive: true });
    addListener('pointerdown', this.handleUserInteraction, { passive: true });
    addListener('keydown', this.handleUserInteraction);
  }

  private readonly handleScroll = () => {
    const gallery = this.scrollGallery?.nativeElement;
    if (!gallery) {
      return;
    }

    const currentScrollLeft = gallery.scrollLeft;

    if (this.isAutoScrolling) {
      this.lastScrollLeft = currentScrollLeft;
      this.scrollPosition = currentScrollLeft;
      return;
    }

    this.scrollPosition = currentScrollLeft;
    this.lastScrollLeft = currentScrollLeft;

    if (!this.userHasControl) {
      this.pauseAutoScrollForManualControl();
    }
  };

  private readonly handleUserInteraction = () => {
    this.pauseAutoScrollForManualControl();
  };

  private pauseAutoScrollForManualControl() {
    const gallery = this.scrollGallery?.nativeElement;
    if (!gallery) {
      return;
    }

    this.userHasControl = true;
    this.autoScrollRunId += 1;
    this.clearAnimationTimers();
    this.stopAutoScroll();

    gallery.classList.remove('is-auto-scrolling');
    gallery.classList.add('is-user-scrolling');
    gallery.style.opacity = '1';
    gallery.style.transition = '';

    this.syncScrollPosition();

    if (this.resumeAutoScrollTimer) {
      clearTimeout(this.resumeAutoScrollTimer);
    }

    this.resumeAutoScrollTimer = setTimeout(() => {
      gallery.classList.remove('is-user-scrolling');
      this.userHasControl = false;
      this.syncScrollPosition();
      this.startAutoScroll();
    }, this.resumeDelay);
  }

  private cleanupScrollListeners() {
    this.removeScrollListeners.forEach(removeListener => removeListener());
    this.removeScrollListeners = [];

    const gallery = this.scrollGallery?.nativeElement;
    gallery?.classList.remove('is-user-scrolling');

    if (this.resumeAutoScrollTimer) {
      clearTimeout(this.resumeAutoScrollTimer);
      this.resumeAutoScrollTimer = null;
    }
  }

  private startAutoScroll() {
    if (this.userHasControl || !this.scrollGallery?.nativeElement) {
      return;
    }

    this.stopAutoScroll();

    const runId = ++this.autoScrollRunId;

    this.autoScrollTimer = setTimeout(() => {
      this.executeAutoScroll(runId);
    }, this.autoScrollDelay);
  }

  private stopAutoScroll() {
    if (this.autoScrollTimer) {
      clearTimeout(this.autoScrollTimer);
      this.autoScrollTimer = null;
    }

    this.isAutoScrolling = false;
  }

  private executeAutoScroll(runId: number) {
    const gallery = this.scrollGallery?.nativeElement;
    if (!gallery || this.userHasControl || runId !== this.autoScrollRunId) {
      return;
    }

    const maxScroll = gallery.scrollWidth - gallery.clientWidth;
    if (maxScroll <= 0) {
      this.startAutoScroll();
      return;
    }

    this.isAutoScrolling = true;
    gallery.classList.remove('is-user-scrolling');
    gallery.classList.add('is-auto-scrolling');

    const nextScrollPosition = this.scrollPosition + this.autoScrollStep;

    if (nextScrollPosition >= maxScroll) {
      gallery.style.transition = 'opacity 0.5s ease-out';
      gallery.style.opacity = '0.3';

      const resetTimer = setTimeout(() => {
        if (runId !== this.autoScrollRunId || this.userHasControl) {
          return;
        }

        this.scrollPosition = 0;
        gallery.scrollTo({ left: 0, behavior: 'auto' });
        this.lastScrollLeft = 0;

        const restoreTimer = setTimeout(() => {
          if (runId !== this.autoScrollRunId || this.userHasControl) {
            return;
          }

          gallery.style.opacity = '1';
          gallery.style.transition = '';
          gallery.classList.remove('is-auto-scrolling');
          this.isAutoScrolling = false;
          this.startAutoScroll();
        }, 120);

        this.animationTimers.push(restoreTimer);
      }, 500);

      this.animationTimers.push(resetTimer);
      return;
    }

    this.scrollPosition = nextScrollPosition;
    this.lastScrollLeft = nextScrollPosition;
    gallery.scrollTo({ left: this.scrollPosition, behavior: 'smooth' });

    const completeTimer = setTimeout(() => {
      if (runId !== this.autoScrollRunId || this.userHasControl) {
        return;
      }

      gallery.classList.remove('is-auto-scrolling');
      this.isAutoScrolling = false;
      this.syncScrollPosition();
      this.startAutoScroll();
    }, 650);

    this.animationTimers.push(completeTimer);
  }

  private clearAnimationTimers() {
    this.animationTimers.forEach(timer => clearTimeout(timer));
    this.animationTimers = [];
  }

  private syncScrollPosition() {
    const gallery = this.scrollGallery?.nativeElement;
    if (!gallery) {
      return;
    }

    this.scrollPosition = gallery.scrollLeft;
    this.lastScrollLeft = gallery.scrollLeft;
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
      unit_of_measure: product.unit_of_measure || 'unidad',
      category_name: product.category_name || product.category,
      category: product.category
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