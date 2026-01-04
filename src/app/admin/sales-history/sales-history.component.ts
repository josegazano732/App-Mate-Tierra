import { Component, OnInit } from '@angular/core';
import { SalesService, Sale, PaymentSplit } from '../../services/sales.service';
import { PaymentMethodsService, PaymentMethod } from '../../services/payment-methods.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-sales-history',
  templateUrl: './sales-history.component.html',
  styleUrls: ['./sales-history.component.css']
})
export class SalesHistoryComponent implements OnInit {
  sales: Sale[] = [];
  paymentMethods: PaymentMethod[] = [];
  errorMessage = '';
  loading = true;
  // Paginación
  page = 1;
  pageSize = 20;
  totalSales = 0;
  isLoadingMore = false;

  constructor(
    private salesService: SalesService,
    private paymentMethodsService: PaymentMethodsService
  ) {}

  ngOnInit() {
    this.loadPaymentMethods();
    this.loadSales(true);
  }

  loadPaymentMethods() {
    this.paymentMethodsService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        this.errorMessage = 'Error al cargar los métodos de pago';
      }
    });
  }

  loadSales(reset: boolean = false) {
    if (reset) {
      this.sales = [];
      this.page = 1;
      this.totalSales = 0;
    }
    this.loading = this.page === 1;
    this.isLoadingMore = this.page > 1;
    this.salesService.getAllSales(this.pageSize, (this.page - 1) * this.pageSize).subscribe({
      next: (result: { sales: Sale[], total: number }) => {
        this.sales = [...this.sales, ...result.sales];
        this.totalSales = result.total;
        this.loading = false;
        this.isLoadingMore = false;
      },
      error: (error) => {
        console.error('Error loading sales:', error);
        this.errorMessage = 'Error al cargar el historial de ventas';
        this.loading = false;
        this.isLoadingMore = false;
      }
    });
  }

  cancelSale(saleId: string) {
    this.salesService.cancelSale(saleId).subscribe({
      next: () => {
        this.loadSales();
      },
      error: (error) => {
        console.error('Error cancelling sale:', error);
        this.errorMessage = 'Error al cancelar la venta';
      }
    });
  }

  getPaymentMethodsForSale(sale: Sale): { name: string; amount?: number }[] {
    const methods = sale.payment_method.split(',');
    return methods.map(method => {
      const paymentMethod = this.paymentMethods.find(m => m.code === method);
      const split = sale.payment_splits?.[methods.indexOf(method)];
      return {
        name: paymentMethod ? paymentMethod.name : method,
        amount: split ? split.amount : undefined
      };
    });
  }

  exportToExcel() {
    // Prepare data for Excel
    const excelData = this.sales.map(sale => {
      const paymentMethods = this.getPaymentMethodsForSale(sale)
        .map(method => `${method.name}${method.amount ? ` ($${method.amount})` : ''}`)
        .join(', ');

      const items = sale.items?.map(item => 
        `${item.product_name} (${item.quantity}x $${item.unit_price})`
      ).join(', ') || '';

      return {
        'Fecha': new Date(sale.created_at).toLocaleString(),
        'Estado': sale.status === 'completed' ? 'Completada' : 'Cancelada',
        'Métodos de Pago': paymentMethods,
        'Productos': items,
        'Total': `$${sale.total_amount}`
      };
    });

    // Create worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);

    // Create workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial de Ventas');

    // Save file
    const fileName = `historial_ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  loadMore() {
    if (this.sales.length < this.totalSales && !this.isLoadingMore) {
      this.page++;
      this.loadSales();
    }
  }
}