import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, query, where, limit, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError, retry, switchMap } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';

export interface FirebaseProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseProductService {
  private readonly PRODUCTS_COLLECTION = 'products';

  constructor(
    private firebaseService: FirebaseService
  ) {}

  getProducts(): Observable<FirebaseProduct[]> {
    const db = this.firebaseService.getFirestore();
    return from(getDocs(collection(db, this.PRODUCTS_COLLECTION))).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FirebaseProduct))
      ),
      retry(3),
      catchError(error => {
        console.error('Error fetching products:', error);
        return throwError(() => new Error('Error al cargar los productos. Por favor, intente nuevamente.'));
      })
    );
  }

  addProduct(product: Omit<FirebaseProduct, 'id'>): Observable<string> {
    const db = this.firebaseService.getFirestore();
    const productData = {
      ...product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return from(addDoc(collection(db, this.PRODUCTS_COLLECTION), productData)).pipe(
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Error adding product:', error);
        return throwError(() => new Error('Error al agregar el producto. Por favor, intente nuevamente.'));
      })
    );
  }

  updateProduct(id: string, product: Partial<FirebaseProduct>): Observable<void> {
    const db = this.firebaseService.getFirestore();
    const updateData = {
      ...product,
      updatedAt: new Date().toISOString()
    };

    return from(updateDoc(doc(db, this.PRODUCTS_COLLECTION, id), updateData)).pipe(
      catchError(error => {
        console.error('Error updating product:', error);
        return throwError(() => new Error('Error al actualizar el producto. Por favor, intente nuevamente.'));
      })
    );
  }

  deleteProduct(id: string): Observable<void> {
    const db = this.firebaseService.getFirestore();
    return from(deleteDoc(doc(db, this.PRODUCTS_COLLECTION, id))).pipe(
      catchError(error => {
        console.error('Error deleting product:', error);
        return throwError(() => new Error('Error al eliminar el producto. Por favor, intente nuevamente.'));
      })
    );
  }

  getProductById(id: string): Observable<FirebaseProduct | null> {
    const db = this.firebaseService.getFirestore();
    return from(getDoc(doc(db, this.PRODUCTS_COLLECTION, id))).pipe(
      map(doc => {
        if (doc.exists()) {
          return { id: doc.id, ...doc.data() } as FirebaseProduct;
        } else {
          return null;
        }
      }),
      catchError(error => {
        console.error('Error fetching product:', error);
        return of(null);
      })
    );
  }

  updateStock(id: string, quantity: number): Observable<void> {
    return this.getProductById(id).pipe(
      switchMap(product => {
        if (!product) {
          return throwError(() => new Error('Producto no encontrado'));
        }
        
        const newStock = product.stock - quantity;
        if (newStock < 0) {
          return throwError(() => new Error('Stock insuficiente'));
        }
        
        return this.updateProduct(id, { stock: newStock });
      }),
      catchError(error => {
        console.error('Error updating stock:', error);
        return throwError(() => error);
      })
    );
  }

  searchProducts(term: string): Observable<FirebaseProduct[]> {
    const db = this.firebaseService.getFirestore();
    const q = query(
      collection(db, this.PRODUCTS_COLLECTION),
      where('name', '>=', term),
      where('name', '<=', term + '\uf8ff'),
      limit(10)
    );

    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseProduct))),
      catchError(error => {
        console.error('Error searching products:', error);
        return of([]);
      })
    );
  }
}