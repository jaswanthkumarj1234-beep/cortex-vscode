import { MemoryStore } from '../db/memory-store';
export interface ExportEntry {
    file: string;
    name: string;
    kind: 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum' | 'default';
    signature?: string;
}
export interface ExportMap {
    files: Map<string, ExportEntry[]>;
    allExports: ExportEntry[];
    totalFiles: number;
    totalExports: number;
}
/** Build complete export map for the project */
export declare function buildExportMap(workspaceRoot: string): ExportMap;
/** Store export map as memories for AI context injection */
export declare function storeExportMap(memoryStore: MemoryStore, exportMap: ExportMap): number;
/** Format export map for compact context injection */
export declare function formatExportMap(exportMap: ExportMap): string;
/** Find closest matching real export for a hallucinated name */
export declare function suggestRealExport(exportMap: ExportMap, hallucinated: string): string[];
//# sourceMappingURL=export-map.d.ts.map