import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, map, takeUntil } from 'rxjs';
import { Product, ProductService } from '../services/product.service';
import { SiteSettingsService } from '../services/site-settings.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.component.html',
  styleUrls: ['home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  mateImages: string[] = [];
  activeImageIndex = 0;
  heroBgUrl: string | null = null;

  private readonly fallbackImages: string[] = [
    'https://vsfyedgeotrypgyhczcg.supabase.co/storage/v1/object/public/products/1769999392263_mate_campero_2026_02_01_23_29_52.png',
    'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1615484477481-5cfb6423f447?auto=format&fit=crop&w=1200&q=80'
  ];
  private readonly fallbackHeroBg = 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1800&q=80';
  private readonly rotationIntervalMs = 4500;
  private rotationTimer?: number;
  private destroy$ = new Subject<void>();

  constructor(private productService: ProductService, private siteSettingsService: SiteSettingsService) {
    this.mateImages = this.fallbackImages;
  }

  ngOnInit() {
    this.loadMateImages();
    this.loadHeroBackground();
  }

  ngOnDestroy() {
    this.stopRotation();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentImage(): string {
    return this.mateImages[this.activeImageIndex] || this.fallbackImages[0];
  }

  get heroBgCssValue(): string {
    const url = this.heroBgUrl || this.fallbackHeroBg;
    return `url('${url}')`;
  }

  goToImage(index: number) {
    if (!this.mateImages.length) {
      return;
    }

    this.activeImageIndex = index % this.mateImages.length;
    this.restartRotation();
  }

  trackByImage(_index: number, url: string) {
    return url;
  }

  private loadMateImages() {
    this.productService.getProducts()
      .pipe(
        takeUntil(this.destroy$),
        map(products => this.extractMateImages(products))
      )
      .subscribe({
        next: (images) => {
          this.mateImages = images.length ? images : this.fallbackImages;
          this.activeImageIndex = 0;
          this.restartRotation();
        },
        error: () => {
          this.mateImages = this.fallbackImages;
          this.activeImageIndex = 0;
          this.restartRotation();
        }
      });
  }

  private loadHeroBackground() {
    this.siteSettingsService.getHeroBackground()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (heroBg) => {
          this.heroBgUrl = heroBg?.image_url || null;
        },
        error: (error) => {
          console.error('Error loading hero background:', error);
          this.heroBgUrl = null;
        }
      });
  }

  private extractMateImages(products: Product[]): string[] {
    const mates = products.filter(product => this.isMateCategory(product) && this.isSeasonal(product));
    const pool = mates.flatMap(product => this.getProductImages(product));
    const unique = Array.from(new Set(pool));
    return unique.slice(0, 10);
  }

  private isSeasonal(product: Product): boolean {
    return product.seasonal === true;
  }

  private getProductImages(product: Product): string[] {
    const urls = [...(product.image_urls || [])];

    if (product.image) {
      urls.unshift(product.image);
    }

    return urls
      .map(url => (url || '').trim())
      .filter(url => url.length > 0);
  }

  private isMateCategory(product: Product): boolean {
    const category = (product.category_name || product.category || '').toLowerCase().trim();
    return category === 'mates' || category === 'mate';
  }

  private restartRotation() {
    this.stopRotation();
    this.startRotation();
  }

  private startRotation() {
    if (this.mateImages.length <= 1) {
      return;
    }

    this.rotationTimer = window.setInterval(() => this.advanceImage(), this.rotationIntervalMs);
  }

  private stopRotation() {
    if (this.rotationTimer) {
      window.clearInterval(this.rotationTimer);
      this.rotationTimer = undefined;
    }
  }

  private advanceImage() {
    if (!this.mateImages.length) {
      return;
    }

    this.activeImageIndex = (this.activeImageIndex + 1) % this.mateImages.length;
  }
}