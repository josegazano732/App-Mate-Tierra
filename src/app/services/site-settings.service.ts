import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface SiteSettings {
  id: string;
  logo_url: string | null;
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