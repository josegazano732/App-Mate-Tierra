import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, throwError, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly PRODUCTS_BUCKET = 'products';
  private readonly LOGOS_BUCKET = 'logos';
  private readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']; // Allowed image types
  private readonly MAX_WIDTH = 800; // Maximum width for product images
  private readonly QUALITY = 0.8; // Image quality (0.8 = 80%)

  constructor(private supabase: SupabaseService) {}

  validateImage(file: File): string | null {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return 'File must be an image in JPG, PNG, WebP, or SVG format';
    }

    if (file.size > this.MAX_SIZE) {
      return 'Image must not exceed 5MB';
    }

    return null;
  }

  private optimizeImage(file: File, maxWidth: number = this.MAX_WIDTH): Promise<Blob> {
    // If it's an SVG, return it as is
    if (file.type === 'image/svg+xml') {
      return Promise.resolve(file);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to optimize image'));
              }
            },
            'image/webp',
            this.QUALITY
          );
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  uploadImage(file: File, type: 'product' | 'logo' = 'product'): Observable<string> {
    const validationError = this.validateImage(file);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const maxWidth = type === 'logo' ? 200 : this.MAX_WIDTH;
    const bucket = type === 'logo' ? this.LOGOS_BUCKET : this.PRODUCTS_BUCKET;

    return from(this.optimizeImage(file, maxWidth)).pipe(
      switchMap(optimizedBlob => {
        // Generar nombre de archivo limpio y con fecha/hora
        const extension = file.type === 'image/svg+xml' ? '.svg' : '.png';
        // Limpiar nombre: solo letras, números y guiones bajos
        const baseName = file.name
          .replace(/\.[^/.]+$/, '') // quitar extensión
          .replace(/[^a-zA-Z0-9]+/g, '_') // reemplazar todo lo que no sea letra o número por _
          .replace(/^_+|_+$/g, ''); // quitar guiones bajos al inicio/fin

        const now = new Date();
        const fecha = `${now.getFullYear()}_${(now.getMonth()+1).toString().padStart(2,'0')}_${now.getDate().toString().padStart(2,'0')}`;
        const hora = `${now.getHours().toString().padStart(2,'0')}_${now.getMinutes().toString().padStart(2,'0')}_${now.getSeconds().toString().padStart(2,'0')}`;
        const fileName = `${Date.now()}_${baseName}_${fecha}_${hora}${extension}`;

        return from(
          this.supabase.client.storage
            .from(bucket)
            .upload(fileName, optimizedBlob, {
              contentType: file.type,
              cacheControl: '3600',
              upsert: true
            })
        ).pipe(
          switchMap(({ data, error }) => {
            if (error) throw error;
            if (!data) throw new Error('Upload failed');
            
            const { data: urlData } = this.supabase.client.storage
              .from(bucket)
              .getPublicUrl(data.path);

            return of(urlData.publicUrl);
          })
        );
      }),
      catchError(error => {
        console.error('Error uploading image:', error);
        return throwError(() => new Error('Error uploading image. Please try again.'));
      })
    );
  }

  async deleteImage(url: string, type: 'product' | 'logo' = 'product'): Promise<void> {
    try {
      const bucket = type === 'logo' ? this.LOGOS_BUCKET : this.PRODUCTS_BUCKET;
      const path = url.split('/').pop();
      
      if (!path) throw new Error('Invalid image URL');

      const { error } = await this.supabase.client.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Error deleting image');
    }
  }
}