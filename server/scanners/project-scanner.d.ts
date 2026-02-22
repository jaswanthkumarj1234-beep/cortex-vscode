import { MemoryStore } from '../db/memory-store';
export declare class ProjectScanner {
    private memoryStore;
    private workspaceRoot;
    constructor(memoryStore: MemoryStore, workspaceRoot: string);
    /** Check if project was already scanned */
    isAlreadyScanned(): boolean;
    /** Full project scan — returns number of memories created */
    scan(): Promise<number>;
    /** Scan package.json for stack info */
    private scanPackageJson;
    /** Scan README for project purpose */
    private scanReadme;
    /** Scan directory structure (top 3 levels) */
    private scanDirectoryStructure;
    /** Build directory tree string */
    private getDirectoryTree;
    /** Scan config files for conventions */
    private scanConfigFiles;
    /** Scan git log for recent history */
    private scanGitLog;
    /** Scan import chains to build architecture flow */
    private scanArchitecture;
    /** Collect imports from source files */
    private collectImports;
    /** Scan .env files for environment context */
    private scanEnvironment;
    /** Get list of all source files (for file verification) */
    getSourceFiles(): string[];
}
//# sourceMappingURL=project-scanner.d.ts.map