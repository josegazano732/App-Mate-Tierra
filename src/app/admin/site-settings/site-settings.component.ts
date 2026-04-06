import { Component, OnInit } from '@angular/core';
import { HeroBackground, SiteSettingsService } from '../../services/site-settings.service';
import { ImageService } from '../../services/image.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-site-settings',
  templateUrl: './site-settings.component.html',
  styleUrls: ['./site-settings.component.css']
})
export class SiteSettingsComponent implements OnInit {
  heroImages: HeroBackground[] = [];
  paymentCvu = '';
  isLoading = false;
  isUploading = false;
  isSavingPayment = false;
  message: string | null = null;
  error: string | null = null;
  uploadMessage: string | null = null;
  uploadError: string | null = null;
  paymentMessage: string | null = null;
  paymentError: string | null = null;

  private readonly fallbackHeroBg = 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1800&q=80';
  private readonly MAX_IMAGES = 6;

  constructor(private siteSettingsService: SiteSettingsService, private imageService: ImageService) {}

  ngOnInit() {
    this.loadSettings();
  }

  get previewUrl(): string {
    const first = this.heroImages[0]?.image_url?.trim();
    return first || this.fallbackHeroBg;
  }

  loadSettings() {
    this.isLoading = true;
    this.message = null;
    this.error = null;

    forkJoin({
      heroBgs: this.siteSettingsService.getHeroBackgrounds(this.MAX_IMAGES),
      settings: this.siteSettingsService.getSettings()
    }).subscribe({
      next: ({ heroBgs, settings }) => {
        this.heroImages = heroBgs;
        this.paymentCvu = settings.payment_cvu || '';
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading site settings', err);
        this.error = 'No pudimos cargar los ajustes. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  savePaymentSettings() {
    const normalizedCvu = this.normalizeCvu(this.paymentCvu);

    this.paymentMessage = null;
    this.paymentError = null;

    if (normalizedCvu && normalizedCvu.length !== 22) {
      this.paymentError = 'El CVU debe tener 22 dígitos.';
      return;
    }

    this.isSavingPayment = true;
    this.siteSettingsService.updateSettings({ payment_cvu: normalizedCvu || null }).subscribe({
      next: (settings) => {
        this.paymentCvu = settings.payment_cvu || '';
        this.paymentMessage = normalizedCvu
          ? 'CVU guardado. El QR ya puede mostrarse en los productos.'
          : 'CVU eliminado. El QR de pago dejó de mostrarse.';
        this.isSavingPayment = false;
      },
      error: (err) => {
        console.error('Error saving payment settings', err);
        this.paymentError = 'No pudimos guardar el CVU. Intenta de nuevo.';
        this.isSavingPayment = false;
      }
    });
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input?.files || input.files.length === 0) {
      return;
    }

    if (this.heroImages.length >= this.MAX_IMAGES) {
      this.uploadError = `Máximo ${this.MAX_IMAGES} imágenes. Borra alguna para agregar otra.`;
      return;
    }

    const file = input.files[0];
    this.uploadMessage = null;
    this.uploadError = null;
    this.isUploading = true;

    this.imageService.uploadImage(file, 'product').subscribe({
      next: (url) => {
        this.persistHeroBackground(url);
      },
      error: (err) => {
        console.error('Error uploading hero image', err);
        this.uploadError = err?.message || 'No pudimos subir la imagen. Usa JPG/PNG/WebP hasta 5MB.';
        this.isUploading = false;
      }
    });
  }

  removeImage(id: string) {
    this.error = null;
    this.message = null;
    this.siteSettingsService.deleteHeroBackground(id).subscribe({
      next: () => {
        this.heroImages = this.heroImages.filter(img => img.id !== id);
        this.message = 'Imagen eliminada del hero.';
      },
      error: (err) => {
        console.error('Error deleting hero image', err);
        this.error = 'No pudimos eliminar la imagen. Intenta de nuevo.';
      }
    });
  }

  private persistHeroBackground(url: string) {
    this.siteSettingsService.addHeroBackground(url).subscribe({
      next: (heroBg) => {
        this.heroImages = [heroBg, ...this.heroImages].slice(0, this.MAX_IMAGES);
        this.uploadMessage = 'Imagen subida y guardada. Se rotará en el hero.';
        this.isUploading = false;
      },
      error: (err) => {
        console.error('Error saving hero background', err);
        this.uploadError = 'No pudimos guardar la imagen. Intenta otra vez.';
        this.isUploading = false;
      }
    });
  }

  private normalizeCvu(value: string | null | undefined): string {
    return (value || '').replace(/\D/g, '');
  }
}
