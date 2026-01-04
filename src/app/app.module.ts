import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { ProductsComponent } from './products/products.component';
import { ContactComponent } from './contact/contact.component';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { WhatsAppButtonComponent } from './shared/whatsapp-button/whatsapp-button.component';
import { ProductFilterComponent } from './products/product-filter/product-filter.component';
import { CartComponent } from './cart/cart.component';
import { ProductDetailsComponent } from './products/product-details/product-details.component';
import { ProductCrudComponent } from './products/product-crud/product-crud.component';
import { AddProductComponent } from './admin/add-product/add-product.component';
import { LoginComponent } from './auth/login/login.component';
import { CategoryManagementComponent } from './admin/category-management/category-management.component';
import { ProductCarouselComponent } from './home/product-carousel/product-carousel.component';
import { SalesComponent } from './admin/sales/sales.component';
import { SalesHistoryComponent } from './admin/sales-history/sales-history.component';
import { PaymentMethodsComponent } from './admin/payment-methods/payment-methods.component';
import { CashRegisterComponent } from './admin/cash-register/cash-register.component';
import { FeaturesSectionComponent } from './home/features-section/features-section.component';
import { CategoriesSectionComponent } from './home/categories-section/categories-section.component';
import { RecentSalesComponent } from './admin/recent-sales/recent-sales.component';
import { CurrentSaleComponent } from './admin/current-sale/current-sale.component';

import { AppRoutingModule } from './app-routing.module';
import { SupabaseService } from './services/supabase.service';
import { ProductService } from './services/product.service';
import { ImageService } from './services/image.service';
import { CartService } from './services/cart.service';
import { AuthService } from './services/auth.service';
import { CategoryService } from './services/category.service';
import { SiteSettingsService } from './services/site-settings.service';
import { SalesService } from './services/sales.service';
import { PaymentMethodsService } from './services/payment-methods.service';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ProductsComponent,
    ContactComponent,
    HeaderComponent,
    FooterComponent,
    WhatsAppButtonComponent,
    ProductFilterComponent,
    CartComponent,
    ProductDetailsComponent,
    ProductCrudComponent,
    AddProductComponent,
    LoginComponent,
    CategoryManagementComponent,
    ProductCarouselComponent,
    SalesComponent,
    SalesHistoryComponent,
    PaymentMethodsComponent,
    CashRegisterComponent,
    FeaturesSectionComponent,
    CategoriesSectionComponent,
    RecentSalesComponent,
    CurrentSaleComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    CommonModule
  ],
  providers: [
    SupabaseService,
    ProductService,
    ImageService,
    CartService,
    AuthService,
    CategoryService,
    SiteSettingsService,
    SalesService,
    PaymentMethodsService,
    DecimalPipe,
    DatePipe
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }