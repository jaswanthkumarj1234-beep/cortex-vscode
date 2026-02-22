"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveEventBus = void 0;
class CognitiveEventBus {
    handlers = new Map();
    globalHandlers = new Set();
    /** Subscribe to a specific event type */
    on(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        this.handlers.get(eventType).add(handler);
    }
    /** Subscribe to ALL events */
    onAll(handler) {
        this.globalHandlers.add(handler);
    }
    /** Unsubscribe from a specific event type */
    off(eventType, handler) {
        this.handlers.get(eventType)?.delete(handler);
    }
    /** Emit an event to all matching handlers */
    async emit(eventType, event) {
        const typeHandlers = this.handlers.get(eventType);
        const promises = [];
        if (typeHandlers) {
            for (const handler of typeHandlers) {
                const result = handler(event);
                if (result instanceof Promise) {
                    promises.push(result);
                }
            }
        }
        for (const handler of this.globalHandlers) {
            const result = handler(event);
            if (result instanceof Promise) {
                promises.push(result);
            }
        }
        if (promises.length > 0) {
            await Promise.allSettled(promises);
        }
    }
    /** Clear all handlers */
    clear() {
        this.handlers.clear();
        this.globalHandlers.clear();
    }
}
exports.CognitiveEventBus = CognitiveEventBus;
//# sourceMappingURL=event-bus.js.map