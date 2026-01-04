import { Component, OnInit, ViewChild } from '@angular/core';
import { ProductService, Product } from '../services/product.service';
import { DiscountSettingsService } from '../services/discount-settings.service';
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
  loading = true;
  error: string | null = null;

  constructor(
    private productService: ProductService,
    private discountSettingsService: DiscountSettingsService
  ) {}

  ngOnInit() {
    this.loadData();
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
}