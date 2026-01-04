import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Category } from '../models/category.model';
import { SupabaseService } from './supabase.service';

interface SupabaseCategoryRow {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  slug?: string;
  is_active?: boolean;
  display_order?: number | null;
  created_at?: string;
  updated_at?: string;
  products?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly tableName = 'product_categories';

  constructor(private supabase: SupabaseService) { }

  getCategories(): Observable<Category[]> {
    return from(
      this.supabase.client
        .from(this.tableName)
        .select(`
          id,
          name,
          description,
          image_url,
          slug,
          is_active,
          display_order,
          created_at,
          updated_at,
          products:products(count)
        `)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return (data || []).map(row => this.mapCategory(row as SupabaseCategoryRow));
      }),
      catchError(error => throwError(() => this.normalizeSupabaseError(error, 'Error al cargar las categorías')))
    );
  }

  addCategory(category: Category): Observable<Category> {
    const payload = this.toPersistencePayload(category);

    return from(
      this.supabase.client
        .from(this.tableName)
        .insert([payload])
        .select(`
          id,
          name,
          description,
          image_url,
          slug,
          is_active,
          display_order,
          created_at,
          updated_at,
          products:products(count)
        `)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        if (!data) {
          throw new Error('No category returned');
        }
        return this.mapCategory(data as SupabaseCategoryRow);
      }),
      catchError(error => throwError(() => this.normalizeSupabaseError(error, 'Error al añadir la categoría')))
    );
  }

  updateCategory(id: string, category: Category): Observable<Category> {
    const payload = this.toPersistencePayload(category);

    return from(
      this.supabase.client
        .from(this.tableName)
        .update(payload)
        .eq('id', id)
        .select(`
          id,
          name,
          description,
          image_url,
          slug,
          is_active,
          display_order,
          created_at,
          updated_at,
          products:products(count)
        `)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        if (!data) {
          throw new Error('Category not found');
        }
        return this.mapCategory(data as SupabaseCategoryRow);
      }),
      catchError(error => throwError(() => this.normalizeSupabaseError(error, 'Error al actualizar la categoría')))
    );
  }

  deleteCategory(id: string): Observable<boolean> {
    return from(
      this.supabase.client
        .from(this.tableName)
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
        return true;
      }),
      catchError(error => throwError(() => this.normalizeSupabaseError(error, 'Error al eliminar la categoría')))
    );
  }

  getCategoryById(id: string): Observable<Category | undefined> {
    return from(
      this.supabase.client
        .from(this.tableName)
        .select(`
          id,
          name,
          description,
          image_url,
          slug,
          is_active,
          display_order,
          created_at,
          updated_at,
          products:products(count)
        `)
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data ? this.mapCategory(data as SupabaseCategoryRow) : undefined;
      }),
      catchError(error => throwError(() => this.normalizeSupabaseError(error, 'Error al consultar la categoría')))
    );
  }

  private mapCategory(row: SupabaseCategoryRow): Category {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      image: row.image_url || '',
      slug: row.slug || '',
      productCount: this.extractProductCount(row.products),
      isActive: row.is_active ?? true,
      order: row.display_order ?? undefined,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    };
  }

  private extractProductCount(rel: any): number {
    if (!rel) {
      return 0;
    }

    if (Array.isArray(rel)) {
      const candidate = rel[0];
      if (candidate && typeof candidate.count === 'number') {
        return candidate.count;
      }
      return rel.length;
    }

    if (typeof rel.count === 'number') {
      return rel.count;
    }

    return 0;
  }

  private toPersistencePayload(category: Category) {
    return {
      name: category.name?.trim(),
      description: category.description?.trim() || null,
      image_url: category.image || null,
      slug: category.slug?.trim() || null,
      is_active: category.isActive ?? true,
      display_order: typeof category.order === 'number' ? category.order : null
    };
  }

  private normalizeSupabaseError(error: any, fallback: string): Error {
    const message = this.extractSupabaseMessage(error);
    const friendly = this.toFriendlyMessage(message) || fallback;
    console.error('Supabase category error:', error);
    return new Error(friendly);
  }

  private extractSupabaseMessage(error: any): string {
    if (!error) {
      return '';
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error.message) {
      return error.message;
    }
    if (error.details) {
      return error.details;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return '';
    }
  }

  private toFriendlyMessage(message: string | undefined): string | null {
    if (!message) {
      return null;
    }

    const normalized = message.toLowerCase();

    if (normalized.includes('row level security')) {
      return 'Tu sesión no tiene permisos para modificar categorías. Iniciá sesión como admin.';
    }

    if (normalized.includes('image_url') && normalized.includes('column')) {
      return 'La base de datos aún no tiene la columna image_url. Ejecutá las migraciones pendientes (`supabase db push`).';
    }

    if (normalized.includes('slug') && normalized.includes('duplicate')) {
      return 'Ya existe una categoría con ese nombre o slug. Elegí uno diferente.';
    }

    if (normalized.includes('name') && normalized.includes('duplicate')) {
      return 'Ya existe una categoría con ese nombre.';
    }

    if (normalized.includes('foreign key constraint') || normalized.includes('constraint') && normalized.includes('products')) {
      return 'La categoría tiene productos asociados y no puede eliminarse.';
    }

    return message;
  }
}