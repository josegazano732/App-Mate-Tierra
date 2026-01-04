import { TestBed } from '@angular/core/testing';
import { SalesService, PaymentSplit, Sale, SaleItem } from './sales.service';
import { SupabaseService } from './supabase.service';
import { of, throwError } from 'rxjs';

const mockSupabaseClient = {
  from: jasmine.createSpy().and.callFake((table: string) => mockFrom(table))
};

let fromTable = '';
let mockFrom: any;

const mockSupabaseService = {
  client: mockSupabaseClient
};

describe('SalesService', () => {
  let service: SalesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SalesService,
        { provide: SupabaseService, useValue: mockSupabaseService }
      ]
    });
    service = TestBed.inject(SalesService);
  });

  beforeEach(() => {
    // Reset spies and mocks before each test
    mockSupabaseClient.from.calls.reset();
    mockFrom = (table: string) => {
      fromTable = table;
      return mockFromObj;
    };
  });

  // Mocks for chained supabase queries
  let mockFromObj: any;

  describe('getRecentCompletedSales', () => {
    it('debe retornar ventas recientes completadas', (done) => {
      const mockSales: Sale[] = [{
        id: '1', user_id: 'u1', payment_method: 'cash', total_amount: 100, status: 'completed', created_at: '', updated_at: '', items: [{ id: 'i1', sale_id: '1', product_id: 'p1', quantity: 1, unit_price: 100, original_price: 100, created_at: '', product: { name: 'Producto' } }]
      }];
      mockFromObj = {
        select: () => mockFromObj,
        eq: () => mockFromObj,
        order: () => mockFromObj,
        limit: () => Promise.resolve({ data: mockSales, error: null })
      };
      service.getRecentCompletedSales(1).subscribe(sales => {
        expect(sales.length).toBe(1);
        expect(sales[0].items![0].product_name).toBe('Producto');
        done();
      });
    });
    it('debe manejar error de supabase', (done) => {
      mockFromObj = {
        select: () => mockFromObj,
        eq: () => mockFromObj,
        order: () => mockFromObj,
        limit: () => Promise.resolve({ data: null, error: { message: 'fail' } })
      };
      service.getRecentCompletedSales(1).subscribe({
        error: (err) => {
          expect(err).toBeTruthy();
          done();
        }
      });
    });
  });

  describe('getAllSales', () => {
    it('debe retornar todas las ventas', (done) => {
      const mockSales: Sale[] = [{
        id: '1', user_id: 'u1', payment_method: 'cash', total_amount: 100, status: 'completed', created_at: '', updated_at: '', items: [{ id: 'i1', sale_id: '1', product_id: 'p1', quantity: 1, unit_price: 100, original_price: 100, created_at: '', product: { name: 'Producto' } }]
      }];
      mockFromObj = {
        select: () => mockFromObj,
        order: () => Promise.resolve({ data: { sales: mockSales, total: 1 }, error: null })
      };
      service.getAllSales().subscribe(result => {
        expect(result.sales.length).toBe(1);
        expect(result.sales[0].items![0].product_name).toBe('Producto');
        expect(result.total).toBe(1);
        done();
      });
    });
  });

  describe('createSale', () => {
    it('debe crear una venta y sus items', (done) => {
      const items = [{ id: 'p1', price: 100, quantity: 1, originalPrice: 100 }];
      const paymentSplits: PaymentSplit[] = [{ method: 'cash', amount: 100 }];
      const saleData = { id: 's1', user_id: 'u1', payment_method: 'cash', total_amount: 100, status: 'completed', created_at: '', updated_at: '' };
      // Mock insert sale
      mockFromObj = {
        insert: () => mockFromObj,
        select: () => mockFromObj,
        single: () => Promise.resolve({ data: saleData, error: null })
      };
      // Mock insert sale_items
      const saleItemsObj = {
        from: jasmine.createSpy().and.returnValue({
          insert: () => Promise.resolve({})
        })
      };
      mockSupabaseClient.from.and.callFake((table: string) => {
        if (table === 'sales') return mockFromObj;
        if (table === 'sale_items') return saleItemsObj.from(table);
        return null;
      });
      service.createSale('u1', items as any, 'cash', paymentSplits).subscribe(sale => {
        expect(sale.id).toBe('s1');
        done();
      });
    });
    it('debe fallar si el método de pago es inválido', (done) => {
      const items = [{ id: 'p1', price: 100, quantity: 1 }];
      const paymentSplits: PaymentSplit[] = [{ method: 'cash', amount: 100 }];
      service.createSale('u1', items as any, 'CASH$', paymentSplits).subscribe({
        error: (err) => {
          expect(err.message).toContain('Invalid payment method format');
          done();
        }
      });
    });
    it('debe fallar si el total de splits no coincide', (done) => {
      const items = [{ id: 'p1', price: 100, quantity: 1 }];
      const paymentSplits: PaymentSplit[] = [{ method: 'cash', amount: 50 }];
      service.createSale('u1', items as any, 'cash', paymentSplits).subscribe({
        error: (err) => {
          expect(err.message).toContain('Payment splits total must match items total');
          done();
        }
      });
    });
    it('debe manejar error al crear venta', (done) => {
      const items = [{ id: 'p1', price: 100, quantity: 1 }];
      const paymentSplits: PaymentSplit[] = [{ method: 'cash', amount: 100 }];
      mockFromObj = {
        insert: () => mockFromObj,
        select: () => mockFromObj,
        single: () => Promise.resolve({ data: null, error: { message: 'fail' } })
      };
      mockSupabaseClient.from.and.callFake(() => mockFromObj);
      service.createSale('u1', items as any, 'cash', paymentSplits).subscribe({
        error: (err) => {
          expect(err).toBeTruthy();
          done();
        }
      });
    });
  });

  describe('cancelSale', () => {
    it('debe cancelar una venta', (done) => {
      mockFromObj = {
        update: () => mockFromObj,
        eq: () => Promise.resolve({ error: null })
      };
      mockSupabaseClient.from.and.callFake(() => mockFromObj);
      service.cancelSale('s1').subscribe(result => {
        expect(result).toBeUndefined();
        done();
      });
    });
    it('debe manejar error al cancelar', (done) => {
      mockFromObj = {
        update: () => mockFromObj,
        eq: () => Promise.resolve({ error: { message: 'fail' } })
      };
      mockSupabaseClient.from.and.callFake(() => mockFromObj);
      service.cancelSale('s1').subscribe({
        error: (err) => {
          expect(err).toBeTruthy();
          done();
        }
      });
    });
  });

  describe('handleError', () => {
    it('debe manejar error 429', (done) => {
      service['handleError']({ status: 429 }).subscribe({
        error: (err) => {
          expect(err.message).toContain('Too many requests');
          done();
        }
      });
    });
    it('debe manejar error de permisos', (done) => {
      service['handleError']({ code: '42501' }).subscribe({
        error: (err) => {
          expect(err.message).toContain('permission');
          done();
        }
      });
    });
    it('debe manejar error de row-level security', (done) => {
      service['handleError']({ message: 'row-level security' }).subscribe({
        error: (err) => {
          expect(err.message).toContain('permission');
          done();
        }
      });
    });
    it('debe manejar error genérico', (done) => {
      service['handleError']({}).subscribe({
        error: (err) => {
          expect(err.message).toContain('Error creating sale');
          done();
        }
      });
    });
  });
});
