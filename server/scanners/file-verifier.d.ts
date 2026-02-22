export interface VerificationResult {
    valid: string[];
    invalid: string[];
    suggestions: Record<string, string[]>;
}
export declare class FileVerifier {
    private workspaceRoot;
    private fileIndex;
    private lastIndexTime;
    constructor(workspaceRoot: string);
    /** Build file index (cached, rebuilt every 60s) */
    private buildIndex;
    /** Verify a list of file paths */
    verify(filePaths: string[]): VerificationResult;
    /** Extract file paths from text (AI response) */
    extractPaths(text: string): string[];
    /** Full verification: extract paths from text and verify all */
    verifyText(text: string): VerificationResult;
    /** Get all indexed files (for context injection) */
    getAllFiles(): string[];
}
//# sourceMappingURL=file-verifier.d.ts.map