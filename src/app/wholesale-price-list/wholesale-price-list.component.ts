import { Component, OnInit, ViewChild } from '@angular/core';
import { ProductService, Product } from '../services/product.service';
import { DiscountSettingsService } from '../services/discount-settings.service';
import { SiteSettingsService } from '../services/site-settings.service';
import { forkJoin } from 'rxjs';
import { WholesalePriceListPdfGeneratorComponent } from './wholesale-price-list-pdf-generator.component';

interface ProductWithDiscounts extends Product {
  tier1Price: number;
  tier2Price: number;
  tier1Quantity: number;
  tier2Quantity: number;
  tier1Discount: number;
  tier2Discount: number;
}

@Component({
  selector: 'app-wholesale-price-list',
  templateUrl: './wholesale-price-list.component.html',
  styleUrls: ['./wholesale-price-list.component.css']
})
export class WholesalePriceListComponent implements OnInit {
  @ViewChild('pdfGenerator') pdfGenerator!: WholesalePriceListPdfGeneratorComponent;
  
  products: ProductWithDiscounts[] = [];
  filteredProducts: ProductWithDiscounts[] = [];
  categories: string[] = [];
  selectedCategories: string[] = [];
  logoUrl: string | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private productService: ProductService,
    private discountSettingsService: DiscountSettingsService,
    private siteSettingsService: SiteSettingsService
  ) {}

  ngOnInit() {
    this.loadLogo();
    this.loadData();
  }

  private loadLogo() {
    this.siteSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.logoUrl = settings.logo_url;
      },
      error: (error) => {
        console.error('Error loading logo:', error);
      }
    });
  }

  private loadData() {
    this.loading = true;
    this.error = null;

    forkJoin({
      products: this.productService.getProducts(),
      discounts: this.discountSettingsService.getSettings()
    }).subscribe({
      next: ({ products, discounts }) => {
        this.products = products.map(product => ({
          ...product,
          tier1Price: product.price * (1 - discounts.tier1_discount / 100),
          tier2Price: product.price * (1 - discounts.tier2_discount / 100),
          tier1Quantity: discounts.tier1_quantity,
          tier2Quantity: discounts.tier2_quantity,
          tier1Discount: discounts.tier1_discount,
          tier2Discount: discounts.tier2_discount
        }));
        const categoryNames = this.products
          .map(product => product.category_name)
          .filter((value): value is string => Boolean(value));
        this.categories = Array.from(new Set(categoryNames))
          .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        this.applyCategoryFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.error = 'Error al cargar los datos. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }

  downloadPdf() {
    if (this.pdfGenerator) {
      this.pdfGenerator.generatePdf();
    }
  }

  applyCategoryFilter() {
    if (!this.selectedCategories.length) {
      this.filteredProducts = [...this.products];
      return;
    }

    this.filteredProducts = this.products.filter(
      product => this.selectedCategories.includes(product.category_name || '')
    );
  }

  toggleCategory(category: string, event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      if (!this.selectedCategories.includes(category)) {
        this.selectedCategories = [...this.selectedCategories, category];
      }
    } else {
      this.selectedCategories = this.selectedCategories.filter(item => item !== category);
    }

    this.applyCategoryFilter();
  }
}