/**
 * Tool Recommender — Suggests which Cortex tools to use based on context.
 *
 * THE GAP THIS FILLS:
 * The AI has 20 tools but often doesn't know WHEN to use which.
 * This module analyzes the current situation and recommends the right tools.
 *
 * Like a flight checklist: "Before takeoff: check instruments, fuel, clearance."
 * Here: "Before editing auth.ts: run pre_check, check_impact, verify_code."
 */
export interface ToolRecommendation {
    tool: string;
    reason: string;
    priority: 'must' | 'should' | 'could';
}
/**
 * Recommend tools based on what the user is doing.
 */
export declare function recommendTools(context: {
    topic?: string;
    currentFile?: string;
    isNewConversation?: boolean;
    recentAction?: string;
}): ToolRecommendation[];
/**
 * Format tool recommendations for injection.
 */
export declare function formatRecommendations(recs: ToolRecommendation[]): string;
//# sourceMappingURL=tool-recommender.d.ts.map