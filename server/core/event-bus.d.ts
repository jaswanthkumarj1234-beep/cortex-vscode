/**
 * Event Bus — Typed pub/sub for decoupling components.
 */
import type { BrainEvent, EventHandler } from '../types';
export declare class CognitiveEventBus {
    private handlers;
    private globalHandlers;
    /** Subscribe to a specific event type */
    on(eventType: string, handler: EventHandler): void;
    /** Subscribe to ALL events */
    onAll(handler: EventHandler): void;
    /** Unsubscribe from a specific event type */
    off(eventType: string, handler: EventHandler): void;
    /** Emit an event to all matching handlers */
    emit(eventType: string, event: BrainEvent): Promise<void>;
    /** Clear all handlers */
    clear(): void;
}
//# sourceMappingURL=event-bus.d.ts.map