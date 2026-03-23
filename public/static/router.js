
// ========================================
// 페이지 라우팅
// ========================================

// 페이지 전환 처리
document.addEventListener('DOMContentLoaded', function () {
    // 네비게이션 링크에 이벤트 리스너 추가
    const navLinks = document.querySelectorAll('[data-page]');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');

            // 모든 링크에서 active 클래스 제거
            navLinks.forEach(l => l.classList.remove('active'));
            // 현재 링크에 active 클래스 추가
            this.classList.add('active');

            // 페이지 렌더링
            renderPage(page);
        });
    });

    // 초기 페이지 로드 (대시보드)
    renderPage('dashboard');
});

function renderPage(page) {
    switch (page) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'sales':
            renderSalesPage();
            break;
        case 'outbound':
            renderOutboundPage();
            break;
        case 'customers':
            renderCustomersPage();
            break;
        case 'products':
            renderProductsPage();
            break;
        case 'stock':
            renderStockPage();
            break;
        case 'claims':
            renderClaimsPage();
            break;
        case 'settings':
            renderSettingsPage();
            break;
        default:
            renderDashboard();
    }
}
