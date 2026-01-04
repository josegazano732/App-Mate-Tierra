import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Category } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private categories: Category[] = [
    {
      id: '1',
      name: 'Mates',
      image: 'https://images.unsplash.com/photo-1589461207821-74d6db4b6f6c?auto=format&fit=crop&w=500&q=80',
      productCount: 24,
      slug: 'mates'
    },
    {
      id: '2',
      name: 'Bombillas',
      image: 'https://images.pexels.com/photos/6540933/pexels-photo-6540933.jpeg?auto=compress&cs=tinysrgb&w=500',
      productCount: 15,
      slug: 'bombillas'
    },
    {
      id: '3',
      name: 'Termos',
      image: 'https://images.pexels.com/photos/6540916/pexels-photo-6540916.jpeg?auto=compress&cs=tinysrgb&w=500',
      productCount: 18,
      slug: 'termos'
    },
    {
      id: '4',
      name: 'Accesorios',
      image: 'https://images.pexels.com/photos/6540973/pexels-photo-6540973.jpeg?auto=compress&cs=tinysrgb&w=500',
      productCount: 30,
      slug: 'accesorios'
    }
  ];

  constructor() { }

  getCategories(): Observable<Category[]> {
    return of(this.categories);
  }

  addCategory(category: Category): Observable<Category> {
    this.categories.push(category);
    return of(category);
  }

  updateCategory(id: string, category: Category): Observable<Category> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      this.categories[index] = { ...this.categories[index], ...category };
      return of(this.categories[index]);
    }
    throw new Error('Category not found');
  }

  deleteCategory(id: string): Observable<boolean> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      this.categories.splice(index, 1);
      return of(true);
    }
    return of(false);
  }

  getCategoryById(id: string): Observable<Category | undefined> {
    const category = this.categories.find(c => c.id === id);
    return of(category);
  }
}