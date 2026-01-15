# Sidebar Submenu Implementation for Purchases/Orders Management

## Overview
Implemented a collapsible submenu for the "Purchases/Order Management" (입고/발주 관리) section in the sidebar, providing direct access to:
- Purchase Order Management (발주 관리)
- Supplier Management (공급사 관리)

## Changes
1.  **Frontend Logic (`public/static/js/purchases.js`)**:
    - Updated `loadPurchasesPage` function to accept an `initialTab` argument (defaulting to 'purchases').
    - Passed this argument to `switchPurchaseTab` to enable direct tab loading.

2.  **Frontend Logic (`public/static/app.js`)**:
    - Updated `loadPage`'s purchases case to pass the `subPage` (tab) argument to `loadPurchasesPage`.

3.  **Backend/HTML (`src/index.tsx`)**:
    - Replaced the single "Purchases/Orders" link with a `nav-item-group`.
    - Added a toggle button and a `nav-submenu` containing the 2 links with corresponding `data-tab` attributes ('purchases', 'suppliers').

## Verification
- Click on "입고/발주 관리" to toggle the submenu.
- Click on "발주 관리" to go to Purchases page -> Purchase Orders tab.
- Click on "공급사 관리" to go to Purchases page -> Suppliers tab.
