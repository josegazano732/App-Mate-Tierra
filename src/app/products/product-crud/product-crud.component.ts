import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';
import { ImageService } from '../../services/image.service';
import { SupabaseService } from '../../services/supabase.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-product-crud',
  templateUrl: './product-crud.component.html',
  styleUrls: ['./product-crud.component.css']
})
export class ProductCrudComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  products: Product[] = [];
  editingProduct: Product | null = null;
  product = {
    name: '',
    description: '',
    price: 0,
    cost: 0,
    markup_percentage: 30,
    image: '',
    category_id: '',
    stock: 0,
    seasonal: false
  };

  categories: Category[] = [];
  errorMessage = '';
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  isSubmitting = false;
  showAddForm = false;

  get lowStockCount(): number {
    return this.products.filter(product => product.stock < 5).length;
  }

  get seasonalProductCount(): number {
    return this.products.filter(product => product.seasonal).length;
  }

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private imageService: ImageService,
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.ensureSupabaseCategoryIds();
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.errorMessage = 'Could not load categories. Please try again later.';
      }
    });
  }

  private async ensureSupabaseCategoryIds() {
    try {
      const previousCategories = [...this.categories];
      const createSelectionName = this.getCategoryNameFromList(previousCategories, this.product.category_id);
      const editSelectionName = this.editingProduct
        ? this.getCategoryNameFromList(previousCategories, this.editingProduct.category_id)
        : null;

      const { data, error } = await this.supabaseService.client
        .from('product_categories')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      if (!data || !data.length) {
        return;
      }

      const fallbackMap = new Map(
        this.categories.map((category) => [this.normalizeCategoryName(category.name), category])
      );

      const merged: Category[] = data.map((row) => {
        const normalizedName = this.normalizeCategoryName(row.name);
        const fallback = fallbackMap.get(normalizedName);

        if (fallback) {
          return { ...fallback, id: row.id };
        }

        return {
          id: row.id,
          name: row.name,
          image: this.getFallbackImage(row.name),
          productCount: 0,
          slug: this.generateSlug(row.name),
          description: ''
        };
      });

      const remainingFallbacks = this.categories.filter((category) =>
        !data.some((row) => this.normalizeCategoryName(row.name) === this.normalizeCategoryName(category.name))
      );

      this.categories = [...merged, ...remainingFallbacks];
      this.rehydrateSelectedCategoryIds(createSelectionName, editSelectionName);
    } catch (error) {
      console.error('Error synchronizing categories with Supabase:', error);
    }
  }

  private normalizeCategoryName(name: string): string {
    return (name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private generateSlug(name: string): string {
    return this.normalizeCategoryName(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private getFallbackImage(name: string): string {
    const baseImage = 'https://images.unsplash.com/photo-1528712306091-ed0763094c98?auto=format&fit=crop&w=600&q=80';
    return baseImage;
  }

  private getCategoryNameFromList(categories: Category[], id: string | null | undefined): string | null {
    if (!id) {
      return null;
    }
    const match = categories.find((category) => category.id === id);
    return match ? match.name : null;
  }

  private rehydrateSelectedCategoryIds(createName: string | null, editName: string | null) {
    if (createName) {
      const mappedId = this.findCategoryIdByName(createName);
      if (mappedId) {
        this.product.category_id = mappedId;
      }
    }

    if (editName && this.editingProduct) {
      const mappedId = this.findCategoryIdByName(editName);
      if (mappedId) {
        this.editingProduct.category_id = mappedId;
      }
    }
  }

  private findCategoryIdByName(name: string | null | undefined): string | undefined {
    if (!name) {
      return undefined;
    }
    const normalized = this.normalizeCategoryName(name);
    const match = this.categories.find((category) => this.normalizeCategoryName(category.name) === normalized);
    return match?.id;
  }

  loadProducts() {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.errorMessage = 'Could not load products. Please try again later.';
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      const validationError = this.imageService.validateImage(this.selectedFile);
      if (validationError) {
        this.errorMessage = validationError;
        this.resetFileInput();
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  private resetFileInput() {
    this.selectedFile = null;
    this.imagePreview = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  calculatePrice(cost: number, markup: number): number {
    return cost * (1 + markup / 100);
  }

  updatePrice() {
    if (this.editingProduct) {
      this.editingProduct.price = this.calculatePrice(this.editingProduct.cost, this.editingProduct.markup_percentage);
    } else {
      this.product.price = this.calculatePrice(this.product.cost, this.product.markup_percentage);
    }
  }

  async onSubmit() {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select an image for the product';
      return;
    }

    if (!this.product.category_id) {
      this.errorMessage = 'Please select a valid category';
      return;
    }

    if (this.product.cost <= 0) {
      this.errorMessage = 'Cost must be greater than 0';
      return;
    }

    if (this.product.markup_percentage <= 0) {
      this.errorMessage = 'Markup percentage must be greater than 0';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const imageUrl = await firstValueFrom(this.imageService.uploadImage(this.selectedFile));
      
      // Calculate final price
      this.product.price = this.calculatePrice(this.product.cost, this.product.markup_percentage);

      const productData = {
        name: this.product.name.trim(),
        description: this.product.description.trim(),
        price: this.product.price,
        cost: this.product.cost,
        markup_percentage: this.product.markup_percentage,
        image: imageUrl,
        category_id: this.product.category_id,
        stock: this.product.stock,
        seasonal: this.product.seasonal
      };

      await firstValueFrom(this.productService.addProduct(productData));
      this.resetForm();
      this.loadProducts();
      this.showAddForm = false;
    } catch (error: any) {
      console.error('Error adding product:', error);
      this.errorMessage = error.message || 'Error adding product. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  resetForm() {
    this.product = {
      name: '',
      description: '',
      price: 0,
      cost: 0,
      markup_percentage: 30,
      image: '',
      category_id: '',
      stock: 0,
      seasonal: false
    };
    this.resetFileInput();
    this.errorMessage = '';
  }

  editProduct(product: Product) {
    this.editingProduct = { ...product };
    this.resetFileInput();
  }

  cancelEdit() {
    this.editingProduct = null;
    this.errorMessage = '';
    this.resetFileInput();
  }

  async saveProduct() {
    if (!this.editingProduct) return;

    if (!this.editingProduct.category_id) {
      this.errorMessage = 'Please select a valid category';
      return;
    }

    if (this.editingProduct.cost <= 0) {
      this.errorMessage = 'Cost must be greater than 0';
      return;
    }

    if (this.editingProduct.markup_percentage <= 0) {
      this.errorMessage = 'Markup percentage must be greater than 0';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      let imageUrl = this.editingProduct.image;

      if (this.selectedFile) {
        imageUrl = await firstValueFrom(this.imageService.uploadImage(this.selectedFile));
      }

      // Calculate final price
      this.editingProduct.price = this.calculatePrice(this.editingProduct.cost, this.editingProduct.markup_percentage);

      const updatedProduct = {
        ...this.editingProduct,
        image: imageUrl
      };

      await firstValueFrom(this.productService.updateProduct(updatedProduct.id, updatedProduct));
      this.editingProduct = null;
      this.resetFileInput();
      this.errorMessage = '';
      this.loadProducts();
    } catch (error: any) {
      console.error('Error updating product:', error);
      this.errorMessage = error.message || 'Error updating product. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  async deleteProduct(product: Product) {
    const confirmMessage = product.stock > 0
      ? `¿Confirmás la eliminación de "${product.name}"? El producto tiene stock y podría estar vinculado a ventas.`
      : `¿Confirmás la eliminación de "${product.name}"? Este producto no tiene stock.`;

    if (confirm(confirmMessage)) {
      try {
        await firstValueFrom(this.productService.deleteProduct(product.id));
        this.products = this.products.filter(p => p.id !== product.id);
        this.errorMessage = '';
      } catch (error: any) {
        console.error('Error deleting product:', error);
        if (error.message === 'sale_items_product_id_fkey') {
          this.errorMessage = `Cannot delete "${product.name}" because it has associated sales. Consider setting the stock to 0 instead.`;
        } else {
          this.errorMessage = 'Error deleting product. Please try again later.';
        }
      }
    }
  }
}