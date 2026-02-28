import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface SiteSettings {
  id: string;
  logo_url: string | null;
  hero_bg_url?: string | null;
  updated_at: string;
}

export interface HeroBackground {
  id: string;
  image_url: string | null;
  created_at?: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SiteSettingsService {
  constructor(private supabase: SupabaseService) {}

  getSettings(): Observable<SiteSettings> {
    return from(
      this.supabase.client
        .from('site_settings')
        .select('*')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      catchError(error => {
        console.error('Error fetching site settings:', error);
        return throwError(() => new Error('Error loading site settings'));
      })
    );
  }

  getHeroBackground(): Observable<HeroBackground | null> {
    return from(
      this.supabase.client
        .from('hero_backgrounds')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : null;
        return row || null;
      }),
      catchError(error => {
        console.error('Error fetching hero background:', error);
        return throwError(() => new Error('Error loading hero background'));
      })
    );
  }

  updateHeroBackground(heroUrl: string, id?: string): Observable<HeroBackground> {
    const targetId = id || '00000000-0000-0000-0000-000000000000';

    return from(
      this.supabase.client
        .from('hero_backgrounds')
        .upsert(
          {
            id: targetId,
            image_url: heroUrl,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        )
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      catchError(error => {
        console.error('Error updating hero background:', error);
        return throwError(() => new Error('Error updating hero background'));
      })
    );
  }

  updateLogo(logoUrl: string): Observable<SiteSettings> {
    return from(
      this.supabase.client
        .from('site_settings')
        .update({ logo_url: logoUrl })
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      catchError(error => {
        console.error('Error updating logo:', error);
        return throwError(() => new Error('Error updating logo'));
      })
    );
  }
}