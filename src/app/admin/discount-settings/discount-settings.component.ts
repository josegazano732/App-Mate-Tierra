import { Component, OnInit } from '@angular/core';
import { DiscountSettingsService, DiscountSettings } from '../../services/discount-settings.service';

@Component({
  selector: 'app-discount-settings',
  templateUrl: './discount-settings.component.html',
  styleUrls: ['./discount-settings.component.css']
})
export class DiscountSettingsComponent implements OnInit {
  settings: DiscountSettings | null = null;
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  constructor(private discountSettingsService: DiscountSettingsService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.isLoading = true;
    this.discountSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.settings = settings;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.errorMessage = 'Error al cargar la configuración de descuentos';
        this.isLoading = false;
      }
    });
  }

  onSubmit() {
    if (!this.settings) return;

    if (this.settings.tier1_quantity >= this.settings.tier2_quantity) {
      this.errorMessage = 'La cantidad del segundo nivel debe ser mayor que la del primer nivel';
      return;
    }

    if (this.settings.tier1_discount >= this.settings.tier2_discount) {
      this.errorMessage = 'El descuento del segundo nivel debe ser mayor que el del primer nivel';
      return;
    }

    this.discountSettingsService.updateSettings(this.settings).subscribe({
      next: (updatedSettings) => {
        this.settings = updatedSettings;
        this.successMessage = 'Configuración actualizada exitosamente';
        this.errorMessage = '';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error updating settings:', error);
        this.errorMessage = 'Error al actualizar la configuración';
        this.successMessage = '';
      }
    });
  }
}