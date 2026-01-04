import { Component, OnInit } from '@angular/core';
import * as AOS from 'aos';
import { combineLatest } from 'rxjs';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';
import { ProductService, Product } from '../../services/product.service';

interface CategoryShowcase {
  category: Category;
  featuredProduct?: Product;
  additionalProducts: Product[];
  coverImage: string;
  totalProducts: number;
  description: string;
}

@Component({
  selector: 'app-categories-section',
  templateUrl: './categories-section.component.html',
  styleUrls: ['./categories-section.component.css']
})
export class CategoriesSectionComponent implements OnInit {
  showcases: CategoryShowcase[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  private readonly fallbackImage = 'assets/images/placeholders/category-placeholder.jpg';

  constructor(
    private categoryService: CategoryService,
    private productService: ProductService
  ) {}

  ngOnInit() {
    AOS.init({
      duration: 800,
      once: true,
      mirror: false
    });

    this.loadCategoryShowcases();
  }

  private loadCategoryShowcases() {
    this.isLoading = true;
    combineLatest([
      this.categoryService.getCategories(),
      this.productService.getProducts()
    ]).subscribe({
      next: ([categories, products]) => {
        this.showcases = categories.map(category => this.buildShowcase(category, products));
        this.isLoading = false;
        this.errorMessage = null;
        setTimeout(() => AOS.refreshHard(), 0);
      },
      error: (error) => {
        console.error('Error building category showcases:', error);
        this.errorMessage = 'No pudimos cargar las colecciones. Intenta nuevamente en unos minutos.';
        this.isLoading = false;
      }
    });
  }

  private buildShowcase(category: Category, products: Product[]): CategoryShowcase {
    const grouped = this.groupProductsByCategory(products);
    const categoryKeys = [category.slug, category.name];
    const categoryProducts = categoryKeys
      .map(key => this.normalizeKey(key))
      .map(key => grouped[key])
      .find(list => list && list.length) || [];

    const featuredProduct = categoryProducts[0];
    const additionalProducts = categoryProducts.slice(1, 4);
    const coverImage = featuredProduct?.image || category.image;
    const description = category.description || featuredProduct?.description || this.buildFallbackDescription(category.name);
    const totalProducts = categoryProducts.length || category.productCount;

    return {
      category,
      featuredProduct,
      additionalProducts,
      coverImage,
      totalProducts,
      description
    };
  }

  private groupProductsByCategory(products: Product[]): Record<string, Product[]> {
    return products.reduce((acc, product) => {
      const key = this.normalizeKey(product.category_name || product.category);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }

  private normalizeKey(value?: string): string {
    return value?.toLowerCase().replace(/\s+/g, '-') || 'general';
  }

  private buildFallbackDescription(categoryName: string): string {
    return `Descubre lo mejor de ${categoryName} en una selección curada para los amantes del mate.`;
  }

  handleImageError(event: Event, fallback: string) {
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }

    if (fallback && target.src !== fallback) {
      target.src = fallback;
      return;
    }

    target.src = this.fallbackImage;
  }
}
