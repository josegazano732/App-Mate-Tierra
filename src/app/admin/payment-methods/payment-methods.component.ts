import { Component, OnInit } from '@angular/core';
import { PaymentMethodsService, PaymentMethod } from '../../services/payment-methods.service';

@Component({
  selector: 'app-payment-methods',
  templateUrl: './payment-methods.component.html',
  styleUrls: ['./payment-methods.component.css']
})
export class PaymentMethodsComponent implements OnInit {
  paymentMethods: PaymentMethod[] = [];
  newPaymentMethod: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'> = {
    name: '',
    code: '',
    active: true
  };
  editingPaymentMethod: PaymentMethod | null = null;
  errorMessage = '';
  showAddForm = false;

  constructor(private paymentMethodsService: PaymentMethodsService) {}

  ngOnInit() {
    this.loadPaymentMethods();
  }

  loadPaymentMethods() {
    this.paymentMethodsService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        this.errorMessage = 'Error al cargar los métodos de pago';
      }
    });
  }

  onSubmit() {
    if (!this.newPaymentMethod.name || !this.newPaymentMethod.code) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    this.paymentMethodsService.addPaymentMethod(this.newPaymentMethod).subscribe({
      next: () => {
        this.loadPaymentMethods();
        this.resetForm();
        this.showAddForm = false;
      },
      error: (error) => {
        console.error('Error adding payment method:', error);
        this.errorMessage = 'Error al agregar el método de pago';
      }
    });
  }

  startEdit(method: PaymentMethod) {
    this.editingPaymentMethod = { ...method };
  }

  cancelEdit() {
    this.editingPaymentMethod = null;
    this.errorMessage = '';
  }

  saveEdit() {
    if (!this.editingPaymentMethod) return;

    if (!this.editingPaymentMethod.name || !this.editingPaymentMethod.code) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    this.paymentMethodsService.updatePaymentMethod(
      this.editingPaymentMethod.id,
      {
        name: this.editingPaymentMethod.name,
        code: this.editingPaymentMethod.code,
        active: this.editingPaymentMethod.active
      }
    ).subscribe({
      next: () => {
        this.loadPaymentMethods();
        this.editingPaymentMethod = null;
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('Error updating payment method:', error);
        this.errorMessage = 'Error al actualizar el método de pago';
      }
    });
  }

  toggleStatus(method: PaymentMethod) {
    this.paymentMethodsService.togglePaymentMethod(method.id, !method.active).subscribe({
      next: () => {
        this.loadPaymentMethods();
      },
      error: (error) => {
        console.error('Error toggling payment method status:', error);
        this.errorMessage = 'Error al cambiar el estado del método de pago';
      }
    });
  }

  private resetForm() {
    this.newPaymentMethod = {
      name: '',
      code: '',
      active: true
    };
    this.errorMessage = '';
  }
}