/**
 * Rate Limiter — Prevents unbounded memory storage per session.
 *
 * Limits:
 * - Max 100 memories stored per session (resets on server restart)
 * - Max 500 auto_learn calls per session
 * - Max 2000 total tool calls per session
 */
export declare function checkRateLimit(operation: 'store' | 'auto_learn' | 'call'): {
    allowed: boolean;
    reason?: string;
};
export declare function getRateLimitStats(): {
    storeCount: number;
    autoLearnCount: number;
    totalCalls: number;
    uptime: number;
    storeLimit: number;
};
export declare function resetRateLimits(): void;
//# sourceMappingURL=rate-limiter.d.ts.map