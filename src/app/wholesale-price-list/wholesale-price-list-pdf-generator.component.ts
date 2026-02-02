import { Component, Input } from '@angular/core';

type JsPDFConstructor = typeof import('jspdf')['default'];

@Component({
  selector: 'app-wholesale-price-list-pdf-generator',
  template: ''
})
export class WholesalePriceListPdfGeneratorComponent {
  @Input() products: any[] = [];
  @Input() logoUrl: string | null = null;
  private pdfLib?: Promise<JsPDFConstructor>;

  private loadPdfLib(): Promise<JsPDFConstructor> {
    if (!this.pdfLib) {
      this.pdfLib = Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]).then(([jspdfModule]) => jspdfModule.default);
    }
    return this.pdfLib;
  }

  async generatePdf() {
    const jsPDF = await this.loadPdfLib();
    const doc = new jsPDF({ orientation: 'landscape' });

    const headerStartY = 12;
    const titleX = 14;
    const titleY = 20;
    const logoWidth = 36;
    const logoHeight = 18;
    const pageWidth = doc.internal.pageSize.width;

    const logoDataUrl = await this.resolveLogoDataUrl();
    if (logoDataUrl) {
      const logoFormat = this.getImageFormat(logoDataUrl);
      if (logoFormat) {
        try {
          doc.addImage(
            logoDataUrl,
            logoFormat,
            pageWidth - logoWidth - 14,
            headerStartY - 2,
            logoWidth,
            logoHeight
          );
        } catch {
          // Ignore logo rendering errors to avoid blocking PDF creation
        }
      }
    }

    // Add title
    doc.setFontSize(20);
    doc.text('Lista de Precios Mayorista', titleX, titleY);

    const imageByProductId = new Map<string, string>();
    await Promise.all(
      this.products.map(async (product) => {
        const imageUrl = this.getProductImageUrl(product);
        if (!imageUrl) return;
        const resolved = this.resolveAssetUrl(imageUrl);
        const dataUrl = await this.safeLoadImage(resolved);
        if (dataUrl) {
          imageByProductId.set(product.id, dataUrl);
          return;
        }

        if (this.isSameOrigin(resolved)) {
          const imageElement = await this.safeLoadImageElement(resolved);
          if (imageElement) {
            const canvasDataUrl = this.imageElementToDataUrl(imageElement);
            if (canvasDataUrl) {
              imageByProductId.set(product.id, canvasDataUrl);
            }
          }
        }
      })
    );

    // Create table data
    const tableData = this.products.map(product => [
      '',
      product.name,
      product.category_name,
      `$${product.price.toFixed(2)}`,
      `${product.tier1Quantity}+`,
      `$${product.tier1Price.toFixed(2)}`,
      `${product.tier2Quantity}+`,
      `$${product.tier2Price.toFixed(2)}`
    ]);

    // Add table
    (doc as any).autoTable({
      head: [
        [
          'Imagen',
          'Producto',
          'Categoría',
          'Precio Regular',
          'Cantidad Nivel 1',
          'Precio Nivel 1',
          'Cantidad Nivel 2',
          'Precio Nivel 2'
        ]
      ],
      body: tableData,
      showHead: 'firstPage',
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        minCellHeight: 18,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 24 }
      },
      headStyles: {
        fillColor: [60, 156, 54],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didDrawCell: (data: any) => {
        if (data.section !== 'body' || data.column.index !== 0) {
          return;
        }

        const product = this.products[data.row.index];
        if (!product) return;
        const imageData = imageByProductId.get(product.id);
        if (!imageData) return;

        const format = this.getImageFormat(imageData);
        if (!format) return;

        const padding = 2;
        const size = Math.min(data.cell.width - padding * 2, data.cell.height - padding * 2);
        const x = data.cell.x + padding;
        const y = data.cell.y + (data.cell.height - size) / 2;
        try {
          doc.addImage(imageData, format, x, y, size, size);
        } catch {
          // Ignore per-cell image errors
        }
      }
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    doc.save('lista-precios-mayorista.pdf');
  }

  private async safeLoadImage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        return null;
      }
      const blob = await response.blob();
      return await this.blobToSupportedDataUrl(blob);
    } catch {
      return null;
    }
  }

  private async blobToSupportedDataUrl(blob: Blob): Promise<string | null> {
    const type = blob.type.toLowerCase();
    if (type === 'image/png' || type === 'image/jpeg' || type === 'image/jpg') {
      return await this.blobToDataUrl(blob);
    }
    return await this.convertBlobToPngDataUrl(blob);
  }

  private blobToDataUrl(blob: Blob): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }

  private async convertBlobToPngDataUrl(blob: Blob): Promise<string | null> {
    try {
      if ('createImageBitmap' in window) {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context) return null;
        context.drawImage(bitmap, 0, 0);
        return canvas.toDataURL('image/png');
      }

      const objectUrl = URL.createObjectURL(blob);
      const imageElement = await this.safeLoadImageElement(objectUrl);
      URL.revokeObjectURL(objectUrl);
      if (!imageElement) return null;
      return this.imageElementToDataUrl(imageElement);
    } catch {
      return null;
    }
  }

  private getImageFormat(dataUrl: string): 'PNG' | 'JPEG' | null {
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);/i);
    if (!match) return null;
    const format = match[1].toLowerCase();
    return format === 'png' ? 'PNG' : 'JPEG';
  }

  private getProductImageUrl(product: any): string | null {
    if (typeof product?.image === 'string' && product.image.trim()) {
      return product.image.trim();
    }
    if (Array.isArray(product?.image_urls) && product.image_urls.length > 0) {
      return product.image_urls[0];
    }
    return null;
  }

  private async resolveLogoDataUrl(): Promise<string | null> {
    const candidates = ['assets/images/logo.png', this.logoUrl];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const resolved = this.resolveAssetUrl(candidate);
      const dataUrl = await this.safeLoadImage(resolved);
      if (dataUrl) return dataUrl;

      if (this.isSameOrigin(resolved)) {
        const imageElement = await this.safeLoadImageElement(resolved);
        if (imageElement) {
          const canvasDataUrl = this.imageElementToDataUrl(imageElement);
          if (canvasDataUrl) return canvasDataUrl;
        }
      }
    }
    return null;
  }

  private resolveAssetUrl(path: string): string {
    try {
      const baseHref = document.querySelector('base')?.href || window.location.origin + '/';
      return new URL(path, baseHref).toString();
    } catch {
      return path;
    }
  }

  private isSameOrigin(url: string): boolean {
    try {
      const resolved = new URL(url, window.location.href);
      return resolved.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  private safeLoadImageElement(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  private imageElementToDataUrl(image: HTMLImageElement): string | null {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.drawImage(image, 0, 0);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }
}