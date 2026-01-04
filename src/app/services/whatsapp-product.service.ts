import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface WhatsAppProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsAppProductService {
  private mockProducts: WhatsAppProduct[] = [
    {
      id: 'wa1',
      name: 'Mate Imperial',
      description: 'Mate de calabaza premium con detalles en alpaca',
      price: 49.99,
      image: 'https://via.placeholder.com/300x200?text=Mate+Imperial',
      category: 'Mates',
      stock: 10
    },
    {
      id: 'wa2',
      name: 'Bombilla de Plata',
      description: 'Bombilla artesanal de plata 925',
      price: 34.99,
      image: 'https://via.placeholder.com/300x200?text=Bombilla+Plata',
      category: 'Bombillas',
      stock: 15
    },
    // ... rest of the mock products with stock added
  ];

  constructor() { }

  getProducts(): Observable<WhatsAppProduct[]> {
    return of(this.mockProducts).pipe(delay(300));
  }

  getProductById(id: string): Observable<WhatsAppProduct | null> {
    const product = this.mockProducts.find(p => p.id === id);
    return of(product || null).pipe(delay(300));
  }

  searchProducts(term: string): Observable<WhatsAppProduct[]> {
    const filteredProducts = this.mockProducts.filter(product => 
      product.name.toLowerCase().includes(term.toLowerCase()) ||
      product.description.toLowerCase().includes(term.toLowerCase())
    );
    return of(filteredProducts).pipe(delay(300));
  }
}