import { Component, OnInit, HostListener } from '@angular/core';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';
import { SiteSettingsService } from '../../services/site-settings.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isMenuOpen = false;
  isAdminMenuOpen = false;
  isScrolled = false;
  cartItemCount = 0;
  isAdmin$: Observable<boolean>;
  isLoggedIn$: Observable<boolean>;
  logoUrl: string | null = null;

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (window.innerWidth > 768 && this.isMenuOpen) {
      this.closeMenu();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeMenu();
      this.isAdminMenuOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.admin-menu')) {
      this.isAdminMenuOpen = false;
    }
  }

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private imageService: ImageService,
    private siteSettingsService: SiteSettingsService,
    private router: Router
  ) {
    this.isAdmin$ = this.authService.isAdmin();
    this.isLoggedIn$ = this.authService.isLoggedIn();
  }

  ngOnInit() {
    this.cartService.getCartCount().subscribe(count => {
      this.cartItemCount = count;
    });
    this.loadLogo();
  }

  private loadLogo() {
    this.siteSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.logoUrl = settings.logo_url;
      },
      error: (error) => {
        console.error('Error loading logo:', error);
      }
    });
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    document.body.classList.toggle('menu-open', this.isMenuOpen);
    if (!this.isMenuOpen) {
      this.isAdminMenuOpen = false;
    }
  }

  toggleAdminMenu(event: Event) {
    event.stopPropagation();
    this.isAdminMenuOpen = !this.isAdminMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
    this.isAdminMenuOpen = false;
    document.body.classList.remove('menu-open');
  }

  login() {
    this.router.navigate(['/login']);
    this.closeMenu();
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/']);
      this.closeMenu();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}