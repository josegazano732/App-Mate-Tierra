import { Component, OnInit } from '@angular/core';
import { CartService, CartItem } from '../services/cart.service';
import { ProductService } from '../services/product.service';
import { DiscountSettingsService } from '../services/discount-settings.service';
import { SiteSettingsService } from '../services/site-settings.service';
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
  logoUrl: string | null = null;
  private logoImage: { dataUrl: string; format: 'PNG' | 'JPEG' | 'WEBP' } | null = null;
  private pdfLib?: Promise<JsPDFConstructor>;
  private readonly currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  });

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private discountSettingsService: DiscountSettingsService,
    private siteSettingsService: SiteSettingsService
  ) {}

  ngOnInit() {
    this.cartService.getCart().subscribe(items => {
      this.cartItems = items;
    });
    this.loadDiscountSettings();
    this.loadSiteBranding();
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

  loadSiteBranding() {
    this.siteSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.logoUrl = settings.logo_url;
        this.logoImage = null;
      },
      error: (error) => {
        console.error('Error loading site branding:', error);
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

  getTotalQuantity(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  getSubtotal(): number {
    return this.cartItems.reduce((total, item) => {
      return total + (this.getOriginalPrice(item) * item.quantity);
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
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setProperties({ title: 'Mate Tierra - Resumen profesional del carrito' });

    let pageWidth = doc.internal.pageSize.getWidth();
    let pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 56;
    let cursorY = 120;

    const drawFooter = () => {
      doc.setDrawColor(210, 226, 216);
      doc.setLineWidth(0.75);
      doc.line(marginX, pageHeight - 54, pageWidth - marginX, pageHeight - 54);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(120, 130, 124);
      doc.text('Documento generado automáticamente por Mate Tierra — Distribución y diseño artesanal', pageWidth / 2, pageHeight - 32, { align: 'center' });
    };

    // Header background band
    doc.setFillColor(24, 52, 36);
    doc.rect(0, 0, pageWidth, 120, 'F');

    const logoImage = await this.getLogoImage();
    if (logoImage) {
      const logoWidth = 148;
      const logoHeight = 56;
      try {
        doc.addImage(logoImage.dataUrl, logoImage.format, marginX, 32, logoWidth, logoHeight, undefined, 'FAST');
      } catch (error) {
        console.error('Error rendering logo in PDF:', error);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text('Mate Tierra', pageWidth - marginX, 54, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text('Resumen profesional del carrito', pageWidth - marginX, 78, { align: 'right' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.text('Calidad artesanal para tu ritual diario', pageWidth - marginX, 100, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('www.matetierra.com  |  matetierraa@gmail.com  |  3758-540393', pageWidth / 2, 106, { align: 'center' });

    doc.setDrawColor(210, 226, 216);
    doc.setLineWidth(1);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 28;

    const contentWidth = pageWidth - marginX * 2;
    const cardGap = 20;
    const infoCardWidth = (contentWidth - cardGap) / 2;
    const infoCardHeight = 108;

    const now = new Date();
    const totalItems = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);

    doc.setFillColor(247, 251, 244);
    doc.setDrawColor(210, 226, 216);
    doc.roundedRect(marginX, cursorY, infoCardWidth, infoCardHeight, 14, 14, 'FD');
    doc.roundedRect(marginX + infoCardWidth + cardGap, cursorY, infoCardWidth, infoCardHeight, 14, 14, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(32, 48, 38);
    doc.text('Detalle del pedido', marginX + 22, cursorY + 26);
    doc.text('Resumen rápido', marginX + infoCardWidth + cardGap + 22, cursorY + 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(72, 83, 77);

    const leftTextX = marginX + 22;
    let leftLineY = cursorY + 48;
    doc.text(`Fecha de generación: ${now.toLocaleDateString('es-AR')}`, leftTextX, leftLineY);
    leftLineY += 18;
    doc.text(`Hora: ${now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`, leftTextX, leftLineY);
    leftLineY += 18;
    doc.text(`Cliente: Mostrador`, leftTextX, leftLineY);
    leftLineY += 18;
    doc.text('Documento válido como comprobante interno', leftTextX, leftLineY);

    const rightTextX = marginX + infoCardWidth + cardGap + 22;
    let rightLineY = cursorY + 48;
    doc.text(`Productos únicos: ${this.cartItems.length}`, rightTextX, rightLineY);
    rightLineY += 18;
    doc.text(`Unidades totales: ${totalItems}`, rightTextX, rightLineY);
    rightLineY += 18;
    doc.text(`Subtotal: ${this.formatCurrency(this.getSubtotal())}`, rightTextX, rightLineY);
    rightLineY += 18;
    doc.text(`Ahorro acumulado: ${this.formatCurrency(this.getTotalSavings())}`, rightTextX, rightLineY);

    cursorY += infoCardHeight + 32;

    if (!this.cartItems.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(120, 130, 124);
      doc.text('No registramos productos en el carrito en este momento. Agregá artículos para generar el PDF.', marginX, cursorY);
      drawFooter();
      doc.save('mate-tierra-carrito.pdf');
      return;
    }

    const tableData = this.cartItems.map(item => {
      const originalPrice = this.getOriginalPrice(item);
      const discount = this.getDiscount(item);
      return [
        item.name,
        item.quantity.toString(),
        this.formatCurrency(originalPrice),
        discount > 0 ? `${discount.toFixed(0)}%` : '-',
        this.formatCurrency(item.price),
        this.formatCurrency(item.price * item.quantity)
      ];
    });

    (doc as any).autoTable({
      head: [['Producto', 'Cantidad', 'Precio lista', 'Descuento', 'Precio unitario', 'Subtotal']],
      body: tableData,
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      styles: {
        fontSize: 10,
        font: 'helvetica',
        lineWidth: 0.5,
        lineColor: [228, 238, 231],
        textColor: [36, 45, 38],
        cellPadding: { top: 6, right: 10, bottom: 6, left: 10 },
        valign: 'middle'
      },
      headStyles: {
        fillColor: [36, 102, 58],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        cellPadding: { top: 8, right: 10, bottom: 8, left: 10 }
      },
      alternateRowStyles: {
        fillColor: [242, 247, 244]
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 220 },
        1: { halign: 'center', cellWidth: 70 },
        2: { halign: 'right', cellWidth: 110 },
        3: { halign: 'center', cellWidth: 90 },
        4: { halign: 'right', cellWidth: 110 },
        5: { halign: 'right', cellWidth: 120 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || cursorY;
    cursorY = finalY + 28;

    const summaryHeight = this.getTotalSavings() > 0 ? 156 : 140;
    const footerReserve = 90;

    if (cursorY + summaryHeight + footerReserve > pageHeight) {
      drawFooter();
      doc.addPage('a4', 'landscape');
      pageWidth = doc.internal.pageSize.getWidth();
      pageHeight = doc.internal.pageSize.getHeight();

      doc.setFillColor(247, 251, 244);
      doc.rect(0, 0, pageWidth, 80, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(32, 48, 38);
      doc.text('Resumen financiero (continuación)', marginX, 50);
      doc.setDrawColor(210, 226, 216);
      doc.line(marginX, 60, pageWidth - marginX, 60);

      cursorY = 96;
    }

    doc.setFillColor(233, 242, 236);
    doc.setDrawColor(206, 222, 212);
    doc.roundedRect(marginX, cursorY, contentWidth, summaryHeight, 16, 16, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(32, 48, 38);
    doc.text('Resumen financiero', marginX + 28, cursorY + 32);

    const summaryLabelX = marginX + 32;
    const summaryValueX = marginX + contentWidth - 32;
    let summaryLine = cursorY + 60;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(70, 82, 76);
    doc.text('Subtotal sin descuentos', summaryLabelX, summaryLine);
    doc.text(this.formatCurrency(this.getSubtotal()), summaryValueX, summaryLine, { align: 'right' });
    summaryLine += 22;

    if (this.getTotalSavings() > 0) {
      doc.setTextColor(102, 114, 108);
      doc.text('Ahorro total aplicado', summaryLabelX, summaryLine);
      doc.text(`-${this.formatCurrency(this.getTotalSavings())}`, summaryValueX, summaryLine, { align: 'right' });
      summaryLine += 22;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(24, 52, 36);
    doc.text('Total a pagar', summaryLabelX, summaryLine);
    doc.text(this.formatCurrency(this.getTotal()), summaryValueX, summaryLine, { align: 'right' });
    summaryLine += 32;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(102, 114, 108);
    const footnote = doc.splitTextToSize(
      'Recordá conservar este documento como soporte interno. Los valores están expresados en pesos argentinos (ARS).',
      contentWidth - 64
    );
    doc.text(footnote, summaryLabelX, summaryLine, { align: 'left' });

    drawFooter();

    doc.save('mate-tierra-carrito.pdf');
  }

  private formatCurrency(amount: number): string {
    return this.currencyFormatter.format(amount);
  }

  private async getLogoImage(): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' | 'WEBP' } | null> {
    if (this.logoImage !== null) {
      return this.logoImage;
    }

    const logoSource = this.resolveLogoSource();
    if (!logoSource) {
      this.logoImage = null;
      return null;
    }

    try {
      const response = await fetch(logoSource, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Failed to fetch logo: ${response.status}`);
      }

      const blob = await response.blob();
      const detectedFormat = this.detectImageFormat(blob.type);
      const dataUrl = await this.blobToDataUrl(blob);
      const derivedFormat = detectedFormat ?? this.extractFormatFromDataUrl(dataUrl);

      if (!derivedFormat) {
        throw new Error(`Unsupported logo mime type: ${blob.type || 'unknown'}`);
      }

      this.logoImage = {
        dataUrl,
        format: derivedFormat
      };

      return this.logoImage;
    } catch (error) {
      console.error('Error preparing logo for PDF:', error);
      this.logoImage = null;
      return null;
    }
  }

  private resolveLogoSource(): string | null {
    const source = this.logoUrl?.trim() || 'assets/images/yerba-mate-leaves.png';
    if (!source) {
      return null;
    }
    if (/^https?:/i.test(source)) {
      return source;
    }
    const normalized = source.startsWith('/') ? source.slice(1) : source;
    return `${window.location.origin}/${normalized}`;
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to data URL'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading image blob'));
      reader.readAsDataURL(blob);
    });
  }

  private detectImageFormat(mimeType: string | null | undefined): 'PNG' | 'JPEG' | 'WEBP' | null {
    if (!mimeType) {
      return null;
    }

    const normalized = mimeType.toLowerCase();
    if (normalized.includes('png')) {
      return 'PNG';
    }
    if (normalized.includes('jpeg') || normalized.includes('jpg')) {
      return 'JPEG';
    }
    if (normalized.includes('webp')) {
      return 'WEBP';
    }
    return null;
  }

  private extractFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' | null {
    const match = /^data:image\/(png|jpeg|jpg|webp)/i.exec(dataUrl);
    if (!match) {
      return null;
    }

    const type = match[1].toLowerCase();
    if (type === 'png') {
      return 'PNG';
    }
    if (type === 'jpeg' || type === 'jpg') {
      return 'JPEG';
    }
    if (type === 'webp') {
      return 'WEBP';
    }

    return null;
  }
}