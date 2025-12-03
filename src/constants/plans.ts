export const PLANS = {
    FREE: {
        name: 'Free',
        price: 0,
        limits: {
            products: 100,
            users: 1,
            storage: 100 * 1024 * 1024, // 100MB
        },
        features: ['기본 재고 관리', '월간 리포트'],
    },
    BASIC: {
        name: 'Basic',
        price: 9900,
        limits: {
            products: 1000,
            users: 5,
            storage: 1 * 1024 * 1024 * 1024, // 1GB
        },
        features: ['기본 재고 관리', '주간/월간 리포트', '팀원 초대 (최대 5명)'],
    },
    PRO: {
        name: 'Pro',
        price: 29900,
        limits: {
            products: Infinity,
            users: Infinity,
            storage: 10 * 1024 * 1024 * 1024, // 10GB
        },
        features: ['모든 기능 무제한', '실시간 리포트', 'API 액세스', '우선 지원'],
    },
} as const;

export type PlanType = keyof typeof PLANS;
