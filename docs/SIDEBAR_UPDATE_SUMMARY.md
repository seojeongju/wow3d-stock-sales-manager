# Sidebar Submenu Implementation for Sales Management

## Overview
Implemented a collapsible submenu for the "Sales Management" (판매 관리) section in the sidebar, providing direct access to:
- POS (판매등록)
- Order/Delivery Management (주문/배송 관리)
- Return/Exchange Management (반품/교환 관리)

## Changes
1.  **Backend/HTML (`src/index.tsx`)**:
    - Replaced the single "Sales Management" link with a `nav-item-group`.
    - Added a toggle button and a `nav-submenu` containing the 3 links.
    - Added `data-page="sales"` and `data-tab="..."` attributes to the new links.

2.  **Frontend Logic (`public/static/app.js`)**:
    - Updated `setupNavigation` to handle `data-tab` attributes.
    - Updated `loadPage` to accept a `subPage` (tab) argument.
    - Updated `loadSales` to accept an `initialTab` argument and switch to it immediately upon loading.

## Verification
- Click on "판매 관리" to toggle the submenu.
- Click on "POS (판매등록)" to go to Sales page -> POS tab.
- Click on "주문/배송 관리" to go to Sales page -> Orders tab.
- Click on "반품/교환 관리" to go to Sales page -> Claims tab.
