import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.model';

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

  constructor(
    private categoryService: CategoryService
  ) {}

  ngOnInit() {
    this.loadCategories();
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

  onSearchInput() {
    this.onFilterChange();
  }

  onFilterChange() {
    this.filterChange.emit({search: this.searchValue, category: this.categoryValue});
  }
}