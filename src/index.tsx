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
import authRouter from './routes/auth'
import subscriptionRouter from './routes/subscription'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// CORS 활성화
app.use('/api/*', cors())

// 멀티테넌트 미들웨어 적용
app.use('/api/*', tenantMiddleware)

// API 라우트 등록
app.route('/api/auth', authRouter)
app.route('/api/subscription', subscriptionRouter)
app.route('/api/products', productsRouter)
app.route('/api/customers', customersRouter)
app.route('/api/sales', salesRouter)
app.route('/api/stock', stockRouter)
app.route('/api/dashboard', dashboardRouter)
app.route('/api/claims', claimsRouter)
app.route('/api/users', usersRouter)
app.route('/api/outbound', outboundRouter)

// 로그인 페이지
app.get('/login', (c: Context) => {
    return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인 - 재고/판매 관리 시스템</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div class="p-8">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-indigo-600 mb-2">Stock Manager</h1>
                <p class="text-slate-500">재고와 판매를 한 곳에서 관리하세요</p>
            </div>

            <!-- 탭 버튼 -->
            <div class="flex mb-6 border-b border-slate-200">
                <button onclick="switchTab('login')" id="loginTabBtn" class="flex-1 py-3 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 focus:outline-none transition-colors">로그인</button>
                <button onclick="switchTab('register')" id="registerTabBtn" class="flex-1 py-3 text-sm font-medium text-slate-500 hover:text-indigo-600 focus:outline-none transition-colors">회원가입</button>
            </div>

            <!-- 로그인 폼 -->
            <form id="loginForm" onsubmit="handleLogin(event)" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                    <div class="relative">
                        <i class="fas fa-envelope absolute left-3 top-3 text-slate-400"></i>
                        <input type="email" id="loginEmail" required class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" placeholder="example@company.com">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
                    <div class="relative">
                        <i class="fas fa-lock absolute left-3 top-3 text-slate-400"></i>
                        <input type="password" id="loginPassword" required class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" placeholder="••••••••">
                    </div>
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm mt-2">
                    로그인
                </button>
            </form>

            <!-- 회원가입 폼 -->
            <form id="registerForm" onsubmit="handleRegister(event)" class="space-y-4 hidden">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                    <div class="relative">
                        <i class="fas fa-envelope absolute left-3 top-3 text-slate-400"></i>
                        <input type="email" id="regEmail" required class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" placeholder="example@company.com">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
                    <div class="relative">
                        <i class="fas fa-lock absolute left-3 top-3 text-slate-400"></i>
                        <input type="password" id="regPassword" required class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" placeholder="••••••••">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">이름</label>
                    <div class="relative">
                        <i class="fas fa-user absolute left-3 top-3 text-slate-400"></i>
                        <input type="text" id="regName" required class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" placeholder="홍길동">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">회사명 (조직 이름)</label>
                    <div class="relative">
                        <i class="fas fa-building absolute left-3 top-3 text-slate-400"></i>
                        <input type="text" id="regCompany" required class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" placeholder="(주)와우3D">
                    </div>
                </div>
                <button type="submit" class="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm mt-2">
                    회원가입 및 조직 생성
                </button>
            </form>
        </div>
        <div class="bg-slate-50 px-8 py-4 border-t border-slate-200 text-center text-xs text-slate-500">
            &copy; 2025 Stock Sales Manager. All rights reserved.
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
                loginBtn.classList.add('text-indigo-600', 'border-indigo-600');
                loginBtn.classList.remove('text-slate-500');
                registerBtn.classList.remove('text-indigo-600', 'border-indigo-600');
                registerBtn.classList.add('text-slate-500');
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                registerBtn.classList.add('text-indigo-600', 'border-indigo-600');
                registerBtn.classList.remove('text-slate-500');
                loginBtn.classList.remove('text-indigo-600', 'border-indigo-600');
                loginBtn.classList.add('text-slate-500');
            }
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

            try {
                const res = await axios.post(\`\${API_BASE}/auth/register\`, { 
                    email, password, name, company_name 
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
</html>
    `)
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Inter', 'Noto Sans KR', sans-serif;
                background-color: #f8fafc; /* Slate 50 */
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
                background: #4f46e5; /* Indigo 600 */
                color: white;
                box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);
            }
            
            .nav-link:not(.active):hover {
                background: #1e293b; /* Slate 800 */
                color: #e2e8f0;
            }

            .glass-header {
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(8px);
            }
        </style>
        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        colors: {
                            primary: '#4f46e5', // Indigo 600
                            secondary: '#64748b', // Slate 500
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
            <!-- 사이드바 -->
            <aside class="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
                <div class="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-900">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">W</div>
                        <div>
                            <h1 class="text-white font-bold text-lg leading-none">WOW3D</h1>
                            <p class="text-xs text-slate-500 font-medium mt-0.5">Sales Manager</p>
                        </div>
                    </div>
                </div>

                <nav class="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                    <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Menu</p>
                    <a href="#" data-page="dashboard" class="nav-link active flex items-center px-3 py-2.5 rounded-lg group">
                        <i class="fas fa-chart-pie w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                        <span class="font-medium">대시보드</span>
                    </a>
                    <a href="#" data-page="sales" class="nav-link flex items-center px-3 py-2.5 rounded-lg group">
                        <i class="fas fa-cash-register w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                        <span class="font-medium">판매 관리</span>
                    </a>
                    <a href="#" data-page="outbound" class="nav-link flex items-center px-3 py-2.5 rounded-lg group">
                        <i class="fas fa-truck-loading w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                        <span class="font-medium">출고 관리</span>
                    </a>
                    <a href="#" data-page="customers" class="nav-link flex items-center px-3 py-2.5 rounded-lg group">
                        <i class="fas fa-users w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                        <span class="font-medium">고객 관리</span>
                    </a>
                    <a href="#" data-page="products" class="nav-link flex items-center px-3 py-2.5 rounded-lg group">
                        <i class="fas fa-box w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                        <span class="font-medium">상품 관리</span>
                    </a>
                    <a href="#" data-page="stock" class="nav-link flex items-center px-3 py-2.5 rounded-lg group">
                        <i class="fas fa-warehouse w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                        <span class="font-medium">재고 관리</span>
                    </a>
                </nav>
                
                <div class="p-4 border-t border-slate-800 bg-slate-900">
                    <div class="flex items-center gap-3 px-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md" id="user-avatar">
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
            <div class="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
                <!-- 헤더 -->
                <header class="h-16 glass-header border-b border-slate-200 flex items-center justify-between px-8 z-10 sticky top-0">
                    <div class="flex items-center">
                        <h2 id="page-title" class="text-xl font-bold text-slate-800">대시보드</h2>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="text-right hidden sm:block">
                            <p class="text-xs font-medium text-slate-500" id="current-date"></p>
                            <p class="text-sm font-bold text-slate-700 font-mono" id="current-time"></p>
                        </div>
                        <button class="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50">
                            <i class="fas fa-bell text-lg"></i>
                        </button>
                    </div>
                </header>
                
                <main id="content" class="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <!-- 동적 컨텐츠 영역 -->
                </main>
            </div>
        </div>

        <script>
            // 현재 시간 표시
            function updateTime() {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = now.toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                document.getElementById('current-time').textContent = timeStr;
                document.getElementById('current-date').textContent = dateStr;
            }
            updateTime();
            setInterval(updateTime, 1000);
        </script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
