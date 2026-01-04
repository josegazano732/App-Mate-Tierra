import { Component, OnInit } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';
import { ProductService, Product } from '../../services/product.service';

@Component({
  selector: 'app-category-management',
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.css']
})
export class CategoryManagementComponent implements OnInit {
  categories: Category[] = [];
  filteredCategories: Category[] = [];
  newCategory: Category = {
    id: '',
    name: '',
    image: '',
    productCount: 0,
    slug: '',
    description: ''
  };
  editingCategory: Category | null = null;
  errorMessage: string = '';
  isLoading: boolean = false;
  searchTerm = '';
  stats = {
    totalCategories: 0,
    totalProducts: 0
  };
  productImageOptions: { id: string; url: string; label: string }[] = [];
  selectedNewImageOption = '';
  selectedEditImageOption = '';

  constructor(
    private categoryService: CategoryService,
    private productService: ProductService
  ) { }

  ngOnInit() {
    this.loadCategories();
    this.loadProductImages();
  }

  loadCategories() {
    this.isLoading = true;
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.updateStats();
        this.applyFilter();
        this.isLoading = false;
      },
      error: (error: any) => {
        this.errorMessage = this.resolveErrorMessage(error, 'Error al cargar las categorías');
        this.isLoading = false;
      }
    });
  }

  loadProductImages() {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.productImageOptions = this.buildProductImageOptions(products);
      },
      error: (error: any) => {
        console.error('Error loading product images:', error);
      }
    });
  }

  generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  onSubmit() {
    if (!this.validateCategory(this.newCategory)) {
      return;
    }

    const payload: Category = {
      ...this.newCategory,
      id: '',
      slug: this.generateSlug(this.newCategory.name),
      productCount: this.newCategory.productCount || 0
    };

    this.isLoading = true;
    this.errorMessage = '';

    this.categoryService.addCategory(payload).subscribe({
      next: () => {
        this.loadCategories();
        this.resetNewCategory();
        this.isLoading = false;
      },
      error: (error: any) => {
        this.errorMessage = this.resolveErrorMessage(error, 'Error al añadir la categoría');
        this.isLoading = false;
      }
    });
  }

  validateCategory(category: Category): boolean {
    if (!category.name || !category.image) {
      this.errorMessage = 'El nombre y la imagen son obligatorios';
      return false;
    }
    return true;
  }

  resetNewCategory() {
    this.newCategory = {
      id: '',
      name: '',
      image: '',
      productCount: 0,
      slug: '',
      description: ''
    };
    this.errorMessage = '';
    this.selectedNewImageOption = '';
  }

  editCategory(category: Category) {
    this.editingCategory = { ...category };
    this.selectedEditImageOption = '';
  }

  updateCategory() {
    if (this.editingCategory && this.validateCategory(this.editingCategory)) {
      this.isLoading = true;
      this.editingCategory.slug = this.generateSlug(this.editingCategory.name);
      this.categoryService.updateCategory(this.editingCategory.id, this.editingCategory).subscribe({
        next: () => {
          this.loadCategories();
          this.editingCategory = null;
          this.selectedEditImageOption = '';
          this.isLoading = false;
        },
        error: (error: any) => {
          this.errorMessage = this.resolveErrorMessage(error, 'Error al actualizar la categoría');
          this.isLoading = false;
        }
      });
    }
  }

  deleteCategory(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      this.isLoading = true;
      this.categoryService.deleteCategory(id).subscribe({
        next: () => {
          this.loadCategories();
          this.isLoading = false;
        },
        error: (error: any) => {
          this.errorMessage = this.resolveErrorMessage(error, 'Error al eliminar la categoría');
          this.isLoading = false;
        }
      });
    }
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.applyFilter();
  }

  trackByCategoryId(_index: number, category: Category): string {
    return category.id;
  }

  getImagePreview(category: Category): string {
    return category.image || 'https://via.placeholder.com/120?text=Sin+imagen';
  }

  onImageSelectFromPicker(url: string, target: 'new' | 'edit') {
    if (!url) {
      return;
    }

    if (target === 'new') {
      this.newCategory.image = url;
      this.selectedNewImageOption = '';
      return;
    }

    if (target === 'edit' && this.editingCategory) {
      this.editingCategory.image = url;
      this.selectedEditImageOption = '';
    }
  }

  private applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredCategories = [...this.categories];
      return;
    }

    this.filteredCategories = this.categories.filter(category =>
      category.name.toLowerCase().includes(term) ||
      (category.description || '').toLowerCase().includes(term)
    );
  }

  private updateStats() {
    this.stats.totalCategories = this.categories.length;
    this.stats.totalProducts = this.categories.reduce((total, category) => total + (category.productCount || 0), 0);
  }


  private buildProductImageOptions(products: Product[]): { id: string; url: string; label: string }[] {
    const seen = new Set<string>();
    return products
      .filter(product => !!product.image)
      .filter(product => {
        if (seen.has(product.image)) {
          return false;
        }
        seen.add(product.image);
        return true;
      })
      .map(product => ({
        id: product.id,
        url: product.image,
        label: `${product.name} · ${product.id}`
      }));
  }

  private resolveErrorMessage(error: any, fallback: string): string {
    if (!error) {
      return fallback;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    return fallback;
  }
}