import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Sale } from '../../services/sales.service';
import { PaymentMethod } from '../../services/payment-methods.service';

interface SaleCard {
  sale: Sale;
  shortId: string;
  itemsLabel: string;
  paymentSummaries: { name: string; amount?: number }[];
}

interface SalesMetrics {
  completedCount: number;
  cancelledCount: number;
  totalRevenue: number;
  averageTicket: number;
  totalItems: number;
  latestSaleDate: string | null;
}

@Component({
  selector: 'app-recent-sales',
  templateUrl: './recent-sales.component.html',
  styleUrls: ['./recent-sales.component.css']
})
export class RecentSalesComponent implements OnChanges {
  @Input() recentSales: Sale[] = [];
  @Input() isLoading: boolean = false;
  @Input() errorMessage: string = '';
  @Input() paymentMethods: PaymentMethod[] = [];
  @Output() cancelSale = new EventEmitter<string>();

  saleCards: SaleCard[] = [];
  metrics: SalesMetrics = {
    completedCount: 0,
    cancelledCount: 0,
    totalRevenue: 0,
    averageTicket: 0,
    totalItems: 0,
    latestSaleDate: null
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recentSales'] || changes['isLoading'] || changes['paymentMethods']) {
      this.rebuildViewModel();
    }
  }

  onCancelSale(id: string) {
    this.cancelSale.emit(id);
  }

  trackBySaleId(_index: number, card: SaleCard): string {
    return card.sale.id;
  }

  private rebuildViewModel(): void {
    if (this.isLoading) {
      this.saleCards = [];
      return;
    }

    const sales = this.recentSales || [];
    const paymentCatalog = this.paymentMethods || [];

    const completed = sales.filter(sale => sale.status === 'completed');
    const cancelledCount = sales.filter(sale => sale.status === 'cancelled').length;

    const totalRevenue = completed.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const totalItems = completed.reduce((sum, sale) => sum + this.countItems(sale), 0);
    const averageTicket = completed.length ? totalRevenue / completed.length : 0;
    const latestSaleDate = sales.length ? (sales[0]?.created_at || null) : null;

    this.metrics = {
      completedCount: completed.length,
      cancelledCount,
      totalRevenue,
      averageTicket,
      totalItems,
      latestSaleDate
    };

    this.saleCards = sales.map((sale) => ({
      sale,
      shortId: this.formatSaleId(sale.id),
      itemsLabel: this.formatItemsLabel(sale),
      paymentSummaries: this.buildPaymentSummaries(sale, paymentCatalog)
    }));
  }

  private buildPaymentSummaries(sale: Sale, catalog: PaymentMethod[]): { name: string; amount?: number }[] {
    if (!sale?.payment_method) {
      return [];
    }

    const methods = sale.payment_method
      .split(',')
      .map(method => method.trim())
      .filter(Boolean);

    return methods.map((method, idx) => {
      const paymentMethod = catalog?.find(m => m.code === method);
      const split = sale.payment_splits?.[idx];
      return {
        name: paymentMethod ? paymentMethod.name : method,
        amount: split ? split.amount : undefined
      };
    });
  }

  private countItems(sale: Sale): number {
    return (sale.items || []).reduce((total, item) => total + (item.quantity || 0), 0);
  }

  private formatItemsLabel(sale: Sale): string {
    const count = this.countItems(sale);
    return count === 1 ? '1 artículo' : `${count} artículos`;
  }

  private formatSaleId(id: string): string {
    if (!id) {
      return '';
    }
    return `#${id.slice(0, 4)}…${id.slice(-4)}`;
  }
}
