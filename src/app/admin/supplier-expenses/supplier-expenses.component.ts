import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { PaymentMethodsService, PaymentMethod } from '../../services/payment-methods.service';
import { SupabaseService } from '../../services/supabase.service';

interface ExpenseSplit {
  method: string;
  amount: number;
}

interface PaymentAvailabilityRow {
  payment_method: string;
  available_amount: number;
}

@Component({
  selector: 'app-supplier-expenses',
  templateUrl: './supplier-expenses.component.html',
  styleUrls: ['./supplier-expenses.component.css']
})
export class SupplierExpensesComponent implements OnInit, OnDestroy {
  supplierName = '';
  description = '';
  paymentMethods: PaymentMethod[] = [];
  paymentSplits: ExpenseSplit[] = [{ method: '', amount: 0 }];
  availabilityMap = new Map<string, number>();
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  userId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private paymentMethodsService: PaymentMethodsService,
    private supabase: SupabaseService
  ) {}

  ngOnInit() {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user?.id) {
          this.userId = user.id;
          this.loadInitialData();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalAmount(): number {
    return this.paymentSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
  }

  get hasOverdraw(): boolean {
    return this.paymentSplits.some(split => {
      if (!split.method || split.amount <= 0) return false;
      return split.amount > this.getAvailableAmount(split.method);
    });
  }

  async loadInitialData() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      await Promise.all([
        this.loadPaymentMethods(),
        this.loadAvailability()
      ]);
    } catch (error: any) {
      console.error('Error loading expense data:', error);
      this.errorMessage = error?.message || 'Error al cargar los datos';
    } finally {
      this.isLoading = false;
    }
  }

  private loadPaymentMethods(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.paymentMethodsService.getActivePaymentMethods().subscribe({
        next: (methods) => {
          this.paymentMethods = methods;
          resolve();
        },
        error: (error) => {
          console.error('Error loading payment methods:', error);
          reject(error);
        }
      });
    });
  }

  private async loadAvailability() {
    const { data, error } = await this.supabase.client
      .from('payment_method_totals')
      .select('payment_method, available_amount');

    if (error) throw error;

    this.availabilityMap.clear();
    (data as PaymentAvailabilityRow[] | null || []).forEach(row => {
      this.availabilityMap.set(row.payment_method, Number(row.available_amount) || 0);
    });
  }

  getAvailableAmount(methodCode: string): number {
    return this.availabilityMap.get(methodCode) || 0;
  }

  canAddMoreSplits(): boolean {
    return this.paymentSplits.length < this.paymentMethods.length;
  }

  addPaymentSplit() {
    if (this.canAddMoreSplits()) {
      this.paymentSplits.push({ method: '', amount: 0 });
    }
  }

  removePaymentSplit(index: number) {
    this.paymentSplits.splice(index, 1);
  }

  canRegisterExpense(): boolean {
    const hasSupplier = this.supplierName.trim().length > 0;
    const hasDescription = this.description.trim().length > 0;
    const hasSplits = this.paymentSplits.length > 0;
    const allSplitsValid = this.paymentSplits.every(split => split.method && split.amount > 0);
    return hasSupplier && hasDescription && hasSplits && allSplitsValid && this.totalAmount > 0 && !this.hasOverdraw;
  }

  async registerExpense() {
    if (!this.canRegisterExpense()) {
      this.errorMessage = this.hasOverdraw
        ? 'El monto excede el disponible en algún medio de pago'
        : 'Por favor, complete todos los campos correctamente';
      return;
    }

    if (!this.userId) {
      this.errorMessage = 'Error de autenticación';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const total = this.totalAmount;
      const { data: expense, error: expenseError } = await this.supabase.client
        .from('supplier_expenses')
        .insert([{
          supplier_name: this.supplierName.trim(),
          description: this.description.trim(),
          total_amount: total,
          created_by: this.userId
        }])
        .select()
        .single();

      if (expenseError) throw expenseError;
      if (!expense) throw new Error('No se pudo registrar el gasto');

      const splitsPayload = this.paymentSplits.map(split => ({
        expense_id: expense.id,
        payment_method: split.method,
        amount: split.amount
      }));

      const { error: splitError } = await this.supabase.client
        .from('supplier_expense_splits')
        .insert(splitsPayload);

      if (splitError) throw splitError;

      this.supplierName = '';
      this.description = '';
      this.paymentSplits = [{ method: '', amount: 0 }];

      await this.loadAvailability();
    } catch (error: any) {
      console.error('Error registering expense:', error);
      this.errorMessage = error?.message || 'Error al registrar el gasto';
    } finally {
      this.isSubmitting = false;
    }
  }
}
