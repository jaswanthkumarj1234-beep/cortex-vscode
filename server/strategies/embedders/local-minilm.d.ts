/**
 * Local MiniLM Embedder — Uses transformers.js for local embeddings.
 * Falls back to a TF-IDF inspired n-gram hasher if model fails to load.
 *
 * The fallback is significantly improved over simple word hashing:
 * - Uses bigrams and trigrams (not just unigrams)
 * - Applies IDF-like weighting (rare words matter more)
 * - Handles code-specific tokens (camelCase splitting, snake_case)
 */
import type { EmbedderStrategy } from '../../types';
export declare class LocalMiniLMEmbedder implements EmbedderStrategy {
    readonly name = "local-minilm";
    private initialized;
    private initPromise;
    private useFallback;
    private readonly DIMS;
    private wordFrequency;
    private totalDocuments;
    embed(text: string): Promise<Float32Array>;
    embedBatch(texts: string[]): Promise<Float32Array[]>;
    private ensureInitialized;
    /**
     * Improved fallback: TF-IDF inspired n-gram hasher.
     * Produces embeddings that capture word meaning through:
     * 1. Unigrams, bigrams, and trigrams
     * 2. camelCase and snake_case token splitting
     * 3. IDF-like weighting (rare terms get higher weight)
     */
    private fallbackEmbed;
    /** Split text into tokens, handling code-specific patterns */
    private tokenize;
    private djb2Hash;
    private fnv1aHash;
}
//# sourceMappingURL=local-minilm.d.ts.map