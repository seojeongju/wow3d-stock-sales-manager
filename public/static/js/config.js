// API Base URL
const API_BASE = '/api';
window.API_BASE = API_BASE; // 명시적 전역 할당

// 인증 체크 (로그인 페이지 등 예외 처리 필요하지만 기존 로직 유지)
const token = localStorage.getItem('token');
// 현재 페이지가 login이나 register가 아닐 때 체크해야 함.
// 하지만 app.js는 spa처럼 동작하므로 단순 체크.
if (!token && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
    window.location.href = '/login';
}

// Axios 인터셉터 설정
if (window.axios) {
    axios.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Super Admin Impersonation
        const impersonatedTenantId = localStorage.getItem('impersonatedTenantId');
        if (impersonatedTenantId) {
            config.headers['X-Tenant-ID'] = impersonatedTenantId;
        }
        return config;
    });

    axios.interceptors.response.use(response => {
        return response;
    }, error => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    });
}
