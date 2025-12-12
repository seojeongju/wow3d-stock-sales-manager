import { Hono, Context } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings, Variables } from './types'
import { tenantMiddleware } from './middleware/tenant'

// API 라우트 import
import productsRouter from './routes/products'
import customersRouter from './routes/customers'
import salesRouter from './routes/sales'
import stockRouter from './routes/stock'
import dashboardRouter from './routes/dashboard'
import claimsRouter from './routes/claims'
import usersRouter from './routes/users'
import outboundRouter from './routes/outbound'
import warehouseRouter from './routes/warehouse'
import authRouter from './routes/auth'
import subscriptionRouter from './routes/subscription'
import importExportRouter from './routes/import-export'
import settingsRouter from './routes/settings'
import superAdminRouter from './routes/super-admin'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// CORS 활성화
app.use('/api/*', cors())

// 멀티테넌트 미들웨어 적용
app.use('/api/*', tenantMiddleware)

// API 라우트 등록
app.route('/api/auth', authRouter)
app.route('/api/subscription', subscriptionRouter)
app.route('/api/import-export', importExportRouter)
app.route('/api/products', productsRouter)
app.route('/api/customers', customersRouter)
app.route('/api/sales', salesRouter)
app.route('/api/stock', stockRouter)
app.route('/api/dashboard', dashboardRouter)
app.route('/api/claims', claimsRouter)
app.route('/api/users', usersRouter)
app.route('/api/outbound', outboundRouter)
app.route('/api/warehouses', warehouseRouter)
app.route('/api/settings', settingsRouter)
app.route('/api/super-admin', superAdminRouter)
app.get('/login', (c: Context) => {
    return c.html(`<!DOCTYPE html>
<html lang="ko">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인 - 재고/판매 관리 시스템</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
</head>

<body class="bg-slate-50 min-h-screen font-sans text-slate-900">
    <div class="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">

        <!-- Login Container -->
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden mb-20 relative z-10">
            <div class="p-8">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-teal-600 mb-2">Stock Manager</h1>
                    <p class="text-slate-500">재고와 판매를 한 곳에서 관리하세요</p>
                </div>

                <!-- 탭 버튼 -->
                <div class="flex mb-6 border-b border-slate-200">
                    <button onclick="switchTab('login')" id="loginTabBtn"
                        class="flex-1 py-3 text-sm font-medium text-teal-600 border-b-2 border-teal-600 focus:outline-none transition-colors">로그인</button>
                    <button onclick="switchTab('register')" id="registerTabBtn"
                        class="flex-1 py-3 text-sm font-medium text-slate-500 hover:text-teal-600 focus:outline-none transition-colors">회원가입</button>
                </div>

                <!-- 로그인 폼 -->
                <form id="loginForm" onsubmit="handleLogin(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                        <div class="relative">
                            <i class="fas fa-envelope absolute left-3 top-3 text-slate-400"></i>
                            <input type="email" id="loginEmail" required
                                class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                                placeholder="example@company.com">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
                        <div class="relative">
                            <i class="fas fa-lock absolute left-3 top-3 text-slate-400"></i>
                            <input type="password" id="loginPassword" required
                                class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                                placeholder="••••••••">
                        </div>
                    </div>
                    <button type="submit"
                        class="w-full bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm mt-2">
                        로그인
                    </button>
                </form>

                <!-- 회원가입 폼 -->
                <form id="registerForm" onsubmit="handleRegister(event)" class="space-y-4 hidden">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                        <div class="relative">
                            <i class="fas fa-envelope absolute left-3 top-3 text-slate-400"></i>
                            <input type="email" id="regEmail" required
                                class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                                placeholder="example@company.com">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
                        <div class="relative">
                            <i class="fas fa-lock absolute left-3 top-3 text-slate-400"></i>
                            <input type="password" id="regPassword" required
                                class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                                placeholder="••••••••">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">이름</label>
                            <div class="relative">
                                <i class="fas fa-user absolute left-3 top-3 text-slate-400"></i>
                                <input type="text" id="regName" required
                                    class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                                    placeholder="홍길동">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">요금제 선택</label>
                            <div class="relative">
                                <i class="fas fa-rocket absolute left-3 top-3 text-slate-400"></i>
                                <select id="regPlan"
                                    class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow appearance-none bg-white">
                                    <option value="FREE">Free (₩0)</option>
                                    <option value="BASIC">Basic (₩9,900)</option>
                                    <option value="PRO">Pro (₩29,900)</option>
                                </select>
                                <i class="fas fa-chevron-down absolute right-3 top-3 text-slate-400 pointer-events-none"></i>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">회사명 (조직 이름)</label>
                        <div class="relative">
                            <i class="fas fa-building absolute left-3 top-3 text-slate-400"></i>
                            <input type="text" id="regCompany" required
                                class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                                placeholder="(주)와우3D">
                        </div>
                    </div>
                    <button type="submit"
                        class="w-full bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-sm mt-2">
                        회원가입 및 조직 생성
                    </button>
                </form>
            </div>
            <div class="bg-teal-50 px-8 py-4 border-t border-teal-100 text-center text-xs text-teal-600 font-medium">
                Tip: 아래에서 요금제 정보를 확인하세요!
            </div>
        </div>

        <!-- Pricing Section -->
        <div class="w-full max-w-5xl px-4 animate-fade-in-up">
            <div class="text-center mb-12">
                <h2 class="text-2xl font-bold text-slate-800 mb-3">
                    <i class="fas fa-rocket text-teal-600 mr-2"></i>서비스 요금제 안내
                </h2>
                <p class="text-slate-500">비즈니스 규모에 맞는 최적의 플랜을 선택하세요.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Free Plan -->
                <div
                    class="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 relative group overflow-hidden">
                    <div
                        class="absolute top-0 left-0 w-full h-1.5 bg-slate-300 group-hover:bg-slate-400 transition-colors">
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">Free</h3>
                    <div class="flex items-baseline mb-4">
                        <span class="text-4xl font-bold text-slate-900">₩0</span>
                        <span class="text-slate-500 ml-2">/월</span>
                    </div>
                    <p class="text-sm text-slate-500 mb-8 h-10">개인 또는 소규모 팀의<br>간단한 재고 관리를 위해</p>

                    <ul class="space-y-4 mb-8">
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check text-teal-500 mt-1 mr-3"></i> <span>상품 100개 제한</span>
                        </li>
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check text-teal-500 mt-1 mr-3"></i> <span>사용자 1명 (초대 불가)</span>
                        </li>
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check text-teal-500 mt-1 mr-3"></i> <span>기본 재고 입출고</span>
                        </li>
                    </ul>
                    <button onclick="scrollToTop('register', 'FREE')"
                        class="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors">
                        무료로 시작하기
                    </button>
                </div>

                <!-- Basic Plan -->
                <div
                    class="bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-teal-500 relative transform md:-translate-y-4 z-10">
                    <div
                        class="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                        인기 플랜</div>
                    <div class="absolute top-0 left-0 w-full h-1 bg-teal-500"></div>
                    <h3 class="text-xl font-bold text-teal-700 mb-2">Basic</h3>
                    <div class="flex items-baseline mb-4">
                        <span class="text-4xl font-bold text-slate-900">₩9,900</span>
                        <span class="text-slate-500 ml-2">/월</span>
                    </div>
                    <p class="text-sm text-slate-500 mb-8 h-10">성장하는 팀을 위한<br>표준 재고 관리 기능</p>

                    <ul class="space-y-4 mb-8">
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check-circle text-teal-600 mt-1 mr-3"></i> <span>상품 1,000개</span>
                        </li>
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check-circle text-teal-600 mt-1 mr-3"></i> <span>사용자 5명까지</span>
                        </li>
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check-circle text-teal-600 mt-1 mr-3"></i> <span>주간/월간 리포트</span>
                        </li>
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check-circle text-teal-600 mt-1 mr-3"></i> <span>데이터 엑셀 내보내기</span>
                        </li>
                    </ul>
                    <button onclick="scrollToTop('register', 'BASIC')"
                        class="w-full py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200">
                        지금 시작하기
                    </button>
                </div>

                <!-- Pro Plan -->
                <div
                    class="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 relative group overflow-hidden">
                    <div
                        class="absolute top-0 left-0 w-full h-1.5 bg-purple-500 group-hover:bg-purple-600 transition-colors">
                    </div>
                    <h3 class="text-xl font-bold text-purple-700 mb-2">Pro</h3>
                    <div class="flex items-baseline mb-4">
                        <span class="text-4xl font-bold text-slate-900">₩29,900</span>
                        <span class="text-slate-500 ml-2">/월</span>
                    </div>
                    <p class="text-sm text-slate-500 mb-8 h-10">본격적인 비즈니스 확장을 위한<br>고급 기능 및 무제한 사용</p>

                    <ul class="space-y-4 mb-8">
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check text-purple-600 mt-1 mr-3"></i> <span>상품 무제한</span>
                        </li>
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check text-purple-600 mt-1 mr-3"></i> <span>사용자 무제한</span>
                        </li>
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check text-purple-600 mt-1 mr-3"></i> <span>API 및 웹훅 연동(예정)</span>
                        </li>
                        <li class="flex items-start text-sm text-slate-600">
                            <i class="fas fa-check text-purple-600 mt-1 mr-3"></i> <span>우선 기술 지원</span>
                        </li>
                    </ul>
                    <button onclick="scrollToTop('register', 'PRO')"
                        class="w-full py-3 rounded-xl border border-purple-200 text-purple-700 font-bold hover:bg-purple-50 transition-colors">
                        Enterprise 문의
                    </button>
                </div>
            </div>

            <div class="mt-20 text-center text-xs text-slate-400">
                &copy; 2025 Stock Sales Manager. All rights reserved.
            </div>
        </div>
    </div>

    <script>
        const API_BASE = '/api';

        function switchTab(tab) {
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            const loginBtn = document.getElementById('loginTabBtn');
            const registerBtn = document.getElementById('registerTabBtn');

            if (tab === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                loginBtn.classList.add('text-teal-600', 'border-teal-600');
                loginBtn.classList.remove('text-slate-500');
                registerBtn.classList.remove('text-teal-600', 'border-teal-600');
                registerBtn.classList.add('text-slate-500');
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                registerBtn.classList.add('text-teal-600', 'border-teal-600');
                registerBtn.classList.remove('text-slate-500');
                loginBtn.classList.remove('text-teal-600', 'border-teal-600');
                loginBtn.classList.add('text-slate-500');
            }
        }

        function scrollToTop(tab, plan) {
            if (tab) switchTab(tab);
            if (plan) {
                const planSelect = document.getElementById('regPlan');
                if (planSelect) planSelect.value = plan;
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        async function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const res = await axios.post(\`\${API_BASE}/auth/login\`, { email, password });
                if (res.data.success) {
                    localStorage.setItem('token', res.data.data.token);
                    localStorage.setItem('user', JSON.stringify(res.data.data.user));
                    window.location.href = '/';
                }
            } catch (err) {
                alert(err.response?.data?.error || '로그인 실패');
            }
        }

        async function handleRegister(e) {
            e.preventDefault();
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const name = document.getElementById('regName').value;
            const company_name = document.getElementById('regCompany').value;
            const plan = document.getElementById('regPlan').value;

            try {
                const res = await axios.post(\`\${API_BASE}/auth/register\`, {
                    email, password, name, company_name, plan
                });
                if (res.data.success) {
                    alert('회원가입이 완료되었습니다. 자동 로그인됩니다.');
                    localStorage.setItem('token', res.data.data.token);
                    localStorage.setItem('user', JSON.stringify(res.data.data.user));
                    window.location.href = '/';
                }
            } catch (err) {
                alert(err.response?.data?.error || '회원가입 실패');
            }
        }
    </script>
</body>

</html>`)
})

// 메인 페이지
app.get('/', (c: Context) => {
    return c.html(`
    <!DOCTYPE html>
        <html lang="ko">
            <head>
                <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>(주)와우쓰리디 판매관리</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
                            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                            <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
                            <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
                            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
                                <style>
                                    body {
                                        font-family: 'Inter', 'Noto Sans KR', sans-serif;
                                    background-color: #f0fdfa; /* Teal 50 */
            }

                                    /* Custom Scrollbar */
                                    ::-webkit-scrollbar {
                                        width: 8px;
                                    height: 8px;
            }
                                    ::-webkit-scrollbar-track {
                                        background: transparent;
            }
                                    ::-webkit-scrollbar-thumb {
                                        background: #cbd5e1;
                                    border-radius: 4px;
            }
                                    ::-webkit-scrollbar-thumb:hover {
                                        background: #94a3b8;
            }

                                    .nav-link {
                                        transition: all 0.2s ease-in-out;
            }

                                    .nav-link.active {
                                        background: #2dd4bf; /* Teal 400 - Pastel */
                                    color: #ffffff;
                                    box-shadow: 0 4px 6px -1px rgba(45, 212, 191, 0.3);
                                    font-weight: 600;
            }

                                    .nav-link:not(.active):hover {
                                        background: rgba(45, 212, 191, 0.1); /* Teal 400 with opacity */
                                    color: #ccfbf1; /* Teal 100 */
            }

                                    .glass-header {
                                        background: rgba(255, 255, 255, 0.85);
                                    backdrop-filter: blur(12px);
                                    border-bottom: 1px solid rgba(204, 251, 241, 0.5); /* Teal 100 border */
            }
                                </style>
                                <script>
                                    tailwind.config = {
                                        theme: {
                                        extend: {
                                        colors: {
                                        primary: '#4f46e5', // Indigo 600
                                    secondary: '#64748b', // Slate 500
                                            teal: {
                                                50: '#f0fdfa',
                                                100: '#ccfbf1',
                                                200: '#99f6e4',
                                                300: '#5eead4',
                                                400: '#2dd4bf',
                                                500: '#14b8a6',
                                                600: '#0d9488',
                                                700: '#0f766e',
                                                800: '#115e59',
                                                900: '#134e4a',
                                            }
                        },
                                    fontFamily: {
                                        sans: ['Inter', 'Noto Sans KR', 'sans-serif'],
                        }
                    }
                }
            }
                                </script>
                            </head>
                            <body class="text-slate-800 antialiased">
                                <div id="app" class="flex h-screen overflow-hidden">
                                    <!-- 모바일 사이드바 오버레이 -->
                                    <div id="sidebarOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-20 hidden md:hidden transition-opacity" onclick="toggleSidebar()"></div>

                                    <!-- 사이드바 -->
                                    <aside id="sidebar" class="w-64 bg-gradient-to-b from-teal-900 via-teal-800 to-teal-900 text-teal-100 flex flex-col shadow-xl z-30 fixed inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-300 ease-in-out border-r border-teal-800/50">
                                        <div class="h-16 flex items-center px-6 border-b border-teal-700/50 bg-teal-900/50 justify-between">
                                            <div class="flex items-center gap-3">
                                                <div class="relative w-8 h-8">
                                                    <div id="companyLogoPlaceholder" class="w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-400/30 absolute inset-0">W</div>
                                                    <img id="companyLogo" src="" alt="Logo" class="w-8 h-8 rounded-lg object-cover shadow-lg hidden relative z-10">
                                                </div>
                                                <div>
                                                    <h1 id="companyName" class="text-white font-bold text-lg leading-none tracking-tight">WOW3D</h1>
                                                    <p class="text-xs text-teal-400 font-medium mt-0.5 tracking-wide">Sales Manager</p>
                                                </div>
                                            </div>
                                            <!-- 모바일 닫기 버튼 -->
                                            <button onclick="toggleSidebar()" class="md:hidden text-slate-400 hover:text-white">
                                                <i class="fas fa-times text-lg"></i>
                                            </button>
                                        </div>

                                        <nav class="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                                            <p class="px-3 text-xs font-bold text-teal-500/70 uppercase tracking-widest mb-3 text-[10px]">Menu</p>
                                            <a href="#" data-page="dashboard" class="nav-link active flex items-center px-3 py-2.5 rounded-lg group" onclick="closeSidebarOnMobile()">
                                                <i class="fas fa-chart-pie w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                                                <span class="font-medium">대시보드</span>
                                            </a>
                                            <a href="#" data-page="sales" class="nav-link flex items-center px-3 py-2.5 rounded-lg group" onclick="closeSidebarOnMobile()">
                                                <i class="fas fa-cash-register w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                                                <span class="font-medium">판매 관리</span>
                                            </a>
                                            <a href="#" data-page="outbound" class="nav-link flex items-center px-3 py-2.5 rounded-lg group" onclick="closeSidebarOnMobile()">
                                                <i class="fas fa-truck-loading w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                                                <span class="font-medium">출고 관리</span>
                                            </a>
                                            <a href="#" data-page="customers" class="nav-link flex items-center px-3 py-2.5 rounded-lg group" onclick="closeSidebarOnMobile()">
                                                <i class="fas fa-users w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                                                <span class="font-medium">고객 관리</span>
                                            </a>
                                            <a href="#" data-page="products" class="nav-link flex items-center px-3 py-2.5 rounded-lg group" onclick="closeSidebarOnMobile()">
                                                <i class="fas fa-box w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                                                <span class="font-medium">상품 관리</span>
                                            </a>
                                            <a href="#" data-page="stock" class="nav-link flex items-center px-3 py-2.5 rounded-lg group" onclick="closeSidebarOnMobile()">
                                                <i class="fas fa-cubes w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                                                <span class="font-medium">재고 관리</span>
                                            </a>
                                            <div class="pt-4 mt-4 border-t border-slate-800">
                                                <a href="#" data-page="settings" class="nav-link flex items-center px-3 py-2.5 rounded-lg group" onclick="closeSidebarOnMobile()">
                                                    <i class="fas fa-cog w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                                                    <span class="font-medium">설정</span>
                                                </a>
                                            </div>
                                        </nav>

                                        <div class="p-4 border-t border-teal-700/50 bg-teal-900/50">
                                            <div class="flex items-center gap-3 px-2">
                                                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-400 flex items-center justify-center text-white font-bold text-sm shadow-md" id="user-avatar">
                                                    U
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-sm font-medium text-white truncate" id="user-name">Loading...</p>
                                                    <p class="text-xs text-slate-500 truncate" id="user-email">...</p>
                                                </div>
                                                <button onclick="logout()" class="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800" title="로그아웃">
                                                    <i class="fas fa-sign-out-alt"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </aside>

                                    <!-- 메인 컨텐츠 -->
                                    <div class="flex-1 flex flex-col h-screen overflow-hidden bg-gradient-to-br from-teal-50 to-white w-full">
                                        <!-- 헤더 -->
                                        <header class="h-16 glass-header border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 z-10 sticky top-0">
                                            <div class="flex items-center">
                                                <!-- 햄버거 메뉴 버튼 -->
                                                <button onclick="toggleSidebar()" class="mr-4 text-slate-500 hover:text-slate-700 md:hidden focus:outline-none">
                                                    <i class="fas fa-bars text-xl"></i>
                                                </button>
                                                <h2 id="page-title" class="text-xl font-bold text-slate-800 truncate">대시보드</h2>
                                            </div>
                                            <div class="flex items-center gap-4">
                                                <div class="text-right hidden sm:block">
                                                    <p class="text-xs font-medium text-slate-500" id="current-date"></p>
                                                    <p class="text-sm font-bold text-slate-700 font-mono" id="current-time"></p>
                                                </div>
                                                <button class="p-2 text-teal-400 hover:text-teal-600 transition-colors rounded-full hover:bg-teal-50">
                                                    <i class="fas fa-bell text-lg"></i>
                                                </button>
                                            </div>
                                        </header>

                                        <main id="content" class="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth w-full">
                                            <!-- 동적 컨텐츠 영역 -->
                                        </main>
                                    </div>
                                </div>

                                <script>
            // 사이드바 토글 함수
                                    function toggleSidebar() {
                const sidebar = document.getElementById('sidebar');
                                    const overlay = document.getElementById('sidebarOverlay');

                                    if (sidebar.classList.contains('-translate-x-full')) {
                                        // 열기
                                        sidebar.classList.remove('-translate-x-full');
                                    overlay.classList.remove('hidden');
                } else {
                                        // 닫기
                                        sidebar.classList.add('-translate-x-full');
                                    overlay.classList.add('hidden');
                }
            }

                                    // 모바일에서 메뉴 클릭 시 사이드바 닫기
                                    function closeSidebarOnMobile() {
                if (window.innerWidth < 768) { // md breakpoint
                                        toggleSidebar();
                }
            }

                                    // 현재 시간 표시
                                    function updateTime() {
                const now = new Date();
                                    const timeStr = now.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                    const dateStr = now.toLocaleDateString('ko-KR', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    document.getElementById('current-time').textContent = timeStr;
                                    document.getElementById('current-date').textContent = dateStr;
            }
                                    updateTime();
                                    setInterval(updateTime, 1000);
                                </script>
                                <script src="/static/js/config.js?v=1"></script>
                                <script src="/static/js/utils.js?v=2"></script>
                                <script src="/static/js/utils_address.js?v=1"></script>
                                <script src="/static/js/auth.js?v=1"></script>
                                <script src="/static/app.js?v=17"></script>
                                <script src="/static/js/outbound.js?v=6"></script>
                                <script src="/static/js/products.js?v=1"></script>
                            </body>
                        </html>
                        `)
})

export default app

