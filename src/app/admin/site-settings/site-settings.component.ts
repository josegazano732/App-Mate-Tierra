import { Component, OnInit } from '@angular/core';
import { SiteSettingsService } from '../../services/site-settings.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-site-settings',
  templateUrl: './site-settings.component.html',
  styleUrls: ['./site-settings.component.css']
})
export class SiteSettingsComponent implements OnInit {
  heroBgUrl: string = '';
  heroBgId: string | null = null;
  isLoading = false;
  isSaving = false;
  isUploading = false;
  message: string | null = null;
  error: string | null = null;
  uploadMessage: string | null = null;
  uploadError: string | null = null;

  private readonly fallbackHeroBg = 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1800&q=80';

  constructor(private siteSettingsService: SiteSettingsService, private imageService: ImageService) {}

  ngOnInit() {
    this.loadSettings();
  }

  get previewUrl(): string {
    return this.heroBgUrl?.trim() || this.fallbackHeroBg;
  }

  loadSettings() {
    this.isLoading = true;
    this.message = null;
    this.error = null;

    this.siteSettingsService.getHeroBackground().subscribe({
      next: (heroBg) => {
        this.heroBgUrl = heroBg?.image_url || '';
        this.heroBgId = heroBg?.id || null;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading site settings', err);
        this.error = 'No pudimos cargar los ajustes. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  save() {
    if (!this.heroBgUrl?.trim()) {
      this.error = 'Primero subí una imagen para el hero.';
      return;
    }

    this.isSaving = true;
    this.message = null;
    this.error = null;

    const payload = this.heroBgUrl?.trim() || '';

    this.siteSettingsService.updateHeroBackground(payload, this.heroBgId || undefined).subscribe({
      next: (heroBg) => {
        this.heroBgUrl = heroBg.image_url || '';
        this.heroBgId = heroBg.id;
        this.message = 'Imagen del hero guardada correctamente.';
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error saving hero background', err);
        this.error = 'No pudimos guardar la imagen. Intenta otra vez.';
        this.isSaving = false;
      }
    });
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input?.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.uploadMessage = null;
    this.uploadError = null;
    this.isUploading = true;

    this.imageService.uploadImage(file, 'product').subscribe({
      next: (url) => {
        this.heroBgUrl = url;
        this.uploadMessage = 'Imagen subida correctamente. Guardá para aplicar el cambio.';
        this.isUploading = false;
      },
      error: (err) => {
        console.error('Error uploading hero image', err);
        this.uploadError = err?.message || 'No pudimos subir la imagen. Usa JPG/PNG/WebP hasta 5MB.';
        this.isUploading = false;
      }
    });
  }
}
