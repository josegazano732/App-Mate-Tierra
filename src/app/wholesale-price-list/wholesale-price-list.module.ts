import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WholesalePriceListComponent } from './wholesale-price-list.component';
import { WholesalePriceListPdfGeneratorComponent } from './wholesale-price-list-pdf-generator.component';

@NgModule({
  declarations: [
    WholesalePriceListComponent,
    WholesalePriceListPdfGeneratorComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: WholesalePriceListComponent }
    ])
  ]
})
export class WholesalePriceListModule { }