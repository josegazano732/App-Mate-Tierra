import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  private cartCountSubject = new BehaviorSubject<number>(0);

  constructor() {
    this.loadCartFromLocalStorage();
  }

  private loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        this.cartItems = JSON.parse(savedCart);
        this.updateCart();
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        this.cartItems = [];
        this.updateCart();
      }
    }
  }

  private saveCartToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(this.cartItems));
  }

  getCart(): Observable<CartItem[]> {
    return this.cartSubject.asObservable();
  }

  getCartCount(): Observable<number> {
    return this.cartCountSubject.asObservable();
  }

  private updateCart() {
    this.cartSubject.next([...this.cartItems]);
    this.updateCartCount();
    this.saveCartToLocalStorage();
  }

  private updateCartCount() {
    const count = this.cartItems.reduce((total, item) => total + item.quantity, 0);
    this.cartCountSubject.next(count);
  }

  addToCart(product: CartItem) {
    if (!product.id) {
      console.error('Invalid product ID');
      return;
    }

    const existingItem = this.cartItems.find(item => item.id === product.id);
    if (existingItem) {
      existingItem.quantity += product.quantity || 1;
      existingItem.price = product.price;
      if (product.originalPrice) {
        existingItem.originalPrice = product.originalPrice;
      }
    } else {
      this.cartItems.push({
        ...product,
        quantity: product.quantity || 1,
        originalPrice: product.originalPrice || product.price
      });
    }
    this.updateCart();
  }

  removeFromCart(productId: string) {
    this.cartItems = this.cartItems.filter(item => item.id !== productId);
    this.updateCart();
  }

  updateQuantity(productId: string, quantity: number, newPrice?: number) {
    const item = this.cartItems.find(item => item.id === productId);
    if (item) {
      item.quantity = quantity;
      if (newPrice !== undefined) {
        item.price = newPrice;
      }
      if (item.quantity <= 0) {
        this.removeFromCart(productId);
      } else {
        this.updateCart();
      }
    }
  }

  clearCart() {
    this.cartItems = [];
    this.updateCart();
  }

  getTotal(): number {
    return this.cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }
}