import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface DiscountSettings {
  id: string;
  tier1_quantity: number;  // Cantidad mínima para el primer nivel
  tier1_discount: number;  // Porcentaje de descuento para el primer nivel
  tier2_quantity: number;  // Cantidad mínima para el segundo nivel
  tier2_discount: number;  // Porcentaje de descuento para el segundo nivel
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DiscountSettingsService {
  constructor(private supabase: SupabaseService) {}

  getSettings(): Observable<DiscountSettings> {
    return from(
      this.supabase.client
        .from('discount_settings')
        .select('*')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      catchError(error => {
        console.error('Error fetching discount settings:', error);
        return throwError(() => new Error('Error loading discount settings'));
      })
    );
  }

  updateSettings(settings: Partial<DiscountSettings>): Observable<DiscountSettings> {
    return from(
      this.supabase.client
        .from('discount_settings')
        .update(settings)
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      catchError(error => {
        console.error('Error updating discount settings:', error);
        return throwError(() => new Error('Error updating discount settings'));
      })
    );
  }
}