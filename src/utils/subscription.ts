import { PLANS, PlanType } from '../constants/plans';
import { Tenant } from '../types';

export async function checkPlanLimit(
    DB: any, // Using any to avoid D1Database type issues for now, or could import from types
    tenantId: number,
    resource: 'products' | 'users'
): Promise<{ allowed: boolean; limit: number; current: number; error?: string }> {
    // 1. Get Tenant Plan
    const tenant = await DB.prepare('SELECT plan_type FROM tenants WHERE id = ?').bind(tenantId).first();

    if (!tenant) {
        return { allowed: false, limit: 0, current: 0, error: 'Tenant not found' };
    }

    const planType = (tenant.plan_type as PlanType) || 'FREE';
    const plan = PLANS[planType];

    if (!plan) {
        // Fallback to FREE if plan not found
        return { allowed: false, limit: 0, current: 0, error: 'Invalid plan configuration' };
    }

    const limit = plan.limits[resource];

    if (limit === Infinity) {
        return { allowed: true, limit: Infinity, current: 0 };
    }

    // 2. Count current usage
    let count = 0;
    if (resource === 'products') {
        // is_active=1 인 상품만 카운트
        const result = await DB.prepare('SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND is_active = 1').bind(tenantId).first();
        count = result.count;
    } else if (resource === 'users') {
        const result = await DB.prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id = ?').bind(tenantId).first();
        count = result.count;
    }

    if (count >= limit) {
        return {
            allowed: false,
            limit,
            current: count,
            error: `${plan.name} 플랜의 ${resource === 'products' ? '상품' : '사용자'} 등록 한도(${limit}개)를 초과했습니다. 업그레이드가 필요합니다.`
        };
    }

    return { allowed: true, limit, current: count };
}
