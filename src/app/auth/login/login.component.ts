import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  showPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, complete todos los campos';
      return;
    }

    try {
      await this.authService.login(this.email, this.password);
      this.router.navigate(['/gestionar-productos']);
    } catch (error: any) {
      console.error('Error logging in:', error);
      this.errorMessage = 'Credenciales inválidas. Por favor, verifique e intente nuevamente.';
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}