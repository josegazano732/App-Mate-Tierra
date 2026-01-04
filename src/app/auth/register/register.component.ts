import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  name: string = '';
  age: number | null = null;
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  async onSubmit() {
    if (!this.name || !this.age || !this.email || !this.password) {
      this.errorMessage = 'Todos los campos son obligatorios.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    try {
      await this.authService.register(this.email, this.password, this.name, this.age);
      this.router.navigate(['/']);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'Este correo electrónico ya está en uso. Por favor, utiliza otro.';
      } else if (error.code === 'auth/weak-password') {
        this.errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
      } else {
        this.errorMessage = error.message || 'Error al registrar. Por favor, intenta de nuevo.';
      }
      console.error('Error en el registro:', error);
    }
  }
}