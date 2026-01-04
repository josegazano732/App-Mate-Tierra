import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, throwError, timer } from 'rxjs';
import { map, catchError, switchMap, retryWhen, delayWhen, take } from 'rxjs/operators';
import { CartItem } from './cart.service';
import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

export interface PaymentSplit {
  method: string;
  amount: number;
}

export interface Sale {
  id: string;
  user_id: string;
  payment_method: string;
  payment_splits?: PaymentSplit[];
  total_amount: number;
  status: 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  original_price: number;
  created_at: string;
  product_name?: string;
  product?: {
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(private supabase: SupabaseService) {}

  private handleError(error: any): Observable<never> {
    console.error('Sales service error:', error);
    
    if (error.status === 429) {
      return throwError(() => new Error('Too many requests. Please try again in a moment.'));
    }
    
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      return throwError(() => new Error('You do not have permission to perform this action.'));
    }
    
    return throwError(() => new Error('Error creating sale. Please try again.'));
  }

  private retryStrategy<T>() {
    return retryWhen<T>(errors =>
      errors.pipe(
        delayWhen(() => timer(this.RETRY_DELAY)),
        take(this.MAX_RETRIES)
      )
    );
  }

  getRecentCompletedSales(limit: number = 5): Observable<Sale[]> {
    return from(
      this.supabase.client
        .from('sales')
        .select(`
          *,
          items:sale_items(
            *,
            product:products(name)
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit)
    ).pipe(
      this.retryStrategy<PostgrestResponse<Sale>>(),
      map(({ data, error }) => {
        if (error) throw error;
        return data?.map((sale: Sale) => ({
          ...sale,
          items: sale.items?.map((item: SaleItem) => ({
            ...item,
            product_name: item.product?.name
          }))
        })) || [];
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Obtiene ventas paginadas y el total de ventas
   */
  getAllSales(limit: number = 20, offset: number = 0): Observable<{ sales: Sale[]; total: number }> {
    // Consulta paginada
    const salesQuery = this.supabase.client
      .from('sales')
      .select(`*, items:sale_items(*, product:products(name))`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return from(salesQuery).pipe(
      this.retryStrategy<PostgrestResponse<Sale>>(),
      map(({ data, error, count }) => {
        if (error) throw error;
        return {
          sales: data?.map((sale: Sale) => ({
            ...sale,
            items: sale.items?.map((item: SaleItem) => ({
              ...item,
              product_name: item.product?.name
            }))
          })) || [],
          total: count || 0
        };
      }),
      catchError(error => this.handleError(error))
    );
  }

  createSale(
    userId: string, 
    items: CartItem[], 
    paymentMethod: string,
    paymentSplits: PaymentSplit[]
  ): Observable<Sale> {
    // Validate payment method format
    const methods = paymentMethod.split(',');
    const validMethodFormat = methods.every(method => /^[a-z]+$/.test(method));
    if (!validMethodFormat) {
      return throwError(() => new Error('Invalid payment method format'));
    }

    // Calculate totals
    const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const splitsTotal = paymentSplits.reduce((sum, split) => sum + split.amount, 0);

    // Validate payment splits total matches items total
    if (Math.abs(itemsTotal - splitsTotal) > 0.01) {
      return throwError(() => new Error('Payment splits total must match items total'));
    }

    // Create sale
    return from(
      this.supabase.client
        .from('sales')
        .insert([{
          user_id: userId,
          payment_method: paymentMethod,
          payment_splits: paymentSplits,
          total_amount: itemsTotal,
          status: 'completed'
        }])
        .select()
        .single()
    ).pipe(
      this.retryStrategy<PostgrestSingleResponse<Sale>>(),
      switchMap(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('No data returned from sale creation');

        const saleItems = items.map(item => ({
          sale_id: data.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          original_price: item.originalPrice || item.price
        }));

        return from(
          this.supabase.client
            .from('sale_items')
            .insert(saleItems)
        ).pipe(
          map(() => data)
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  cancelSale(saleId: string): Observable<void> {
    return from(
      this.supabase.client
        .from('sales')
        .update({ status: 'cancelled' })
        .eq('id', saleId)
    ).pipe(
      this.retryStrategy<PostgrestSingleResponse<null>>(),
      map(({ error }) => {
        if (error) throw error;
      }),
      catchError(error => this.handleError(error))
    );
  }
}