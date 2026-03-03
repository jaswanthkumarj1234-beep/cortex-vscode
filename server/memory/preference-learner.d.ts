/**
 * Preference Learner — Learns how the user likes to work.
 *
 * Detects communication and coding preferences from user messages:
 * - Verbose vs concise responses
 * - Asks before changing vs just do it
 * - Wants explanations vs just code
 * - Framework/library preferences
 *
 * Stores as PREFERENCE memories for AI to adapt to.
 */
import { MemoryStore } from '../db/memory-store';
export interface DetectedPreference {
    category: 'communication' | 'coding' | 'workflow' | 'style';
    preference: string;
    confidence: number;
    evidence: string;
}
/**
 * Detect user preferences from their message text.
 * Call this from auto_learn when context is provided.
 */
export declare function detectPreferences(userText: string): DetectedPreference[];
/**
 * Get all stored preferences for injection into force_recall.
 */
export declare function getStoredPreferences(memoryStore: MemoryStore): string;
//# sourceMappingURL=preference-learner.d.ts.map