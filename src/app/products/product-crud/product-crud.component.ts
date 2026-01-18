import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ProductService, Product } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';
import { ImageService } from '../../services/image.service';
import { SupabaseService } from '../../services/supabase.service';
import { firstValueFrom } from 'rxjs';

interface ProductFilters {
  name: string;
  description: string;
  categoryId: string;
  seasonal: 'all' | 'true' | 'false';
  minCost: number | null;
  maxCost: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minStock: number | null;
  maxStock: number | null;
}

@Component({
  selector: 'app-product-crud',
  templateUrl: './product-crud.component.html',
  styleUrls: ['./product-crud.component.css']
})
export class ProductCrudComponent implements OnInit {
  @ViewChild('createFileInput') createFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('editFileInput') editFileInput!: ElementRef<HTMLInputElement>;

  readonly maxImages = 3;
  readonly imagePlaceholder = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=60';

  products: Product[] = [];
  editingProduct: Product | null = null;
  product = {
    name: '',
    description: '',
    price: 0,
    cost: 0,
    markup_percentage: 30,
    image: '',
    image_urls: [] as string[],
    category_id: '',
    stock: 0,
    seasonal: false
  };

  categories: Category[] = [];
  errorMessage = '';
  isSubmitting = false;
  showAddForm = false;
  isLoadingProducts = false;

  filters!: ProductFilters;
  filteredProducts: Product[] = [];
  paginatedProducts: Product[] = [];
  pageSizeOptions = [10, 20, 50];
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;

  createImagePreviews: string[] = [];
  createSelectedFiles: File[] = [];

  editExistingImages: string[] = [];
  editSelectedFiles: File[] = [];
  editNewImagePreviews: string[] = [];
  originalEditImages: string[] = [];

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
    private supabaseService: SupabaseService
  ) {
    this.filters = this.createDefaultFilters();
  }

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
    this.isLoadingProducts = true;
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.errorMessage = '';
        this.applyFilters();
        this.isLoadingProducts = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.errorMessage = 'Could not load products. Please try again later.';
        this.filteredProducts = [];
        this.paginatedProducts = [];
        this.totalPages = 1;
        this.isLoadingProducts = false;
      }
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  resetFilters() {
    this.filters = this.createDefaultFilters();
    this.applyFilters();
  }

  onPageSizeChange(size: number) {
    const parsedSize = Number(size);
    if (!parsedSize || parsedSize <= 0) {
      return;
    }

    this.pageSize = parsedSize;
    this.currentPage = 1;
    this.updatePagination();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
      this.updatePagination();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.updatePagination();
    }
  }

  get displayRangeStart(): number {
    if (!this.filteredProducts.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get displayRangeEnd(): number {
    if (!this.filteredProducts.length) {
      return 0;
    }
    return this.displayRangeStart + this.paginatedProducts.length - 1;
  }

  get activeFilterCount(): number {
    const {
      name,
      description,
      categoryId,
      seasonal,
      minCost,
      maxCost,
      minPrice,
      maxPrice,
      minStock,
      maxStock
    } = this.filters;

    let count = 0;

    if (name.trim()) count += 1;
    if (description.trim()) count += 1;
    if (categoryId) count += 1;
    if (seasonal !== 'all') count += 1;
    if (minCost !== null) count += 1;
    if (maxCost !== null) count += 1;
    if (minPrice !== null) count += 1;
    if (maxPrice !== null) count += 1;
    if (minStock !== null) count += 1;
    if (maxStock !== null) count += 1;

    return count;
  }

  get hasActiveFilters(): boolean {
    return this.activeFilterCount > 0;
  }

  private createDefaultFilters(): ProductFilters {
    return {
      name: '',
      description: '',
      categoryId: '',
      seasonal: 'all',
      minCost: null,
      maxCost: null,
      minPrice: null,
      maxPrice: null,
      minStock: null,
      maxStock: null
    };
  }

  private matchesFilters(product: Product): boolean {
    const {
      name,
      description,
      categoryId,
      seasonal,
      minCost,
      maxCost,
      minPrice,
      maxPrice,
      minStock,
      maxStock
    } = this.filters;

    const normalizedName = name.trim().toLowerCase();
    if (normalizedName && !product.name.toLowerCase().includes(normalizedName)) {
      return false;
    }

    const normalizedDescription = description.trim().toLowerCase();
    if (normalizedDescription && !(product.description || '').toLowerCase().includes(normalizedDescription)) {
      return false;
    }

    if (categoryId && product.category_id !== categoryId) {
      return false;
    }

    if (seasonal === 'true' && !product.seasonal) {
      return false;
    }

    if (seasonal === 'false' && product.seasonal) {
      return false;
    }

    if (minCost !== null && product.cost < minCost) {
      return false;
    }

    if (maxCost !== null && product.cost > maxCost) {
      return false;
    }

    if (minPrice !== null && product.price < minPrice) {
      return false;
    }

    if (maxPrice !== null && product.price > maxPrice) {
      return false;
    }

    if (minStock !== null && product.stock < minStock) {
      return false;
    }

    if (maxStock !== null && product.stock > maxStock) {
      return false;
    }

    return true;
  }

  applyFilters(resetPage: boolean = true) {
    this.filteredProducts = this.products.filter(product => this.matchesFilters(product));

    if (resetPage) {
      this.currentPage = 1;
    }

    this.updatePagination();
  }

  private updatePagination() {
    const totalItems = this.filteredProducts.length;
    this.totalPages = Math.max(Math.ceil(totalItems / this.pageSize), 1);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedProducts = this.filteredProducts.slice(start, end);
  }

  triggerFileInput(mode: 'create' | 'edit') {
    if (this.getRemainingSlots(mode) <= 0) {
      this.errorMessage = `Solo podés subir hasta ${this.maxImages} imágenes por producto.`;
      return;
    }

    const ref = mode === 'create' ? this.createFileInput : this.editFileInput;
    ref?.nativeElement?.click();
  }

  onCreateFilesSelected(event: Event) {
    this.handleFilesSelected(event, 'create');
  }

  onEditFilesSelected(event: Event) {
    this.handleFilesSelected(event, 'edit');
  }

  removeCreateImage(index: number) {
    this.createSelectedFiles.splice(index, 1);
    this.createImagePreviews.splice(index, 1);
  }

  removeEditExistingImage(index: number) {
    this.editExistingImages.splice(index, 1);
    if (this.editingProduct) {
      this.editingProduct.image_urls = [...this.editExistingImages];
      this.editingProduct.image = this.editExistingImages[0] ?? this.editingProduct.image;
    }
  }

  removeEditNewImage(index: number) {
    this.editSelectedFiles.splice(index, 1);
    this.editNewImagePreviews.splice(index, 1);
  }

  getRemainingSlots(mode: 'create' | 'edit'): number {
    return Math.max(this.maxImages - this.getCurrentImageCount(mode), 0);
  }

  private handleFilesSelected(event: Event, mode: 'create' | 'edit') {
    const input = event.target as HTMLInputElement | null;
    if (!input?.files?.length) {
      this.resetNativeFileInput(mode);
      return;
    }

    const files = Array.from(input.files);
    const availableSlots = this.getRemainingSlots(mode);

    if (availableSlots <= 0) {
      this.errorMessage = `Solo podés subir hasta ${this.maxImages} imágenes por producto.`;
      this.resetNativeFileInput(mode);
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);

    for (const file of filesToProcess) {
      const validationError = this.imageService.validateImage(file);
      if (validationError) {
        this.errorMessage = validationError;
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          return;
        }

        if (mode === 'create') {
          this.createImagePreviews.push(result);
        } else {
          this.editNewImagePreviews.push(result);
        }
      };
      reader.readAsDataURL(file);

      if (mode === 'create') {
        this.createSelectedFiles.push(file);
      } else {
        this.editSelectedFiles.push(file);
      }
    }

    if (files.length > filesToProcess.length) {
      this.errorMessage = `Solo podés subir hasta ${this.maxImages} imágenes por producto.`;
    }

    this.resetNativeFileInput(mode);
  }

  private getCurrentImageCount(mode: 'create' | 'edit'): number {
    if (mode === 'create') {
      return this.createSelectedFiles.length;
    }

    return this.editExistingImages.length + this.editSelectedFiles.length;
  }

  private resetNativeFileInput(mode: 'create' | 'edit') {
    const ref = mode === 'create' ? this.createFileInput : this.editFileInput;
    if (ref?.nativeElement) {
      ref.nativeElement.value = '';
    }
  }

  private resetCreateImageState() {
    this.createSelectedFiles = [];
    this.createImagePreviews = [];
    this.resetNativeFileInput('create');
  }

  private resetEditImageState() {
    this.editExistingImages = [];
    this.editSelectedFiles = [];
    this.editNewImagePreviews = [];
    this.originalEditImages = [];
    this.resetNativeFileInput('edit');
  }

  private async safeDeleteImage(url: string) {
    try {
      await this.imageService.deleteImage(url);
    } catch (error) {
      console.error('Error deleting image from storage:', error);
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
    if (this.createSelectedFiles.length === 0) {
      this.errorMessage = 'Carga al menos una imagen para crear el producto.';
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
      const uploadedUrls = await Promise.all(
        this.createSelectedFiles.map(file => firstValueFrom(this.imageService.uploadImage(file)))
      );

      this.product.price = this.calculatePrice(this.product.cost, this.product.markup_percentage);

      const productData = {
        name: this.product.name.trim(),
        description: this.product.description.trim(),
        price: this.product.price,
        cost: this.product.cost,
        markup_percentage: this.product.markup_percentage,
        image: uploadedUrls[0] ?? '',
        image_urls: uploadedUrls,
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
      image_urls: [],
      category_id: '',
      stock: 0,
      seasonal: false
    };
    this.resetCreateImageState();
    this.errorMessage = '';
  }

  editProduct(product: Product) {
    const images = product.image_urls?.length ? [...product.image_urls] : (product.image ? [product.image] : []);
    this.editingProduct = {
      ...product,
      image_urls: images
    };
    this.originalEditImages = [...images];
    this.editExistingImages = [...images];
    this.editSelectedFiles = [];
    this.editNewImagePreviews = [];
    this.errorMessage = '';
    this.showAddForm = false;
    this.resetNativeFileInput('edit');
  }

  cancelEdit() {
    this.editingProduct = null;
    this.errorMessage = '';
    this.resetEditImageState();
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

    if (this.editExistingImages.length + this.editSelectedFiles.length === 0) {
      this.errorMessage = 'El producto debe tener al menos una imagen.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const uploadedUrls = await Promise.all(
        this.editSelectedFiles.map(file => firstValueFrom(this.imageService.uploadImage(file)))
      );

      const finalImageUrls = [...this.editExistingImages, ...uploadedUrls].slice(0, this.maxImages);
      this.editingProduct.price = this.calculatePrice(this.editingProduct.cost, this.editingProduct.markup_percentage);

      const updatedProduct = {
        ...this.editingProduct,
        image: finalImageUrls[0] ?? this.editingProduct.image,
        image_urls: finalImageUrls
      };

      await firstValueFrom(this.productService.updateProduct(updatedProduct.id, updatedProduct));

      const removedImages = this.originalEditImages.filter(url => !this.editExistingImages.includes(url));
      if (removedImages.length) {
        await Promise.all(removedImages.map(url => this.safeDeleteImage(url)));
      }

      this.editingProduct = null;
      this.resetEditImageState();
      this.errorMessage = '';
      this.loadProducts();
    } catch (error: any) {
      console.error('Error updating product:', error);
      this.errorMessage = error.message || 'Error updating product. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  getPrimaryImage(product: Product): string {
    if (product?.image_urls?.length) {
      return product.image_urls[0];
    }
    if (product?.image) {
      return product.image;
    }
    return this.imagePlaceholder;
  }

  trackByProductId(_index: number, product: Product): string {
    return product.id;
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
        this.applyFilters(false);
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