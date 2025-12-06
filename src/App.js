/**
 * MORPHIA - Morphic Field Visualizer
 * Main Application Entry Point (Composition Root)
 *
 * Follows SOLID principles:
 * - Single Responsibility: App class only orchestrates, doesn't implement details
 * - Open/Closed: New features added via new modules, not modifying App
 * - Liskov Substitution: All modules are interchangeable via interfaces
 * - Interface Segregation: Small, focused interfaces per module
 * - Dependency Inversion: High-level App depends on abstractions (modules)
 */

import { APP_CONFIG, MODES } from './config/constants.js';
import { eventBus, EVENTS } from './utils/eventBus.js';
import { AudioCore } from './audio/index.js';
import { MorphicBrain } from './simulation/MorphicBrain.js';
import { SceneManager, InputController } from './scene/index.js';
import { Swarm, Ether, GhostField } from './particles/index.js';
import { UIController } from './ui/index.js';
import { MorphicNetwork } from './network/morphicNetwork.js';

export class App {
    constructor() {
        // Get simplex noise from global (loaded via CDN)
        this.simplex = new SimplexNoise();
        this.network = new MorphicNetwork(); // Initialize the link to the morphic field

        // Initialize core systems
        this.audio = new AudioCore();
        this.brain = new MorphicBrain();
        this.sceneManager = new SceneManager();
        this.inputController = new InputController(this.sceneManager);
        this.uiController = new UIController();

        // Initialize particle systems
        const scene = this.sceneManager.getScene();
        this.ghost = new GhostField(scene);
        this.swarm = new Swarm(scene, this.simplex);
        this.ether = new Ether(scene, this.simplex);

        // Setup event handlers
        this.setupEventHandlers();

        // Start animation loop
        this.animate = this.animate.bind(this);
        this.animate();
    }

    /**
     * Setup event bus handlers
     * @private
     */
    setupEventHandlers() {
        // Mode change
        eventBus.on(EVENTS.MODE_CHANGED, (mode) => {
            this.inputController.setMode(mode);

            if (mode === MODES.EXPERIMENTAL) {
                this.swarm.scramble();
                this.ghost.setVisible(false);
            }
        });

        // Audio unlock
        eventBus.on(EVENTS.AUDIO_UNLOCKED, () => {
            this.audio.unlock();
        });

        // Audio toggle
        eventBus.on(EVENTS.AUDIO_TOGGLE, (callback) => {
            const isOn = this.audio.toggle();
            if (callback) callback(isOn);
        });

        // Shape change
        eventBus.on(EVENTS.SHAPE_CHANGED, ({ shape, evolution }) => {
            this.swarm.setShape(shape, evolution);
            this.ghost.updateShape(shape, evolution);
            this.brain.reset();
            const params = this.uiController.getParams();
            this.network.tuneIn(shape, params);
        });

        // Parameter change
        // 2. When Sliders Move -> Check the Cloud (Debounced ideally, but direct is ok for now)
        eventBus.on(EVENTS.PARAM_CHANGED, ({ key, value }) => {
            if (key === 'evolution' && this.uiController.getMode() === MODES.CLASSIC) {
                const shape = this.uiController.getCurrentShape() || 'scatter';
                this.swarm.setShape(shape, value);
                this.ghost.updateShape(shape, value);
                this.brain.stress(0.1);
            } else {
                this.brain.stress(0.05);
            }
            const params = this.uiController.getParams();
            // Optional: Only tuneIn if they stop dragging for 1s. 
            // For now, let's just update periodically or on mouseUp (if UI supports it).
            // Or simpler: Just update the local params, and let the 'reinforce' loop handle the key gen.
            this.network.tuneIn(this.uiController.getCurrentShape(), params);
        });

        // Disrupt (explosion)
        eventBus.on(EVENTS.DISRUPT, () => {
            this.brain.trauma();
            this.swarm.explode();
        });

        // Reset (experimental mode)
        eventBus.on(EVENTS.RESET, () => {
            this.swarm.scramble();
            this.brain.trauma();
        });
    }

    /**
     * Main animation loop
     * @private
     */
    animate() {
        requestAnimationFrame(this.animate);

        const time = performance.now() * 0.001;
        
        // IMPLANT: Biological Irregularity (Simulated HRV)
        // Instead of a perfect metronome, we warp time slightly using noise.
        // This creates "drift" - the breath cycle will naturally speed up and slow down
        // just like a real living organism.
        // noise factor 0.05 = very slow change (approx every 20 seconds)
        // magnitude 1.5 = pulls the time forward/backward by up to 1.5 seconds
        const bioDrift = this.simplex.noise2D(time * 0.05, 42) * 1.5;
        const biologicalTime = time + bioDrift;

        // Coherent Breathing (11s cycle modulated by bioDrift)
        const breathCycle = (Math.sin(biologicalTime * (Math.PI * 2 / 11)) + 1) / 2;
        
        const params = this.uiController.getParams();
        const mode = this.uiController.getMode();

        // GET THE GLOBAL HABIT STRENGTH
        const morphicBoost = this.network.getResonanceBoost();
        // Pass the boost to the Brain and Swarm
        // We add the boost to the base resonance
        const effectiveResonance = params.resonance + morphicBoost;

        // Update intersection for sculpting
        this.inputController.updateIntersection();

        // Handle sculpting in experimental mode
        if (mode === MODES.EXPERIMENTAL) {
            const sculptParams = this.inputController.getSculptParams();
            if (sculptParams) {
                this.swarm.sculpt(sculptParams.point, sculptParams.radius, sculptParams.strength);

                // Boost stability during precision sculpting
                if (this.inputController.isPrecisionSculpting()) {
                    this.brain.setStability(Math.min(1.0, this.brain.getStability() + 0.002));
                }
            }
        }

        // Update systems
        const stability = this.brain.update(time, effectiveResonance, params.vitality);
        this.swarm.setCameraPos(this.sceneManager.getCamera().position);
        
        // Pass the new organic breathCycle
        this.swarm.update(time, effectiveResonance, params.vitality, stability, params.evolution, breathCycle);
        
        this.ether.update(time, params.vitality);

        // REINFORCEMENT LOOP
        // If the user is holding the field stable (> 0.5) for a while, 
        // they contribute to the global memory.
        if (stability > 0.5 && mode === MODES.CLASSIC) {
            const shape = this.uiController.getCurrentShape();
            this.network.reinforce(shape, params);
       }

        // Update audio (Audio stays synced to the organic irregularity)
        this.audio.update(stability, params.vitality, breathCycle);

        // Render
        this.sceneManager.render();
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.audio.dispose();
        this.swarm.dispose();
        this.ether.dispose();
        this.ghost.dispose();
        this.sceneManager.dispose();
    }
}

// Auto-start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}
