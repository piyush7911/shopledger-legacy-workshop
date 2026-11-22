const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');
const reports = require('../lib/reports');

function mixedHsnItems() {
  return [
    {
      id: 1,
      name: 'Indrayani Basmati Rice 5kg',
      sku: 'GRN-001',
      hsn: '1006',
      price: 640,
      qty: 1
    },
    {
      id: 4,
      name: 'Cold-Pressed Sunflower Oil 1L',
      sku: 'OIL-001',
      hsn: '1512',
      price: 190,
      qty: 2
    }
  ];
}

function storedOrder(overrides) {
  return Object.assign({
    id: 1002,
    date: '05/01/2022',
    customer: 'Anil Kulkarni',
    paymentMode: 'upi',
    status: 'completed',
    items: mixedHsnItems(),
    coupon: 'SAVE10',
    subtotal: 1020,
    discount: 102,
    tax: 45.9,
    total: 963.9
  }, overrides || {});
}

test('correct behaviour: invoice figures match the customer-billed pricing figures', () => {
  const order = storedOrder();
  const priced = pricing.computeTotals(order.items, order.coupon);
  const figures = invoice.computeInvoiceFigures(order);

  assert.equal(figures.subtotal, priced.subtotal);
  assert.equal(figures.discount, priced.discount);
  assert.equal(figures.tax, priced.tax);
  assert.equal(figures.cgst, priced.cgst);
  assert.equal(figures.sgst, priced.sgst);
  assert.equal(figures.total, priced.total);
  assert.deepStrictEqual(figures.rows.map((row) => row.gstPercent), [5, 5]);
});

test('CURRENT BEHAVIOUR: pricing applies HSN GST after proportional coupon discount', () => {
  const totals = pricing.computeTotals(mixedHsnItems(), 'SAVE10');

  assert.deepStrictEqual({
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
    cgst: totals.cgst,
    sgst: totals.sgst
  }, {
    subtotal: 1020,
    discount: 102,
    tax: 45.9,
    total: 963.9,
    cgst: 22.95,
    sgst: 22.95
  });
});

test('correct behaviour: invoice uses HSN GST rates for stored lines', () => {
  const figures = invoice.computeInvoiceFigures(storedOrder());

  assert.equal(figures.tax, 45.9);
  assert.deepStrictEqual(figures.rows.map((row) => row.gstPercent), [5, 5]);
});

test('correct behaviour: invoice percentage coupon matches pricing discount', () => {
  const figures = invoice.computeInvoiceFigures(storedOrder());

  assert.equal(figures.discount, 102);
  assert.equal(figures.total, 963.9);
});

test('correct behaviour: invoice total matches the stored customer-billed total', () => {
  const order = storedOrder();
  const figures = invoice.computeInvoiceFigures(order);

  assert.equal(order.total, 963.9);
  assert.equal(figures.total, 963.9);
  assert.equal(Number((figures.total - order.total).toFixed(2)), 0);
});

test('correct behaviour: flat coupon invoice total matches pricing total', () => {
  const order = storedOrder({
    id: 1003,
    items: [
      {
        id: 7,
        name: 'Pasteurized Table Butter 500g',
        sku: 'DRY-002',
        hsn: '0405',
        price: 260,
        qty: 1
      },
      {
        id: 8,
        name: 'Assam CTC Masala Chai 250g',
        sku: 'BEV-001',
        hsn: '0902',
        price: 140,
        qty: 1
      }
    ],
    coupon: 'FLAT50',
    subtotal: 400,
    discount: 50,
    tax: 49.35,
    total: 399.35
  });

  const figures = invoice.computeInvoiceFigures(order);

  assert.equal(figures.tax, 49.35);
  assert.equal(figures.discount, 50);
  assert.equal(figures.total, 399.35);
  assert.equal(order.total, 399.35);
});

test('correct behaviour: GST reconciliation reports matching active invoices and skips cancelled orders', () => {
  const db = {
    orders: [
      storedOrder(),
      storedOrder({
        id: 1004,
        status: 'cancelled',
        total: 0,
        tax: 0
      })
    ]
  };

  const result = reports.getGstReconciliation(db);

  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.totalDelta, 0);
  assert.equal(result.rows[0].matched, true);
  assert.equal(result.rows[0].invoiceTax, 45.9);
  assert.equal(result.rows[0].ledgerTax, 45.9);
});
