import { Component, OnInit } from '@angular/core';
import { SiteSettingsService } from '../../services/site-settings.service';

@Component({
  selector: 'app-footer',
  templateUrl: 'footer.component.html',
  styleUrls: ['footer.component.css']
})
export class FooterComponent implements OnInit {
  currentYear: number = new Date().getFullYear();
  logoUrl: string | null = null;

  constructor(private siteSettingsService: SiteSettingsService) {}

  ngOnInit() {
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
}