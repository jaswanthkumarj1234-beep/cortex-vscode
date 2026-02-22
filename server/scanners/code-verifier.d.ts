export interface CodeVerificationResult {
    imports: {
        valid: string[];
        invalid: string[];
        suggestions: Record<string, string[]>;
    };
    exports: {
        valid: string[];
        invalid: string[];
        available: Record<string, string[]>;
    };
    envVars: {
        valid: string[];
        invalid: string[];
        available: string[];
    };
}
export declare class ImportVerifier {
    private workspaceRoot;
    private installedPackages;
    private declaredDeps;
    constructor(workspaceRoot: string);
    private loadPackageJson;
    private scanNodeModules;
    /** Verify a list of package names */
    verify(packages: string[]): {
        valid: string[];
        invalid: string[];
        suggestions: Record<string, string[]>;
    };
    /** Extract import package names from code text */
    extractImports(text: string): string[];
    private isNodeBuiltin;
    private findSimilar;
    private levenshteinClose;
}
export declare class ExportVerifier {
    private workspaceRoot;
    constructor(workspaceRoot: string);
    /** Check if specific named exports exist in a source file */
    verifyExports(filePath: string, names: string[]): {
        valid: string[];
        invalid: string[];
        available: string[];
    };
    /** Extract all exported names from a TypeScript/JavaScript file */
    extractExports(content: string): string[];
    /** Extract import-from-file statements from text */
    extractLocalImports(text: string): Array<{
        names: string[];
        file: string;
    }>;
    private resolveFile;
}
export declare class ConfigVerifier {
    private workspaceRoot;
    private envVars;
    constructor(workspaceRoot: string);
    private loadEnvFiles;
    /** Extract env variable references from code */
    extractEnvRefs(text: string): string[];
    /** Verify env variable references */
    verify(varNames: string[]): {
        valid: string[];
        invalid: string[];
        available: string[];
    };
}
export declare function verifyCode(text: string, workspaceRoot: string): CodeVerificationResult;
//# sourceMappingURL=code-verifier.d.ts.map