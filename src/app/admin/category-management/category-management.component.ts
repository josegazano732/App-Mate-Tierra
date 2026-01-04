import { Component, OnInit } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-category-management',
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.css']
})
export class CategoryManagementComponent implements OnInit {
  categories: Category[] = [];
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

  constructor(private categoryService: CategoryService) { }

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.isLoading = true;
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.isLoading = false;
      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar las categorías';
        console.error('Error loading categories:', error);
        this.isLoading = false;
      }
    });
  }

  onSubmit() {
    if (this.validateCategory(this.newCategory)) {
      this.prepareNewCategory();
    }
  }

  generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  prepareNewCategory() {
    if (this.newCategory.name) {
      this.newCategory.slug = this.generateSlug(this.newCategory.name);
      this.newCategory.id = Date.now().toString();
      this.addCategory();
    }
  }

  addCategory() {
    this.isLoading = true;
    this.errorMessage = '';
    
    if (this.validateCategory(this.newCategory)) {
      this.categoryService.addCategory(this.newCategory).subscribe({
        next: () => {
          this.loadCategories();
          this.resetNewCategory();
          this.isLoading = false;
        },
        error: (error: any) => {
          this.errorMessage = 'Error al añadir la categoría';
          console.error('Error adding category:', error);
          this.isLoading = false;
        }
      });
    } else {
      this.isLoading = false;
    }
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
  }

  editCategory(category: Category) {
    this.editingCategory = { ...category };
  }

  updateCategory() {
    if (this.editingCategory && this.validateCategory(this.editingCategory)) {
      this.isLoading = true;
      this.categoryService.updateCategory(this.editingCategory.id, this.editingCategory).subscribe({
        next: () => {
          this.loadCategories();
          this.editingCategory = null;
          this.isLoading = false;
        },
        error: (error: any) => {
          this.errorMessage = 'Error al actualizar la categoría';
          console.error('Error updating category:', error);
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
          this.errorMessage = 'Error al eliminar la categoría';
          console.error('Error deleting category:', error);
          this.isLoading = false;
        }
      });
    }
  }
}