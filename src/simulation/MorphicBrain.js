/**
 * Morphic Brain Module
 * Manages field stability and coherence tracking
 * Single Responsibility: Track and calculate stability state
 */

import { APP_CONFIG, COLORS } from '../config/constants.js';
import { eventBus, EVENTS } from '../utils/eventBus.js';

export class MorphicBrain {
    constructor() {
        this.stability = 0;
        this.startTime = 0;
    }

    /**
     * Reset stability to zero (fresh start)
     */
    reset() {
        this.stability = 0;
        this.startTime = performance.now() * 0.001;
    }

    /**
     * Apply trauma - completely destabilize the field
     */
    trauma() {
        this.stability = 0;
        this.startTime = performance.now() * 0.001;
    }

    /**
     * Apply stress - reduce stability by amount
     * @param {number} amount - Amount of stress to apply
     */
    stress(amount) {
        this.stability = Math.max(0, this.stability - amount);
        this.startTime = performance.now() * 0.001 - (this.stability * APP_CONFIG.STABILITY_DURATION);
    }

    /**
     * Update stability based on time and field parameters
     * @param {number} time - Current time in seconds
     * @param {number} resonance - Field resonance (order)
     * @param {number} vitality - Field vitality (chaos)
     * @returns {number} Current stability value
     */
    update(time, resonance, vitality) {
        // If chaos exceeds order, stability degrades
        if (vitality > resonance + 0.1) {
            this.stability = Math.max(0, this.stability - 0.005);
            this.startTime = time - (this.stability * APP_CONFIG.STABILITY_DURATION);
            this.updateUI();
            return this.stability;
        }

        // Calculate stability based on time held in coherent state
        const age = time - this.startTime;
        this.stability = age / APP_CONFIG.STABILITY_DURATION;

        this.updateUI();

        return this.stability;
    }

    /**
     * Update DOM elements with current stability
     * @private
     */
    updateUI() {
        const stabilityEl = document.getElementById('field-stability');
        const barEl = document.getElementById('stability-bar');

        if (stabilityEl) {
            stabilityEl.innerText = Math.floor(this.stability * 100) + "%";
        }

        if (barEl) {
            const barWidth = Math.min(this.stability * 100, 100);
            barEl.style.width = barWidth + "%";

            if (this.stability > 1.0) {
                // Transcendent state - white glow
                barEl.style.backgroundColor = COLORS.STABILITY_TRANSCENDENT;
                barEl.style.boxShadow = `0 0 ${10 + (this.stability * 5)}px ${COLORS.STABILITY_TRANSCENDENT}`;
            } else {
                barEl.style.backgroundColor = COLORS.STABILITY_NORMAL;
                barEl.style.boxShadow = `0 0 8px ${COLORS.STABILITY_NORMAL}`;
            }
        }

        // Emit event for other modules that might need stability updates
        eventBus.emit(EVENTS.STABILITY_UPDATED, this.stability);
    }

    /**
     * Get current stability value
     * @returns {number} Current stability (0 to 1+)
     */
    getStability() {
        return this.stability;
    }

    /**
     * Directly set stability (used for sculpting)
     * @param {number} value - New stability value
     */
    setStability(value) {
        this.stability = Math.max(0, value);
    }
}
