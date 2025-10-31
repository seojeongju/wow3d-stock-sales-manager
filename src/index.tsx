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
        <title>재고관리 통합 시스템</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    </head>
    <body class="bg-gray-100">
        <div id="app" class="flex h-screen">
            <!-- 사이드바 -->
            <aside class="w-64 bg-gray-800 text-white">
                <div class="p-4">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-boxes mr-2"></i>
                        재고관리 시스템
                    </h1>
                </div>
                <nav class="mt-8">
                    <a href="#" data-page="dashboard" class="nav-link flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition">
                        <i class="fas fa-chart-line mr-3"></i>
                        대시보드
                    </a>
                    <a href="#" data-page="products" class="nav-link flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition">
                        <i class="fas fa-box mr-3"></i>
                        상품 관리
                    </a>
                    <a href="#" data-page="stock" class="nav-link flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition">
                        <i class="fas fa-warehouse mr-3"></i>
                        재고 관리
                    </a>
                    <a href="#" data-page="sales" class="nav-link flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition">
                        <i class="fas fa-shopping-cart mr-3"></i>
                        판매 관리
                    </a>
                    <a href="#" data-page="customers" class="nav-link flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition">
                        <i class="fas fa-users mr-3"></i>
                        고객 관리
                    </a>
                </nav>
            </aside>

            <!-- 메인 컨텐츠 -->
            <main class="flex-1 overflow-y-auto">
                <div id="content" class="p-8">
                    <!-- 동적 컨텐츠 영역 -->
                </div>
            </main>
        </div>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
