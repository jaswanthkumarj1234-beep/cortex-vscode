import { MemoryStore } from '../db/memory-store';
export interface ArchNode {
    file: string;
    directory: string;
    imports: string[];
    importedBy: string[];
    isEntryPoint: boolean;
    isLeaf: boolean;
}
export interface ArchLayer {
    name: string;
    directories: string[];
    fileCount: number;
}
export interface ArchGraph {
    nodes: Map<string, ArchNode>;
    layers: ArchLayer[];
    circularDeps: Array<[string, string]>;
    entryPoints: string[];
    leafNodes: string[];
    apiEndpoints: string[];
    totalFiles: number;
}
/** Build full architecture graph for the project */
export declare function buildArchitectureGraph(workspaceRoot: string): ArchGraph;
/** Store architecture graph as memories */
export declare function storeArchitectureGraph(memoryStore: MemoryStore, graph: ArchGraph): number;
/** Format architecture graph for compact context injection */
export declare function formatArchitectureGraph(graph: ArchGraph): string;
//# sourceMappingURL=architecture-graph.d.ts.map