import { FirebaseProduct } from '../services/firebase-product.service';

export interface ProductValidationResult {
  isValid: boolean;
  error?: string;
}

export class ProductValidator {
  static validateProduct(product: Partial<FirebaseProduct>, file: File | null): ProductValidationResult {
    if (!file) {
      return {
        isValid: false,
        error: 'Por favor, seleccione una imagen para el producto'
      };
    }

    if (!product.name?.trim()) {
      return {
        isValid: false,
        error: 'El nombre del producto es requerido'
      };
    }

    if (!product.description?.trim()) {
      return {
        isValid: false,
        error: 'La descripción del producto es requerida'
      };
    }

    if (!product.category) {
      return {
        isValid: false,
        error: 'La categoría es requerida'
      };
    }

    if (!product.price || product.price <= 0) {
      return {
        isValid: false,
        error: 'El precio debe ser mayor a 0'
      };
    }

    if (typeof product.stock !== 'number' || product.stock < 0) {
      return {
        isValid: false,
        error: 'El stock no puede ser negativo'
      };
    }

    return { isValid: true };
  }
}