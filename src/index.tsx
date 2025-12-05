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

// 로그인 페이지
app.get('/login', (c: Context) => {
    return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인 - WOW Sales ERP</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Outfit', 'Noto Sans KR', sans-serif;
            background-color: #ffffff;
            overflow: hidden;
        }

        /* Orbit Animation Container */
        .orbit-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            height: 800px;
            pointer-events: none;
            z-index: 0;
        }

        .orbit {
            position: absolute;
            top: 50%;
            left: 50%;
            border: 1px solid rgba(99, 102, 241, 0.15); /* Indigo with low opacity */
            border-radius: 50%;
            transform: translate(-50%, -50%);
        }

        .orbit-1 { width: 400px; height: 400px; animation: rotate 20s linear infinite; }
        .orbit-2 { width: 600px; height: 600px; animation: rotate 30s linear infinite reverse; }
        .orbit-3 { width: 800px; height: 800px; animation: rotate 40s linear infinite; }

        .planet {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 40px;
            height: 40px;
            background: #ffffff;
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #4f46e5; /* Indigo 600 */
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.1), 0 2px 4px -1px rgba(99, 102, 241, 0.06);
            transform-origin: center;
        }

        /* Positioning planets on orbits */
        /* Orbit 1 */
        .orbit-1 .planet:nth-child(1) { transform: translate(-50%, -50%) rotate(0deg) translateX(200px) rotate(0deg); }
        .orbit-1 .planet:nth-child(2) { transform: translate(-50%, -50%) rotate(120deg) translateX(200px) rotate(-120deg); }
        .orbit-1 .planet:nth-child(3) { transform: translate(-50%, -50%) rotate(240deg) translateX(200px) rotate(-240deg); }

        /* Orbit 2 */
        .orbit-2 .planet:nth-child(1) { transform: translate(-50%, -50%) rotate(45deg) translateX(300px) rotate(-45deg); }
        .orbit-2 .planet:nth-child(2) { transform: translate(-50%, -50%) rotate(135deg) translateX(300px) rotate(-135deg); }
        .orbit-2 .planet:nth-child(3) { transform: translate(-50%, -50%) rotate(225deg) translateX(300px) rotate(-225deg); }
        .orbit-2 .planet:nth-child(4) { transform: translate(-50%, -50%) rotate(315deg) translateX(300px) rotate(-315deg); }

        /* Orbit 3 */
        .orbit-3 .planet:nth-child(1) { transform: translate(-50%, -50%) rotate(90deg) translateX(400px) rotate(-90deg); }
        .orbit-3 .planet:nth-child(2) { transform: translate(-50%, -50%) rotate(270deg) translateX(400px) rotate(-270deg); }

        @keyframes rotate {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        /* Counter-rotate icons to keep them upright */
        .orbit-1 .planet i { animation: counter-rotate 20s linear infinite; }
        .orbit-2 .planet i { animation: counter-rotate 30s linear infinite reverse; }
        .orbit-3 .planet i { animation: counter-rotate 40s linear infinite; }

        @keyframes counter-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
        }

        /* Glass Panel - Blue Gradient */
        .glass-panel {
            background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 25px 50px -12px rgba(37, 99, 235, 0.3);
            color: white;
        }

        .input-glass {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.5);
            color: #1e293b;
        }
        .input-glass:focus {
            background: #ffffff;
            border-color: #ffffff;
            ring: 2px solid rgba(255, 255, 255, 0.5);
            outline: none;
        }
    </style>
</head>
<body class="h-screen w-full flex items-center justify-center relative">

    <!-- Orbit Animation Background -->
    <div class="orbit-container">
        <!-- Inner Orbit -->
        <div class="orbit orbit-1">
            <div class="planet"><i class="fas fa-chart-line"></i></div>
            <div class="planet"><i class="fas fa-users"></i></div>
            <div class="planet"><i class="fas fa-box"></i></div>
        </div>
        <!-- Middle Orbit -->
        <div class="orbit orbit-2">
            <div class="planet"><i class="fas fa-truck"></i></div>
            <div class="planet"><i class="fas fa-file-invoice-dollar"></i></div>
            <div class="planet"><i class="fas fa-cog"></i></div>
            <div class="planet"><i class="fas fa-headset"></i></div>
        </div>
        <!-- Outer Orbit -->
        <div class="orbit orbit-3">
            <div class="planet"><i class="fas fa-globe"></i></div>
            <div class="planet"><i class="fas fa-cloud"></i></div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="relative z-10 w-full max-w-md px-4">
        <div class="glass-panel rounded-3xl overflow-hidden p-8 animate-fade-in-up">
            <!-- Logo Section -->
            <div class="text-center mb-10">
                <img src="/static/login_logo.png" alt="WOW Sales ERP" class="h-48 mx-auto mb-6 object-contain drop-shadow-md max-w-full">
                <p class="text-indigo-100 text-sm font-medium tracking-wide">Enterprise Resource Planning</p>
            </div>

            <!-- Tabs -->
            <div class="flex p-1 bg-black/20 rounded-xl mb-8">
                <button onclick="switchTab('login')" id="loginTabBtn" class="flex-1 py-2.5 text-sm font-bold rounded-lg bg-white text-indigo-600 shadow-sm transition-all">로그인</button>
                <button onclick="switchTab('register')" id="registerTabBtn" class="flex-1 py-2.5 text-sm font-medium rounded-lg text-indigo-200 hover:text-white transition-all">회원가입</button>
            </div>

            <!-- Login Form -->
            <form id="loginForm" onsubmit="handleLogin(event)" class="space-y-5">
                <div class="space-y-1">
                    <label class="text-xs font-bold text-indigo-100 ml-1">EMAIL</label>
                    <div class="relative">
                        <i class="fas fa-envelope absolute left-4 top-3.5 text-slate-400"></i>
                        <input type="email" id="loginEmail" required class="w-full pl-11 pr-4 py-3 rounded-xl input-glass transition-all" placeholder="name@company.com">
                    </div>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-indigo-100 ml-1">PASSWORD</label>
                    <div class="relative">
                        <i class="fas fa-lock absolute left-4 top-3.5 text-slate-400"></i>
                        <input type="password" id="loginPassword" required class="w-full pl-11 pr-4 py-3 rounded-xl input-glass transition-all" placeholder="••••••••">
                    </div>
                </div>
                
                <button type="submit" class="w-full bg-white text-indigo-600 py-3.5 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg mt-4">
                    Sign In
                </button>

                <div class="flex justify-between text-sm mt-6 px-1">
                    <button type="button" onclick="showFindEmailModal()" class="text-indigo-200 hover:text-white transition-colors">아이디 찾기</button>
                    <button type="button" onclick="showResetPasswordModal()" class="text-indigo-200 hover:text-white transition-colors">비밀번호 찾기</button>
                </div>
            </form>

            <!-- Register Form -->
            <form id="registerForm" onsubmit="handleRegister(event)" class="space-y-4 hidden">
                <div class="space-y-1">
                    <label class="text-xs font-bold text-indigo-100 ml-1">EMAIL</label>
                    <div class="relative">
                        <i class="fas fa-envelope absolute left-4 top-3.5 text-slate-400"></i>
                        <input type="email" id="regEmail" required class="w-full pl-11 pr-4 py-3 rounded-xl input-glass transition-all" placeholder="name@company.com">
                    </div>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold text-indigo-100 ml-1">PASSWORD</label>
                    <div class="relative">
                        <i class="fas fa-lock absolute left-4 top-3.5 text-slate-400"></i>
                        <input type="password" id="regPassword" required class="w-full pl-11 pr-4 py-3 rounded-xl input-glass transition-all" placeholder="••••••••">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-indigo-100 ml-1">NAME</label>
                        <div class="relative">
                            <i class="fas fa-user absolute left-4 top-3.5 text-slate-400"></i>
                            <input type="text" id="regName" required class="w-full pl-11 pr-4 py-3 rounded-xl input-glass transition-all" placeholder="이름">
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-indigo-100 ml-1">COMPANY</label>
                        <div class="relative">
                            <i class="fas fa-building absolute left-4 top-3.5 text-slate-400"></i>
                            <input type="text" id="regCompany" required class="w-full pl-11 pr-4 py-3 rounded-xl input-glass transition-all" placeholder="회사명">
                        </div>
                    </div>
                </div>
                <button type="submit" class="w-full bg-emerald-400 text-emerald-900 py-3.5 rounded-xl font-bold text-lg hover:bg-emerald-300 transition-all shadow-lg mt-4">
                    Create Account
                </button>
            </form>
        </div>
        
        <div class="text-center mt-8 text-slate-400 text-xs">
            &copy; 2025 WOW Sales ERP. All rights reserved.
        </div>
    </div>

    <!-- Modals (Light Theme) -->
    <div id="findEmailModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-slate-800">아이디 찾기</h3>
                <button onclick="closeFindEmailModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            <form onsubmit="handleFindEmail(event)" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-slate-600 mb-1">이름</label>
                    <input type="text" id="findEmailName" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all" placeholder="가입 시 등록한 이름">
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                    찾기
                </button>
            </form>
            <div id="findEmailResult" class="hidden mt-4 p-4 bg-green-50 border border-green-100 rounded-xl">
                <p class="text-sm text-green-700 font-bold mb-1"><i class="fas fa-check-circle mr-2"></i>아이디를 찾았습니다!</p>
                <p class="text-sm text-slate-600 pl-6" id="foundEmailMessage"></p>
            </div>
        </div>
    </div>

    <div id="resetPasswordModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-slate-800">비밀번호 재설정</h3>
                <button onclick="closeResetPasswordModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            <form onsubmit="handleResetPassword(event)" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-slate-600 mb-1">이메일</label>
                    <input type="email" id="resetEmail" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all" placeholder="example@company.com">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-600 mb-1">이름</label>
                    <input type="text" id="resetName" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all" placeholder="홍길동">
                </div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                    임시 비밀번호 발급
                </button>
            </form>
            <div id="resetPasswordResult" class="hidden mt-4 p-4 bg-green-50 border border-green-100 rounded-xl">
                <p class="text-sm text-green-700 font-bold mb-2" id="resetSuccessMessage"></p>
                <p class="text-sm text-slate-600 mb-2" id="tempPasswordDisplay" style="display: none;">임시 비밀번호: <span class="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded" id="tempPassword"></span></p>
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
        loginBtn.classList.add('text-indigo-600', 'border-indigo-600');
        loginBtn.classList.remove('text-slate-500');
        registerBtn.classList.remove('text-indigo-600', 'border-indigo-600');
        registerBtn.classList.add('text-slate-500');
    } else {
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
        const res = await axios.post(\`\${API_BASE}/auth/login\`, {email, password});
        if (res.data.success) {
                    try {
            localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.data.user));
        if (res.data.data.tenant) {
            localStorage.setItem('tenant', JSON.stringify(res.data.data.tenant));
                        }
        window.location.href = '/';
                    } catch (storageErr) {
            console.error('Storage error:', storageErr);
        alert('브라우저 저장소 접근 권한이 없습니다. 쿠키/사이트 데이터 설정을 확인해주세요.');
                    }
                }
            } catch (err) {
            console.error('Login API error:', err);
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
        if (res.data.data.tenant) {
            localStorage.setItem('tenant', JSON.stringify(res.data.data.tenant));
                    }
        window.location.href = '/';
                }
            } catch (err) {
            alert(err.response?.data?.error || '회원가입 실패');
            }
        }

        // 아이디 찾기 모달
        function showFindEmailModal() {
            document.getElementById('findEmailModal').classList.remove('hidden');
        document.getElementById('findEmailResult').classList.add('hidden');
        document.getElementById('findEmailName').value = '';
        }

        function closeFindEmailModal() {
            document.getElementById('findEmailModal').classList.add('hidden');
        }

        async function handleFindEmail(e) {
            e.preventDefault();
        const name = document.getElementById('findEmailName').value;

        try {
                const res = await axios.post(\`\${API_BASE}/auth/find-email\`, {name});
        if (res.data.success) {
                    const maskedEmail = res.data.data.maskedEmail || '';
        const message = res.data.data.message || '아이디를 찾았습니다.';
        document.getElementById('foundEmailMessage').textContent = '마스킹된 주소: ' + maskedEmail;
        document.getElementById('findEmailResult').classList.remove('hidden');
                }
            } catch (err) {
            alert(err.response?.data?.error || '아이디 찾기 실패');
            }
        }

        // 비밀번호 재설정 모달
        function showResetPasswordModal() {
            document.getElementById('resetPasswordModal').classList.remove('hidden');
        document.getElementById('resetPasswordResult').classList.add('hidden');
        document.getElementById('resetEmail').value = '';
        document.getElementById('resetName').value = '';
        }

        function closeResetPasswordModal() {
            document.getElementById('resetPasswordModal').classList.add('hidden');
        }

        async function handleResetPassword(e) {
            e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        const name = document.getElementById('resetName').value;

        try {
                const res = await axios.post(\`\${API_BASE}/auth/reset-password\`, {email, name});
        if (res.data.success) {
                    const message = res.data.data.message;
        const emailSent = res.data.data.emailSent;

        document.getElementById('resetSuccessMessage').textContent = message;

        // 이메일 전송이 안된 경우에만 화면에 비밀번호 표시
        if (!emailSent && res.data.data.tempPassword) {
            document.getElementById('tempPassword').textContent = res.data.data.tempPassword;
        document.getElementById('tempPasswordDisplay').style.display = 'block';
                    } else {
            document.getElementById('tempPasswordDisplay').style.display = 'none';
                    }

        document.getElementById('resetPasswordResult').classList.remove('hidden');
                }
            } catch (err) {
            alert(err.response?.data?.error || '비밀번호 재설정 실패');
            }
        }
    </script>
</body >
</html >
    `)
})

// 메인 페이지
app.get('/', (c: Context) => {
    return c.html(`
    < !DOCTYPE html >
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
                                        font - family: 'Inter', 'Noto Sans KR', sans-serif;
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
                                    <!-- 모바일 사이드바 오버레이 -->
                                    <div id="sidebarOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-20 hidden md:hidden transition-opacity" onclick="toggleSidebar()"></div>

                                    <!-- 사이드바 -->
                                    <aside id="sidebar" class="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-30 fixed inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-300 ease-in-out">
                                        <div class="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-900 justify-between">
                                            <div class="flex items-center gap-3">
                                                <div class="relative w-8 h-8">
                                                    <div id="companyLogoPlaceholder" class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30 absolute inset-0">W</div>
                                                    <img id="companyLogo" src="" alt="Logo" class="w-8 h-8 rounded-lg object-cover shadow-lg hidden relative z-10">
                                                </div>
                                                <div>
                                                    <h1 id="companyName" class="text-white font-bold text-lg leading-none">WOW3D</h1>
                                                    <p class="text-xs text-slate-500 font-medium mt-0.5">Sales Manager</p>
                                                </div>
                                            </div>
                                            <!-- 모바일 닫기 버튼 -->
                                            <button onclick="toggleSidebar()" class="md:hidden text-slate-400 hover:text-white">
                                                <i class="fas fa-times text-lg"></i>
                                            </button>
                                        </div>

                                        <nav class="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                                            <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Menu</p>
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
                                    <div class="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 w-full">
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
                                                <button class="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50">
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
                                <script src="/static/app.js?v=2"></script>
                            </body>
                        </html>
                        `)
})

export default app

