import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';
import { ProductService, Product } from '../../services/product.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-product-filter',
  templateUrl: 'product-filter.component.html',
  styleUrls: ['product-filter.component.css']
})
export class ProductFilterComponent implements OnInit {
  @Output() filterChange = new EventEmitter<{search: string, category: string}>();
  searchValue = '';
  categoryValue = '';
  categories: Category[] = [];
  searchResults: Product[] = [];
  private searchTerms = new Subject<string>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.setupSearch();
  }

  private loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  private setupSearch() {
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => this.productService.searchProducts(term))
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
      },
      error: (error) => {
        console.error('Error searching products:', error);
        this.searchResults = [];
      }
    });
  }

  onSearchInput(term: string) {
    if (!term || !term.trim()) {
      this.searchResults = [];
      return;
    }

    this.searchTerms.next(term.trim());
  }

  onFilterChange() {
    this.filterChange.emit({search: this.searchValue, category: this.categoryValue});
  }

  selectSearchResult(product: Product) {
    this.searchValue = product.name;
    this.searchResults = [];
    this.onFilterChange();
  }
}