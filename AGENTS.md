# Repository Guidelines

## Stack

ShopLedger is a CommonJS Node.js application using Express 4 and `body-parser`. The frontend is vanilla HTML, CSS, and JavaScript under `public/`. Persistent state is stored in `data/db.json`; there is no database server or configured test framework.

## Module Map

- `server.js` — creates the Express app, serves `public/`, mounts routers, and renders invoices.
- `routes/` — HTTP handlers for products, orders, customers, and reports.
- `lib/` — order, inventory, pricing, coupon, tax, ledger, report, invoice, date, and JSON-store logic.
- `config.js` — port, shop, tax, inventory, coupon, and admin settings.
- `public/` — POS and reporting UI.
- `data/db.json` — products, orders, customers, settlements, and audit data.

## Commands

```bash
npm install       # install the declared dependencies
npm start         # run the server on PORT or 3000
npm test          # currently exits because no tests are configured
```

## Contribution Rules

- Write characterization tests before changing behaviour.
- Change only the module the ticket is about.
- Tests must never read from or write to `data/db.json`; use isolated fixtures or test data instead.
- Add no dependencies. Keep `package.json` and `package-lock.json` unchanged unless the ticket explicitly requires dependency metadata work.
