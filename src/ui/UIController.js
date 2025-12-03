/**
 * UI Controller Module
 * Handles all DOM interactions and UI state
 * Single Responsibility: UI event handling and state management
 */

import { eventBus, EVENTS } from '../utils/eventBus.js';
import { MODES, APP_CONFIG } from '../config/constants.js';
import { togglePanel } from '../utils/helpers.js';

export class UIController {
    constructor() {
        this.mode = MODES.CLASSIC;
        this.currentShape = null;
        this.params = {
            resonance: APP_CONFIG.DEFAULT_RESONANCE,
            vitality: APP_CONFIG.DEFAULT_VITALITY,
            evolution: APP_CONFIG.DEFAULT_EVOLUTION
        };

        this.setupEventListeners();
        this.setupMobileOptimizations();
    }

    /**
     * Setup all UI event listeners
     * @private
     */
    setupEventListeners() {
        this.setupModeButtons();
        this.setupInfoModal();
        this.setupSliders();
        this.setupShapeButtons();
        this.setupActionButtons();
    }

    /**
     * Setup mode selection buttons
     * @private
     */
    setupModeButtons() {
        const classicBtn = document.getElementById('btn-classic');
        const experimentalBtn = document.getElementById('btn-experimental');

        if (classicBtn) {
            classicBtn.addEventListener('click', () => this.startMode(MODES.CLASSIC));
        }
        if (experimentalBtn) {
            experimentalBtn.addEventListener('click', () => this.startMode(MODES.EXPERIMENTAL));
        }
    }

    /**
     * Start a visualization mode
     * @param {string} mode - Mode to start
     * @private
     */
    startMode(mode) {
        this.mode = mode;

        // Emit audio unlock event
        eventBus.emit(EVENTS.AUDIO_UNLOCKED);

        // Update audio button
        const btn = document.getElementById('audio-toggle');
        if (btn) {
            btn.innerText = "AUDIO ACTIVE";
            btn.classList.add('text-green-400');
        }

        // Hide overlay
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.style.display = 'none', 1500);
        }

        // Update status
        const status = document.getElementById('field-status');
        if (status) {
            status.innerText = mode === MODES.CLASSIC ? "SCATTER" : "VOID";
        }

        // Mode-specific UI changes
        if (mode === MODES.EXPERIMENTAL) {
            this.setupExperimentalMode();
        }

        // Emit mode change event
        eventBus.emit(EVENTS.MODE_CHANGED, mode);
    }

    /**
     * Setup UI for experimental mode
     * @private
     */
    setupExperimentalMode() {
        const status = document.getElementById('field-status');
        if (status) {
            status.innerText = "QUANTUM";
        }

        const archetypes = document.getElementById('panel-archetypes');
        if (archetypes) {
            archetypes.classList.add('hidden');
        }

        const experimental = document.getElementById('panel-experimental');
        if (experimental) {
            experimental.classList.remove('hidden');
        }

        const tip = document.getElementById('exp-tip');
        if (tip) {
            tip.classList.remove('hidden');
        }
    }

    /**
     * Setup info modal
     * @private
     */
    setupInfoModal() {
        const modal = document.getElementById('info-modal');
        const openBtn = document.getElementById('open-info');
        const closeBtn = document.getElementById('close-info');

        if (openBtn && modal) {
            openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        }
    }

    /**
     * Setup parameter sliders
     * @private
     */
    setupSliders() {
        this.linkSlider('resonance', 'resonance');
        this.linkSlider('vitality', 'vitality');
        this.linkSlider('evolution', 'evolution');
    }

    /**
     * Link a slider to a parameter
     * @param {string} id - Slider element ID
     * @param {string} key - Parameter key
     * @private
     */
    linkSlider(id, key) {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById('val-' + id);

        if (!slider) return;

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.params[key] = value;

            if (valueDisplay) {
                valueDisplay.innerText = value.toFixed(2);
            }

            eventBus.emit(EVENTS.PARAM_CHANGED, { key, value });
        });
    }

    /**
     * Setup shape selection buttons
     * @private
     */
    setupShapeButtons() {
        document.querySelectorAll('.geo-btn[data-shape]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const shape = e.target.dataset.shape;
                this.currentShape = shape;

                // Update UI
                const status = document.getElementById('field-status');
                if (status) {
                    status.innerText = shape.toUpperCase();
                }

                // Update active state
                document.querySelectorAll('.geo-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Emit shape change event
                eventBus.emit(EVENTS.SHAPE_CHANGED, { shape, evolution: this.params.evolution });
            });
        });
    }

    /**
     * Setup action buttons
     * @private
     */
    setupActionButtons() {
        // Reset button (experimental mode)
        const resetBtn = document.getElementById('exp-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                eventBus.emit(EVENTS.RESET);
            });
        }

        // Audio toggle
        const audioBtn = document.getElementById('audio-toggle');
        if (audioBtn) {
            audioBtn.addEventListener('click', (e) => {
                eventBus.emit(EVENTS.AUDIO_TOGGLE, (isOn) => {
                    e.target.innerText = isOn ? "AUDIO ACTIVE" : "AUDIO MUTED";
                    e.target.classList.toggle('text-green-400', isOn);
                });
            });
        }

        // Disrupt button
        const disruptBtn = document.getElementById('disrupt-btn');
        if (disruptBtn) {
            disruptBtn.addEventListener('click', () => {
                eventBus.emit(EVENTS.DISRUPT);
            });
        }
    }

    /**
     * Setup mobile-specific optimizations
     * @private
     */
    setupMobileOptimizations() {
        if (window.innerWidth < APP_CONFIG.MOBILE_BREAKPOINT) {
            togglePanel('panel-controls');
        }
    }

    /**
     * Get current parameters
     * @returns {{ resonance: number, vitality: number, evolution: number }}
     */
    getParams() {
        return { ...this.params };
    }

    /**
     * Get current mode
     * @returns {string}
     */
    getMode() {
        return this.mode;
    }

    /**
     * Get current shape
     * @returns {string|null}
     */
    getCurrentShape() {
        return this.currentShape;
    }
}
