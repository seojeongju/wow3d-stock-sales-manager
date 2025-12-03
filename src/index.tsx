import { Hono, Context } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'

// API 라우트 import
import productsRouter from './routes/products'
import customersRouter from './routes/customers'
import salesRouter from './routes/sales'
import stockRouter from './routes/stock'
import dashboardRouter from './routes/dashboard'
import claimsRouter from './routes/claims'
import usersRouter from './routes/users'

const app = new Hono<{ Bindings: Bindings }>()

// CORS 활성화
app.use('/api/*', cors())

// API 라우트 등록
app.route('/api/products', productsRouter)
app.route('/api/customers', customersRouter)
app.route('/api/sales', salesRouter)
app.route('/api/stock', stockRouter)
app.route('/api/dashboard', dashboardRouter)
app.route('/api/claims', claimsRouter)
app.route('/api/users', usersRouter)

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
                    <a href="#" data-page="products" class="nav-link flex items-center px-3 py-2.5 rounded-lg group">
                        <i class="fas fa-box w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                        <span class="font-medium">상품 관리</span>
                    </a>
                    <a href="#" data-page="stock" class="nav-link flex items-center px-3 py-2.5 rounded-lg group">
                        <i class="fas fa-warehouse w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                        <span class="font-medium">재고 관리</span>
                    </a>
                    <a href="#" data-page="customers" class="nav-link flex items-center px-3 py-2.5 rounded-lg group">
                        <i class="fas fa-users w-6 text-center text-lg mr-2 group-hover:text-white transition-colors"></i>
                        <span class="font-medium">고객 관리</span>
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
