import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProductsComponent } from './products/products.component';
import { ContactComponent } from './contact/contact.component';
import { CartComponent } from './cart/cart.component';
import { ProductDetailsComponent } from './products/product-details/product-details.component';
import { ProductCrudComponent } from './products/product-crud/product-crud.component';
import { AddProductComponent } from './admin/add-product/add-product.component';
import { LoginComponent } from './auth/login/login.component';
import { CategoryManagementComponent } from './admin/category-management/category-management.component';
import { SalesComponent } from './admin/sales/sales.component';
import { SalesHistoryComponent } from './admin/sales-history/sales-history.component';
import { PaymentMethodsComponent } from './admin/payment-methods/payment-methods.component';
import { CashRegisterComponent } from './admin/cash-register/cash-register.component';
import { CurrentSaleComponent } from './admin/current-sale/current-sale.component';
import { AdminGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'productos', component: ProductsComponent },
  { path: 'productos/:id', component: ProductDetailsComponent },
  { path: 'contacto', component: ContactComponent },
  { path: 'carrito', component: CartComponent },
  { path: 'login', component: LoginComponent },
  { path: 'gestionar-productos', component: ProductCrudComponent, canActivate: [AdminGuard] },
  { path: 'agregar-producto', component: AddProductComponent, canActivate: [AdminGuard] },
  { path: 'gestionar-categorias', component: CategoryManagementComponent, canActivate: [AdminGuard] },
  { path: 'ventas', component: SalesComponent, canActivate: [AdminGuard] },
  { path: 'venta-actual', component: CurrentSaleComponent, canActivate: [AdminGuard] },
  { path: 'historial-ventas', component: SalesHistoryComponent, canActivate: [AdminGuard] },
  { path: 'metodos-pago', component: PaymentMethodsComponent, canActivate: [AdminGuard] },
  { path: 'caja', component: CashRegisterComponent, canActivate: [AdminGuard] },
  { 
    path: 'lista-precios-mayorista', 
    loadChildren: () => import('./wholesale-price-list/wholesale-price-list.module').then(m => m.WholesalePriceListModule),
    canActivate: [AdminGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true, scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }