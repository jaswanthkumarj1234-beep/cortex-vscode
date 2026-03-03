export interface DetectedConvention {
    pattern: string;
    evidence: string;
    confidence: number;
    category: 'functions' | 'variables' | 'imports' | 'errors' | 'naming' | 'structure';
}
/**
 * Scan source files and detect coding conventions.
 */
export declare function detectConventions(workspaceRoot: string): DetectedConvention[];
//# sourceMappingURL=convention-detector.d.ts.map