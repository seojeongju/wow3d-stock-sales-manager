# Stock Management Sidebar and Tab Update Summary

## Overview
Refactored the Stock Management section to align with the tabbed interface structure of other management pages (Sales, Outbound, Purchases).

## Changes

### 1. Sidebar Navigation (`src/index.tsx`)
- Replaced the single "Stock Management" (`재고 관리`) link with a collapsible submenu.
- Added two sub-items:
  - **Stock Movements** (`재고 이동 내역`): Links to `data-page="stock"` and `data-tab="movements"`.
  - **Stock Levels** (`창고별 재고 현황`): Links to `data-page="stock"` and `data-tab="levels"`.

### 2. Frontend Logic (`public/static/app.js`)
- **`loadPage` Function**: 
  - Updated the `stock` case to accept a `subPage` argument (tab) and call `loadStock(content, subPage || 'movements')`.
- **`loadStock` Function**:
  - Refactored to accept an `initialTab` argument.
  - Implemented a tabbed layout shell with "Movements" and "Levels" tabs.
  - Added `switchStockTab` function to handle tab switching dynamically.
  - Retained global action buttons (In, Out, Adjust, Transfer) in the header.
- **New Functions**:
  - `renderStockMovementsTab(container)`: Fetches movements, products, warehouses and renders the history table.
  - `renderStockLevelsTab(container)`: Fetches warehouses and sets up the stock level view (initially loading all).
  - `filterStockMovements()`: Updated to work within the new tab structure.
- **Deprecation**:
  - Renamed original `loadStock` to `loadStock_old`.
  - Renamed original `filterStockMovements` to `filterStockMovements_old`.

## Features
- **Consistent UI**: Matches the look and feel of Sales and Outbound management pages.
- **Deep Linking**: Sidebar links now open specific tabs directly.
- **Dynamic Loading**: Tab content is loaded on demand (though currently some data is pre-fetched or re-fetched for simplicity).
- **Sticky Headers**: Added sticky headers to the movements table for better usability.
