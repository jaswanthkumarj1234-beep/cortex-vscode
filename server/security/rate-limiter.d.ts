/**
 * Rate Limiter — Prevents unbounded memory storage per session.
 *
 * Limits:
 * - Max 30 memories stored per session (resets on server restart)
 * - Max 100 auto_learn calls per session
 * - Max 500 total tool calls per session
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
};
export declare function resetRateLimits(): void;
//# sourceMappingURL=rate-limiter.d.ts.map