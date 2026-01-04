import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Sale } from '../../services/sales.service';

@Component({
  selector: 'app-recent-sales',
  templateUrl: './recent-sales.component.html',
  styleUrls: ['./recent-sales.component.css']
})
export class RecentSalesComponent {
  @Input() recentSales: Sale[] = [];
  @Input() isLoading: boolean = false;
  @Input() errorMessage: string = '';
  @Input() paymentMethods: any[] = [];
  @Output() cancelSale = new EventEmitter<string>();

  onCancelSale(id: string) {
    this.cancelSale.emit(id);
  }

  get completedSales(): Sale[] {
    return (this.recentSales || []).filter(sale => sale.status === 'completed');
  }

  get completedSalesCount(): number {
    return this.completedSales.length;
  }

  get cancelledSalesCount(): number {
    return (this.recentSales || []).filter(sale => sale.status === 'cancelled').length;
  }

  get totalRecentRevenue(): number {
    return this.completedSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  }

  get averageTicket(): number {
    return this.completedSalesCount ? this.totalRecentRevenue / this.completedSalesCount : 0;
  }

  get totalItemsSold(): number {
    return this.completedSales.reduce((sum, sale) => {
      const items = sale.items || [];
      return sum + items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
    }, 0);
  }

  get latestSaleDate(): string | null {
    if (!this.recentSales || this.recentSales.length === 0) {
      return null;
    }
    return this.recentSales[0]?.created_at || null;
  }

  getPaymentMethodsForSale(sale: Sale): { name: string; amount?: number }[] {
    if (!sale || !sale.payment_method || !this.paymentMethods) return [];
    const methods = sale.payment_method.split(',');
    return methods.map((method, idx) => {
      const paymentMethod = this.paymentMethods.find(m => m.code === method);
      const split = sale.payment_splits?.[idx];
      return {
        name: paymentMethod ? paymentMethod.name : method,
        amount: split ? split.amount : undefined
      };
    });
  }

  getSaleShortId(id: string): string {
    if (!id) {
      return '';
    }
    return `#${id.slice(0, 4)}…${id.slice(-4)}`;
  }

  getItemsLabel(sale: Sale): string {
    const count = sale.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
    return count === 1 ? '1 artículo' : `${count} artículos`;
  }
}
