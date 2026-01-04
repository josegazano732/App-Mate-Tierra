import { Component, Input } from '@angular/core';

type JsPDFConstructor = typeof import('jspdf')['default'];

@Component({
  selector: 'app-wholesale-price-list-pdf-generator',
  template: ''
})
export class WholesalePriceListPdfGeneratorComponent {
  @Input() products: any[] = [];
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
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Lista de Precios Mayorista', 14, 20);

    // Add date
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

    // Create table data
    const tableData = this.products.map(product => [
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
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [60, 156, 54],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
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
}