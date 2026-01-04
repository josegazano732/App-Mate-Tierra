import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { SalesService, Sale } from '../../services/sales.service';
import { AuthService } from '../../services/auth.service';
import { PaymentMethodsService, PaymentMethod } from '../../services/payment-methods.service';
import { Subject, takeUntil, of } from 'rxjs';
import { catchError, finalize, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent implements OnInit, OnDestroy {
  paymentMethods: PaymentMethod[] = [];
  recentSales: Sale[] = [];
  errorMessage = '';
  userId: string | null = null;
  isLoading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private salesService: SalesService,
    private authService: AuthService,
    private paymentMethodsService: PaymentMethodsService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // Solo usar el observable user$
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        console.log('authService.user$ emitió:', user);
        if (user && user.id) {
          if (user.id !== this.userId) {
            this.userId = user.id;
            this.loadPaymentMethodsAndSales();
          }
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPaymentMethodsAndSales() {
    this.paymentMethodsService.getActivePaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.loadRecentSales();
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        this.errorMessage = 'Error al cargar los métodos de pago';
      }
    });
  }

  loadRecentSales() {
    console.log('Iniciando carga de ventas recientes...');
    this.isLoading = true;
    this.salesService.getRecentCompletedSales(5)
      .pipe(
        timeout(5000),
        takeUntil(this.destroy$),
        finalize(() => {
          this.ngZone.run(() => {
            this.isLoading = false;
          });
        }),
        catchError((error: Error) => {
          console.error('Error loading recent sales:', error);
          this.ngZone.run(() => {
            this.errorMessage = 'Error al cargar las ventas recientes';
          });
          return of([]);
        })
      )
      .subscribe({
        next: (result: any) => {
          this.ngZone.run(() => {
            console.log('Respuesta de getRecentCompletedSales:', result);
            // Fuerza nueva referencia para que Angular detecte el cambio
            this.recentSales = Array.isArray(result) ? [...result] : ([...(result.sales || [])]);
            console.log('recentSales final:', this.recentSales);
            this.recentSales.forEach((sale, i) => {
              console.log(`Venta #${i}:`, sale, 'items:', sale.items);
            });
          });
        },
        complete: () => {
          console.log('Carga de ventas recientes completada.');
        }
      });
  }

  cancelSale(saleId: string) {
    this.salesService.cancelSale(saleId).subscribe({
      next: () => {
        this.loadRecentSales();
      },
      error: (error: Error) => {
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
}