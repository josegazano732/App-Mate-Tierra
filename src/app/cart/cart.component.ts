import { Component, OnInit } from '@angular/core';
import { CartService, CartItem } from '../services/cart.service';
import { ProductService } from '../services/product.service';
import { DiscountSettingsService } from '../services/discount-settings.service';
type JsPDFConstructor = typeof import('jspdf')['default'];

@Component({
  selector: 'app-cart',
  templateUrl: 'cart.component.html',
  styleUrls: ['cart.component.css']
})
export class CartComponent implements OnInit {
  cartItems: CartItem[] = [];
  errorMessage: string = '';
  discountSettings: any = null;
  private pdfLib?: Promise<JsPDFConstructor>;

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private discountSettingsService: DiscountSettingsService
  ) {}

  ngOnInit() {
    this.cartService.getCart().subscribe(items => {
      this.cartItems = items;
    });
    this.loadDiscountSettings();
  }

  loadDiscountSettings() {
    this.discountSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.discountSettings = settings;
      },
      error: (error) => {
        console.error('Error loading discount settings:', error);
      }
    });
  }

  removeItem(productId: string) {
    this.cartService.removeFromCart(productId);
  }

  incrementQuantity(item: CartItem) {
    this.productService.getProductById(item.id).subscribe({
      next: (product) => {
        if (product && item.quantity < product.stock) {
          const newQuantity = item.quantity + 1;
          const originalPrice = this.getOriginalPrice(item);
          const newPrice = this.calculateUnitPrice(originalPrice, newQuantity);
          this.cartService.updateQuantity(item.id, newQuantity, newPrice);
          this.errorMessage = '';
        } else {
          this.errorMessage = 'Not enough stock available';
        }
      },
      error: (error) => {
        console.error('Error checking stock:', error);
        this.errorMessage = 'Error checking available stock';
      }
    });
  }

  decrementQuantity(item: CartItem) {
    if (item.quantity > 1) {
      const newQuantity = item.quantity - 1;
      const originalPrice = this.getOriginalPrice(item);
      const newPrice = this.calculateUnitPrice(originalPrice, newQuantity);
      this.cartService.updateQuantity(item.id, newQuantity, newPrice);
    } else {
      this.removeItem(item.id);
    }
  }

  clearCart() {
    this.cartService.clearCart();
  }

  getTotal() {
    return this.cartService.getTotal();
  }

  getOriginalPrice(item: CartItem): number {
    return item.originalPrice || item.price;
  }

  getDiscount(item: CartItem): number {
    const originalPrice = this.getOriginalPrice(item);
    return ((originalPrice - item.price) / originalPrice) * 100;
  }

  getTotalSavings(): number {
    return this.cartItems.reduce((total, item) => {
      const originalPrice = this.getOriginalPrice(item);
      return total + ((originalPrice - item.price) * item.quantity);
    }, 0);
  }

  private calculateUnitPrice(originalPrice: number, quantity: number): number {
    if (!this.discountSettings) return originalPrice;

    if (quantity >= this.discountSettings.tier2_quantity) {
      return originalPrice * (1 - this.discountSettings.tier2_discount / 100);
    } else if (quantity >= this.discountSettings.tier1_quantity) {
      return originalPrice * (1 - this.discountSettings.tier1_discount / 100);
    }
    return originalPrice;
  }

  private loadPdfLib(): Promise<JsPDFConstructor> {
    if (!this.pdfLib) {
      this.pdfLib = Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]).then(([jspdfModule]) => jspdfModule.default);
    }
    return this.pdfLib;
  }

  async generatePDF() {
    const jsPDF = await this.loadPdfLib();
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Shopping Cart Details', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);

    const tableData = this.cartItems.map(item => {
      const originalPrice = this.getOriginalPrice(item);
      const discount = this.getDiscount(item);
      return [
        item.name,
        item.quantity,
        `$${originalPrice.toFixed(2)}`,
        discount > 0 ? `${discount.toFixed(0)}%` : '-',
        `$${item.price.toFixed(2)}`,
        `$${(item.price * item.quantity).toFixed(2)}`
      ];
    });

    (doc as any).autoTable({
      head: [['Product', 'Quantity', 'Original Price', 'Discount', 'Unit Price', 'Total']],
      body: tableData,
      startY: 30
    });

    const finalY = (doc as any).lastAutoTable.finalY || 30;
    
    if (this.getTotalSavings() > 0) {
      doc.text(`Total Savings: $${this.getTotalSavings().toFixed(2)}`, 14, finalY + 15);
      doc.text(`Final Total: $${this.getTotal().toFixed(2)}`, 14, finalY + 25);
    } else {
      doc.text(`Total: $${this.getTotal().toFixed(2)}`, 14, finalY + 15);
    }

    doc.save('cart-details.pdf');
  }
}