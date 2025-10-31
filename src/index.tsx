import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'

// API 라우트 import
import productsRouter from './routes/products'
import customersRouter from './routes/customers'
import salesRouter from './routes/sales'
import stockRouter from './routes/stock'
import dashboardRouter from './routes/dashboard'

const app = new Hono<{ Bindings: Bindings }>()

// CORS 활성화
app.use('/api/*', cors())

// API 라우트 등록
app.route('/api/products', productsRouter)
app.route('/api/customers', customersRouter)
app.route('/api/sales', salesRouter)
app.route('/api/stock', stockRouter)
app.route('/api/dashboard', dashboardRouter)

// 메인 페이지
app.get('/', (c) => {
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
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
            
            * {
                font-family: 'Noto Sans KR', sans-serif;
            }
            
            .gradient-bg {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .blue-gradient {
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            }
            
            .nav-link.active {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
            }
            
            .card-hover {
                transition: all 0.3s ease;
            }
            
            .card-hover:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
            }
        </style>
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100">
        <div id="app" class="flex h-screen">
            <!-- 사이드바 -->
            <aside class="w-72 blue-gradient text-white shadow-2xl">
                <div class="bg-white p-6 border-b border-gray-200">
                    <div class="flex items-center gap-4">
                        <img src="/static/wow3d-logo.png" alt="WOW3D Logo" class="h-14 flex-shrink-0">
                        <div class="flex-1">
                            <h1 class="text-base font-bold text-gray-800 leading-tight">(주)와우쓰리디</h1>
                            <p class="text-sm font-medium text-blue-600 mt-1">판매관리</p>
                        </div>
                    </div>
                </div>
                <nav class="mt-6 px-3">
                    <a href="#" data-page="dashboard" class="nav-link active flex items-center px-4 py-3 mb-2 text-white rounded-lg hover:bg-blue-600 hover:bg-opacity-50 transition duration-200">
                        <i class="fas fa-chart-line mr-3 text-lg"></i>
                        <span class="font-medium">대시보드</span>
                    </a>
                    <a href="#" data-page="products" class="nav-link flex items-center px-4 py-3 mb-2 text-blue-100 rounded-lg hover:bg-blue-600 hover:bg-opacity-50 transition duration-200">
                        <i class="fas fa-box mr-3 text-lg"></i>
                        <span class="font-medium">상품 관리</span>
                    </a>
                    <a href="#" data-page="stock" class="nav-link flex items-center px-4 py-3 mb-2 text-blue-100 rounded-lg hover:bg-blue-600 hover:bg-opacity-50 transition duration-200">
                        <i class="fas fa-warehouse mr-3 text-lg"></i>
                        <span class="font-medium">재고 관리</span>
                    </a>
                    <a href="#" data-page="sales" class="nav-link flex items-center px-4 py-3 mb-2 text-blue-100 rounded-lg hover:bg-blue-600 hover:bg-opacity-50 transition duration-200">
                        <i class="fas fa-shopping-cart mr-3 text-lg"></i>
                        <span class="font-medium">판매 관리</span>
                    </a>
                    <a href="#" data-page="customers" class="nav-link flex items-center px-4 py-3 mb-2 text-blue-100 rounded-lg hover:bg-blue-600 hover:bg-opacity-50 transition duration-200">
                        <i class="fas fa-users mr-3 text-lg"></i>
                        <span class="font-medium">고객 관리</span>
                    </a>
                </nav>
                
                <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-400 border-opacity-30">
                    <div class="text-xs text-blue-200 text-center">
                        <p>© 2025 WOW3D</p>
                        <p class="mt-1">MAKER SPACE 3D</p>
                    </div>
                </div>
            </aside>

            <!-- 메인 컨텐츠 -->
            <main class="flex-1 overflow-y-auto">
                <!-- 헤더 -->
                <header class="bg-white shadow-sm border-b border-gray-200">
                    <div class="px-8 py-4 flex items-center justify-between">
                        <div>
                            <h2 id="page-title" class="text-2xl font-bold text-gray-800">대시보드</h2>
                            <p class="text-sm text-gray-500 mt-1">실시간 매출 및 재고 현황</p>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div class="text-right">
                                <p class="text-sm text-gray-600">관리자</p>
                                <p class="text-xs text-gray-400" id="current-time"></p>
                            </div>
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                A
                            </div>
                        </div>
                    </div>
                </header>
                
                <div id="content" class="p-8">
                    <!-- 동적 컨텐츠 영역 -->
                </div>
            </main>
        </div>

        <script>
            // 현재 시간 표시
            function updateTime() {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                const dateStr = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
                document.getElementById('current-time').textContent = dateStr + ' ' + timeStr;
            }
            updateTime();
            setInterval(updateTime, 60000);
        </script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
