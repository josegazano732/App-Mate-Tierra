import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentMethodsService {
  constructor(private supabase: SupabaseService) {}

  getPaymentMethods(): Observable<PaymentMethod[]> {
    return from(
      this.supabase.client
        .from('payment_methods')
        .select('*')
        .order('name')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error('Error fetching payment methods:', error);
        return throwError(() => new Error('Error loading payment methods'));
      })
    );
  }

  getActivePaymentMethods(): Observable<PaymentMethod[]> {
    return from(
      this.supabase.client
        .from('payment_methods')
        .select('*')
        .eq('active', true)
        .order('name')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error('Error fetching active payment methods:', error);
        return throwError(() => new Error('Error loading payment methods'));
      })
    );
  }

  addPaymentMethod(paymentMethod: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>): Observable<PaymentMethod> {
    return from(
      this.supabase.client
        .from('payment_methods')
        .insert([paymentMethod])
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('No data returned');
        return data;
      }),
      catchError(error => {
        console.error('Error adding payment method:', error);
        return throwError(() => new Error('Error adding payment method'));
      })
    );
  }

  updatePaymentMethod(id: string, paymentMethod: Partial<PaymentMethod>): Observable<PaymentMethod> {
    return from(
      this.supabase.client
        .from('payment_methods')
        .update(paymentMethod)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('Payment method not found');
        return data;
      }),
      catchError(error => {
        console.error('Error updating payment method:', error);
        return throwError(() => new Error('Error updating payment method'));
      })
    );
  }

  togglePaymentMethod(id: string, active: boolean): Observable<PaymentMethod> {
    return this.updatePaymentMethod(id, { active });
  }
}