/**
 * Event Bus - Mediator Pattern Implementation
 * Decouples components by providing publish/subscribe functionality
 * Follows Dependency Inversion Principle
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler to remove
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {*} data - Data to pass to handlers
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Subscribe to an event only once
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (data) => {
            unsubscribe();
            callback(data);
        });
    }
}

// Singleton instance
export const eventBus = new EventBus();

// Event names as constants to prevent typos
export const EVENTS = {
    // Mode events
    MODE_CHANGED: 'mode:changed',

    // Shape events
    SHAPE_CHANGED: 'shape:changed',

    // Parameter events
    PARAM_CHANGED: 'param:changed',

    // Action events
    DISRUPT: 'action:disrupt',
    RESET: 'action:reset',

    // Audio events
    AUDIO_TOGGLE: 'audio:toggle',
    AUDIO_UNLOCKED: 'audio:unlocked',

    // Stability events
    STABILITY_UPDATED: 'stability:updated',

    // Sculpt events
    SCULPT: 'sculpt:apply',
};
