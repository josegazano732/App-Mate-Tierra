import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import * as QRCode from 'qrcode';
import { ProductService, Product } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { DiscountSettingsService, DiscountSettings } from '../../services/discount-settings.service';
import { SiteSettingsService } from '../../services/site-settings.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.css']
})
export class ProductDetailsComponent implements OnInit {
  readonly astroPayPaymentUrl = 'https://onetouch.astropay.com/payment?external_reference_id=kvNKiajNvG78NGeScxuateWzb2K32ZEc';
  product: Product | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  quantity = 1;
  discountSettings: DiscountSettings | null = null;
  productImages: string[] = [];
  selectedImageIndex = 0;
  paymentCvu: string | null = null;
  paymentQrDataUrl: string | null = null;
  paymentQrError: string | null = null;
  isGeneratingPaymentQr = false;
  private readonly fallbackImage = 'https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=900&q=60';
  private qrGenerationId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private productService: ProductService,
    private cartService: CartService,
    private discountSettingsService: DiscountSettingsService,
    private siteSettingsService: SiteSettingsService
  ) { }

  ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProduct(productId);
      this.loadDiscountSettings();
      this.loadPaymentSettings();
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
          this.refreshPaymentQr();
        } else {
          this.quantity = this.getMinQuantity();
          this.setProductImages(product);
          this.refreshPaymentQr();
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
        this.refreshPaymentQr();
      },
      error: (error) => {
        console.error('Error loading discount settings:', error);
      }
    });
  }

  loadPaymentSettings() {
    this.siteSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.paymentCvu = this.normalizeCvu(settings.payment_cvu);
        this.refreshPaymentQr();
      },
      error: (error) => {
        console.error('Error loading payment settings:', error);
        this.paymentCvu = null;
        this.paymentQrDataUrl = null;
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

  getPaymentTotal(): number {
    if (!this.product) return 0;
    return this.getCurrentPrice() * this.quantity;
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
        quantity: this.quantity,
        unit_of_measure: this.product.unit_of_measure || 'unidad',
        category_name: this.product.category_name || this.product.category,
        category: this.product.category
      });

      this.router.navigate(['/carrito']);
    }
  }

  updateQuantity(change: number) {
    if (!this.product) return;
    const step = this.getQuantityStep();
    const newQuantity = this.normalizeQuantity(this.quantity + (change * step));
    if (newQuantity >= this.getMinQuantity() && newQuantity <= this.product.stock) {
      this.quantity = newQuantity;
      this.errorMessage = '';
      this.refreshPaymentQr();
    }
  }

  getQuantityStep(): number {
    return this.isWeightUnit() ? 0.01 : 1;
  }

  getMinQuantity(): number {
    return this.isWeightUnit() ? 0.01 : 1;
  }

  getUnitLabel(): string {
    const unit = (this.product?.unit_of_measure || 'unidad').toLowerCase();
    if (unit === 'kg') return 'kg';
    if (unit === 'gs') return 'gs';
    return 'unidad';
  }

  private normalizeQuantity(value: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    const min = this.getMinQuantity();
    const clamped = Math.max(0, parsed);
    if (this.isWeightUnit()) {
      return Number(Math.max(min, clamped).toFixed(2));
    }
    return Math.max(min, Math.round(clamped));
  }

  private isWeightUnit(): boolean {
    return (this.product?.unit_of_measure || '').toLowerCase() === 'kg';
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

  get formattedPaymentCvu(): string {
    return this.formatCvu(this.paymentCvu);
  }

  get usesAstroPayFallback(): boolean {
    return !this.paymentCvu;
  }

  private setProductImages(product: Product | null) {
    const urls = this.extractImageUrls(product);
    this.productImages = urls.length ? urls : [this.fallbackImage];
    this.selectedImageIndex = 0;
  }

  private refreshPaymentQr() {
    const generationId = ++this.qrGenerationId;
    const cvu = this.normalizeCvu(this.paymentCvu);
    const amount = this.getPaymentTotal();
    const qrPayload = cvu
      ? this.buildTransferPayload(cvu, amount)
      : this.astroPayPaymentUrl;

    if (!this.product || amount <= 0 || !qrPayload) {
      this.paymentQrDataUrl = null;
      this.paymentQrError = null;
      this.isGeneratingPaymentQr = false;
      return;
    }

    this.isGeneratingPaymentQr = true;
    this.paymentQrError = null;

    void QRCode.toDataURL(qrPayload, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M'
    })
      .then((dataUrl: string) => {
        if (generationId !== this.qrGenerationId) {
          return;
        }

        this.paymentQrDataUrl = dataUrl;
        this.isGeneratingPaymentQr = false;
      })
      .catch((error: unknown) => {
        console.error('Error generating payment QR:', error);
        if (generationId !== this.qrGenerationId) {
          return;
        }

        this.paymentQrDataUrl = null;
        this.paymentQrError = 'No pudimos generar el QR de pago.';
        this.isGeneratingPaymentQr = false;
      });
  }

  private buildTransferPayload(cvu: string, amount: number): string {
    const lines = [
      'APP-MATE',
      `Producto: ${this.product?.name || ''}`,
      `Cantidad: ${this.quantity}`,
      `Importe: ${amount.toFixed(2)}`,
      'Moneda: USD',
      `CVU: ${cvu}`,
      `Concepto: Compra ${this.product?.name || 'producto'}`
    ];

    return lines.join('\n');
  }

  private normalizeCvu(value: string | null | undefined): string | null {
    const digits = (value || '').replace(/\D/g, '');
    return digits.length ? digits : null;
  }

  private formatCvu(value: string | null | undefined): string {
    const digits = this.normalizeCvu(value) || '';
    return digits.replace(/(.{4})/g, '$1 ').trim();
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