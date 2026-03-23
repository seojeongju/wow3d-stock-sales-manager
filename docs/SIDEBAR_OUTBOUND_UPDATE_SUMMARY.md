# Sidebar Submenu Implementation for Outbound Management

## Overview
Implemented a collapsible submenu for the "Outbound Management" (출고 관리) section in the sidebar, providing direct access to:
- Simple Outbound Registration (간편 출고 등록)
- Outbound History (출고 이력 조회)
- Warehouse Management (창고별 관리)

## Changes
1.  **Frontend Logic (`public/static/js/outbound.js`)**:
    - Updated `renderOutboundPage` to accept an `initialTab` argument (defaulting to 'reg').
    - Passed this argument to `switchOutboundTab` to enable direct tab loading.

2.  **Frontend Logic (`public/static/app.js`)**:
    - Updated `loadPage`'s outbound case to pass the `subPage` (tab) argument to `renderOutboundPage`.

3.  **Backend/HTML (`src/index.tsx`)**:
    - Replaced the single "Outbound Management" link with a `nav-item-group`.
    - Added a toggle button and a `nav-submenu` containing the 3 links with corresponding `data-tab` attributes ('reg', 'hist', 'warehouse').

## Verification
- Click on "출고 관리" to toggle the submenu.
- Click on "간편 출고 등록" to go to Outbound page -> Registration tab.
- Click on "출고 이력 조회" to go to Outbound page -> History tab.
- Click on "창고별 관리" to go to Outbound page -> Warehouse tab.
