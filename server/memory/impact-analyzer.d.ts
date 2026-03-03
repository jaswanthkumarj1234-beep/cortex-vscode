export interface ImpactResult {
    targetFile: string;
    directDependents: string[];
    indirectDependents: string[];
    totalImpact: number;
    exports: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
/**
 * Analyze the impact of changing a file.
 * Scans for import statements that reference the target file.
 */
export declare function analyzeImpact(targetFile: string, workspaceRoot: string): ImpactResult;
/** Format impact analysis for AI consumption */
export declare function formatImpact(result: ImpactResult): string;
//# sourceMappingURL=impact-analyzer.d.ts.map