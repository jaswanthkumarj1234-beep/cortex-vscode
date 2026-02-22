export interface FeatureLimits {
    maxMemories: number;
    brainLayers: boolean;
    autoLearn: boolean;
    exportMap: boolean;
    architectureGraph: boolean;
    gitMemory: boolean;
    contradictionDetection: boolean;
    confidenceDecay: boolean;
    memoryConsolidation: boolean;
    attentionRanking: boolean;
    anticipation: boolean;
    knowledgeGaps: boolean;
    temporalContext: boolean;
    crossSessionThreading: boolean;
}
/** Get current feature limits based on license */
export declare function getFeatureLimits(): FeatureLimits;
/** Check if a specific feature is allowed */
export declare function isFeatureAllowed(feature: keyof FeatureLimits): boolean;
/** Check if user can store more memories */
export declare function canStoreMemory(currentCount: number): {
    allowed: boolean;
    message: string;
};
/** Get upgrade message for gated features */
export declare function getUpgradeMessage(feature: string): string;
/** Format plan status for display */
export declare function formatPlanStatus(): string;
//# sourceMappingURL=feature-gate.d.ts.map