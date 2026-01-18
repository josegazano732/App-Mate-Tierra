import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ProductService, Product } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { DiscountSettingsService, DiscountSettings } from '../../services/discount-settings.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.css']
})
export class ProductDetailsComponent implements OnInit {
  product: Product | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  quantity = 1;
  discountSettings: DiscountSettings | null = null;
  productImages: string[] = [];
  selectedImageIndex = 0;
  private readonly fallbackImage = 'https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=900&q=60';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private productService: ProductService,
    private cartService: CartService,
    private discountSettingsService: DiscountSettingsService
  ) { }

  ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProduct(productId);
      this.loadDiscountSettings();
    } else {
      this.errorMessage = 'Product ID not found.';
      this.isLoading = false;
    }
  }

  loadProduct(id: string) {
    this.isLoading = true;
    this.errorMessage = null;
    this.productService.getProductById(id).subscribe({
      next: (product) => {
        this.product = product;
        this.isLoading = false;
        if (!product) {
          this.errorMessage = 'Product not found';
          this.setProductImages(null);
        } else {
          this.setProductImages(product);
        }
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.isLoading = false;
        this.errorMessage = 'Could not load product. Please try again later.';
      }
    });
  }

  loadDiscountSettings() {
    this.discountSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.discountSettings = settings;
      },
      error: (error) => {
        console.error('Error loading discount settings:', error);
      }
    });
  }

  getWholesalePrice(minQuantity: number): number {
    if (!this.product || !this.discountSettings) return 0;
    
    if (minQuantity >= this.discountSettings.tier2_quantity) {
      return this.product.price * (1 - this.discountSettings.tier2_discount / 100);
    } else if (minQuantity >= this.discountSettings.tier1_quantity) {
      return this.product.price * (1 - this.discountSettings.tier1_discount / 100);
    }
    return this.product.price;
  }

  getCurrentPrice(): number {
    if (!this.product || !this.discountSettings) return 0;
    
    if (this.quantity >= this.discountSettings.tier2_quantity) {
      return this.getWholesalePrice(this.discountSettings.tier2_quantity);
    } else if (this.quantity >= this.discountSettings.tier1_quantity) {
      return this.getWholesalePrice(this.discountSettings.tier1_quantity);
    }
    return this.product.price;
  }

  getCurrentDiscount(): number {
    if (!this.product || !this.discountSettings) return 0;
    
    if (this.quantity >= this.discountSettings.tier2_quantity) {
      return this.discountSettings.tier2_discount;
    } else if (this.quantity >= this.discountSettings.tier1_quantity) {
      return this.discountSettings.tier1_discount;
    }
    return 0;
  }

  getTotalSavings(): number {
    if (!this.product) return 0;
    const regularTotal = this.product.price * this.quantity;
    const discountedTotal = this.getCurrentPrice() * this.quantity;
    return regularTotal - discountedTotal;
  }

  addToCart() {
    if (this.product) {
      if (this.quantity > this.product.stock) {
        this.errorMessage = 'Selected quantity exceeds available stock';
        return;
      }

      const unitPrice = this.getCurrentPrice();
      
      this.cartService.addToCart({
        id: this.product.id,
        name: this.product.name,
        price: unitPrice,
        originalPrice: this.product.price,
        quantity: this.quantity
      });

      this.router.navigate(['/carrito']);
    }
  }

  updateQuantity(change: number) {
    const newQuantity = this.quantity + change;
    if (this.product && newQuantity >= 1 && newQuantity <= this.product.stock) {
      this.quantity = newQuantity;
      this.errorMessage = '';
    }
  }

  goBack() {
    this.location.back();
  }

  getDiscountTier1(): number {
    return this.discountSettings?.tier1_discount || 0;
  }

  getDiscountTier2(): number {
    return this.discountSettings?.tier2_discount || 0;
  }

  getQuantityTier1(): number {
    return this.discountSettings?.tier1_quantity || 5;
  }

  getQuantityTier2(): number {
    return this.discountSettings?.tier2_quantity || 10;
  }

  get currentImage(): string {
    return this.productImages[this.selectedImageIndex] ?? this.fallbackImage;
  }

  selectImage(index: number) {
    if (index === this.selectedImageIndex) {
      return;
    }

    if (index >= 0 && index < this.productImages.length) {
      this.selectedImageIndex = index;
    }
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

  handleThumbnailError(event: Event, index: number) {
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }

    if (target.src !== this.fallbackImage) {
      target.onerror = null;
      target.src = this.fallbackImage;
    }

    if (index >= 0 && index < this.productImages.length) {
      this.productImages[index] = this.fallbackImage;
    }
  }

  private setProductImages(product: Product | null) {
    const urls = this.extractImageUrls(product);
    this.productImages = urls.length ? urls : [this.fallbackImage];
    this.selectedImageIndex = 0;
  }

  private extractImageUrls(product: Product | null): string[] {
    if (!product) {
      return [];
    }

    if (Array.isArray(product.image_urls) && product.image_urls.length) {
      return product.image_urls.filter((url) => typeof url === 'string' && url.trim().length > 0);
    }

    if (typeof product.image === 'string' && product.image.trim().length > 0) {
      return [product.image.trim()];
    }

    return [];
  }
}