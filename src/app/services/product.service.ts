import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, retry } from 'rxjs/operators';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category_id: string;
  category_name?: string;
  stock: number;
  seasonal: boolean;
  cost: number;
  markup_percentage: number;
  created_at?: string;
  updated_at?: string;
  discount?: number;
  category?: string;
  rating?: number;
  reviews?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private supabase: SupabaseService) {}

  getProducts(): Observable<Product[]> {
    return from(
      this.supabase.client
        .from('product_details')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      retry(3),
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error('Error loading products:', error);
        return throwError(() => new Error('Error loading products. Please try again later.'));
      })
    );
  }

  getSeasonalProducts(limit: number = 5): Observable<Product[]> {
    return from(
      this.supabase.client
        .from('product_details')
        .select('*')
        .eq('seasonal', true)
        .limit(limit)
    ).pipe(
      retry(3),
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error('Error loading seasonal products:', error);
        return throwError(() => new Error('Error loading seasonal products'));
      })
    );
  }

  getProductById(id: string): Observable<Product | null> {
    return from(
      this.supabase.client
        .from('product_details')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      retry(3),
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      catchError(error => {
        console.error('Error loading product:', error);
        return throwError(() => new Error('Error loading product. Please try again later.'));
      })
    );
  }

  addProduct(product: Omit<Product, 'id' | 'category_name'>): Observable<Product> {
    return from(
      this.supabase.client
        .from('products')
        .insert([{
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.image,
          category_id: product.category_id,
          stock: product.stock,
          seasonal: product.seasonal,
          cost: product.cost,
          markup_percentage: product.markup_percentage
        }])
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('No data returned');
        return data;
      }),
      catchError(error => {
        console.error('Error adding product:', error);
        return throwError(() => new Error('Error adding product'));
      })
    );
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    const updateData = {
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      category_id: product.category_id,
      stock: product.stock,
      seasonal: product.seasonal,
      cost: product.cost,
      markup_percentage: product.markup_percentage
    };

    return from(
      this.supabase.client
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('Product not found');
        return data;
      }),
      catchError(error => {
        console.error('Error updating product:', error);
        return throwError(() => new Error('Error updating product'));
      })
    );
  }

  deleteProduct(id: string): Observable<void> {
    return from(
      this.supabase.client
        .from('products')
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
      catchError(error => {
        console.error('Error deleting product:', error);
        return throwError(() => new Error('Error deleting product'));
      })
    );
  }

  searchProducts(term: string): Observable<Product[]> {
    return from(
      this.supabase.client
        .from('product_details')
        .select('*')
        .ilike('name', `%${term}%`)
        .limit(10)
    ).pipe(
      retry(3),
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
      catchError(error => {
        console.error('Error searching products:', error);
        return throwError(() => new Error('Error searching products'));
      })
    );
  }
}