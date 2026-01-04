import { Component, OnInit, OnDestroy } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { SalesService } from '../../services/sales.service';
import { AuthService } from '../../services/auth.service';
import { PaymentMethodsService, PaymentMethod } from '../../services/payment-methods.service';
import * as XLSX from 'xlsx';
import { DecimalPipe } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface CashWithdrawal {
  id: string;
  payment_method: string;
  amount: number;
  description: string;
  created_at: string;
}

interface CashIncome {
  id: string;
  payment_method: string;
  amount: number;
  description: string;
  created_at: string;
}

interface PaymentAvailabilityCard {
  code: string;
  name: string;
  available: number;
  sales: number;
  percentage: number;
}

@Component({
  selector: 'app-cash-register',
  templateUrl: './cash-register.component.html',
  styleUrls: ['./cash-register.component.css'],
  providers: [DecimalPipe]
})
export class CashRegisterComponent implements OnInit, OnDestroy {
  paymentTotals: any[] = [];
  withdrawals: CashWithdrawal[] = [];
  incomes: CashIncome[] = [];
  totalAmount = 0;
  totalSales = 0;
  totalWithdrawals = 0;
  totalIncomes = 0;
  isLoading = true;
  errorMessage = '';
  showWithdrawalForm = false;
  showIncomeForm = false;
  newWithdrawal = {
    payment_method: '',
    amount: 0,
    description: ''
  };
  newIncome = {
    payment_method: '',
    amount: 0,
    description: ''
  };
  paymentMethods: PaymentMethod[] = [];
  userId: string | null = null;
  availabilityCards: PaymentAvailabilityCard[] = [];
  historyFilter = 'all';
  filteredWithdrawals: CashWithdrawal[] = [];
  filteredIncomes: CashIncome[] = [];
  private destroy$ = new Subject<void>();
  private realtimeChannel: any = null;

  constructor(
    private supabase: SupabaseService,
    private salesService: SalesService,
    private paymentMethodsService: PaymentMethodsService,
    private authService: AuthService,
    private decimalPipe: DecimalPipe
  ) {}

  ngOnInit() {
    this.authService.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        this.userId = user.id;
        this.loadData();
        this.loadPaymentMethods();
        this.setupRealtimeSubscriptions();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }
  }

  private setupRealtimeSubscriptions() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.realtimeChannel = this.supabase.client
      .channel('cash-register-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_withdrawals' }, () => {
        console.log('Withdrawal change detected');
        this.loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_incomes' }, () => {
        console.log('Income change detected');
        this.loadData();
      })
      .subscribe((status: any) => {
        console.log('Realtime subscription status:', status);
      });
  }

  private loadPaymentMethods() {
    this.paymentMethodsService.getActivePaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.buildAvailabilityCards();
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        this.errorMessage = 'Error al cargar los métodos de pago';
      }
    });
  }

  private async loadData() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      await Promise.all([
        this.loadPaymentTotals(),
        this.loadWithdrawals(),
        this.loadIncomes()
      ]);
    } catch (error: any) {
      console.error('Error loading data:', error);
      this.errorMessage = error.message || 'Error al cargar los datos';
    } finally {
      this.isLoading = false;
    }
  }

  private async loadPaymentTotals() {
    const { data, error } = await this.supabase.client
      .from('payment_method_totals')
      .select('*')
      .order('total_amount', { ascending: false });

    if (error) throw error;

    this.paymentTotals = data;
    this.calculateTotals();
    this.buildAvailabilityCards();
  }

  private async loadWithdrawals() {
    try {
      const { data, error } = await this.supabase.client
        .from('cash_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.withdrawals = data || [];
      this.applyHistoryFilter();
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      throw error;
    }
  }

  private async loadIncomes() {
    try {
      const { data, error } = await this.supabase.client
        .from('cash_incomes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.incomes = data || [];
      this.applyHistoryFilter();
    } catch (error) {
      console.error('Error loading incomes:', error);
      throw error;
    }
  }

  private calculateTotals() {
    this.totalAmount = this.paymentTotals.reduce((sum, method) => sum + method.total_amount, 0);
    this.totalSales = this.paymentTotals.reduce((sum, method) => sum + method.number_of_sales, 0);
    this.totalWithdrawals = this.paymentTotals.reduce((sum, method) => sum + method.total_withdrawals, 0);
    this.totalIncomes = this.paymentTotals.reduce((sum, method) => sum + method.total_incomes, 0);
  }

  get netAvailable(): number {
    return this.totalAmount - this.totalWithdrawals + this.totalIncomes;
  }

  getPaymentMethodName(code: string): string {
    const method = this.paymentMethods.find(m => m.code === code);
    return method ? method.name : code;
  }

  getAvailableAmount(paymentMethod: string): number {
    const method = this.paymentTotals.find(m => m.payment_method === paymentMethod);
    return method ? method.available_amount : 0;
  }

  async registerWithdrawal() {
    if (!this.userId) {
      this.errorMessage = 'Error de autenticación';
      return;
    }

    if (!this.newWithdrawal.payment_method || this.newWithdrawal.amount <= 0 || !this.newWithdrawal.description) {
      this.errorMessage = 'Por favor, complete todos los campos correctamente';
      return;
    }

    const availableAmount = this.getAvailableAmount(this.newWithdrawal.payment_method);
    if (this.newWithdrawal.amount > availableAmount) {
      this.errorMessage = 'El monto excede el disponible en caja para este método de pago';
      return;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('cash_withdrawals')
        .insert([{
          ...this.newWithdrawal,
          created_by: this.userId
        }])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No se pudo crear el retiro');

      this.showWithdrawalForm = false;
      this.newWithdrawal = {
        payment_method: '',
        amount: 0,
        description: ''
      };
      this.errorMessage = '';
      
      await this.loadData();
    } catch (error: any) {
      console.error('Error registering withdrawal:', error);
      this.errorMessage = error.message || 'Error al registrar el retiro de caja';
    }
  }

  async registerIncome() {
    if (!this.userId) {
      this.errorMessage = 'Error de autenticación';
      return;
    }

    if (!this.newIncome.payment_method || this.newIncome.amount <= 0 || !this.newIncome.description) {
      this.errorMessage = 'Por favor, complete todos los campos correctamente';
      return;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('cash_incomes')
        .insert([{
          ...this.newIncome,
          created_by: this.userId
        }])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No se pudo registrar el ingreso');

      this.showIncomeForm = false;
      this.newIncome = {
        payment_method: '',
        amount: 0,
        description: ''
      };
      this.errorMessage = '';
      
      await this.loadData();
    } catch (error: any) {
      console.error('Error registering income:', error);
      this.errorMessage = error.message || 'Error al registrar el ingreso de caja';
    }
  }

  getPercentage(amount: number): number {
    if (!this.totalAmount) {
      return 0;
    }
    return (amount / this.totalAmount) * 100;
  }

  formatCurrency(value: number): string {
    return this.decimalPipe.transform(value, '1.2-2') || '0';
  }

  onHistoryFilterChange(code: string) {
    this.historyFilter = code;
    this.applyHistoryFilter();
  }

  private applyHistoryFilter() {
    if (this.historyFilter === 'all') {
      this.filteredWithdrawals = [...this.withdrawals];
      this.filteredIncomes = [...this.incomes];
      return;
    }

    this.filteredWithdrawals = this.withdrawals.filter(w => w.payment_method === this.historyFilter);
    this.filteredIncomes = this.incomes.filter(i => i.payment_method === this.historyFilter);
  }

  private buildAvailabilityCards() {
    if (!this.paymentTotals) {
      this.availabilityCards = [];
      return;
    }

    this.availabilityCards = this.paymentTotals.map((method) => {
      const name = method.payment_method_name || this.getPaymentMethodName(method.payment_method);
      const percentage = this.totalAmount ? (method.total_amount / this.totalAmount) * 100 : 0;
      return {
        code: method.payment_method,
        name,
        available: method.available_amount,
        sales: method.number_of_sales,
        percentage
      };
    });
  }

  exportToExcel() {
    const excelData = this.paymentTotals.map(method => ({
      'Método de Pago': method.payment_method_name,
      'Cantidad de Ventas': method.number_of_sales,
      'Total Ventas': `$${this.formatCurrency(method.total_amount)}`,
      'Total Retiros': `$${this.formatCurrency(method.total_withdrawals)}`,
      'Total Ingresos': `$${this.formatCurrency(method.total_incomes)}`,
      'Disponible': `$${this.formatCurrency(method.available_amount)}`,
      'Promedio por Venta': `$${this.formatCurrency(method.average_sale_amount)}`,
      'Porcentaje del Total': `${this.formatCurrency(this.getPercentage(method.total_amount))}%`,
      'Primera Venta': new Date(method.first_sale).toLocaleString(),
      'Última Venta': new Date(method.last_sale).toLocaleString()
    }));

    excelData.push({
      'Método de Pago': 'TOTAL',
      'Cantidad de Ventas': this.totalSales,
      'Total Ventas': `$${this.formatCurrency(this.totalAmount)}`,
      'Total Retiros': `$${this.formatCurrency(this.totalWithdrawals)}`,
      'Total Ingresos': `$${this.formatCurrency(this.totalIncomes)}`,
      'Disponible': `$${this.formatCurrency(this.totalAmount - this.totalWithdrawals + this.totalIncomes)}`,
      'Promedio por Venta': `$${this.formatCurrency(this.totalAmount / this.totalSales)}`,
      'Porcentaje del Total': '100%',
      'Primera Venta': '',
      'Última Venta': ''
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Caja');

    const fileName = `reporte_caja_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}