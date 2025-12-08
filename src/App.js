/**
 * MORPHIA - Morphic Field Visualizer
 * Main Application Entry Point (Composition Root)
 */

import { APP_CONFIG, MODES } from './config/constants.js';
import { eventBus, EVENTS } from './utils/eventBus.js';
import { AudioCore } from './audio/index.js';
import { MorphicBrain } from './simulation/MorphicBrain.js';
import { SceneManager, InputController } from './scene/index.js';
import { Swarm, Ether, GhostField } from './particles/index.js';
import { UIController } from './ui/index.js';
import { MorphicNetwork } from './network/morphicNetwork.js';
import { debounce } from './utils/helpers.js';

export class App {
    constructor() {
        this.simplex = new SimplexNoise();
        this.network = new MorphicNetwork(); 

        this.audio = new AudioCore();
        this.brain = new MorphicBrain();
        this.sceneManager = new SceneManager();
        this.inputController = new InputController(this.sceneManager);
        this.uiController = new UIController();

        const scene = this.sceneManager.getScene();
        const renderer = this.sceneManager.getRenderer(); // Required for GPGPU

        this.ghost = new GhostField(scene);
        this.swarm = new Swarm(scene, this.simplex);
        this.swarm.initGPGPU(renderer); // <--- THIS MATCHES THE NEW SWARM CLASS

        this.ether = new Ether(scene, this.simplex);

        this.setupEventHandlers();
        this.animate = this.animate.bind(this);
        this.animate();
    }

    setupEventHandlers() {
        eventBus.on(EVENTS.MODE_CHANGED, (mode) => {
            this.inputController.setMode(mode);
            if (mode === MODES.EXPERIMENTAL) {
                this.swarm.scramble();
                this.ghost.setVisible(false);
            }
        });

        eventBus.on(EVENTS.AUDIO_UNLOCKED, () => this.audio.unlock());
        eventBus.on(EVENTS.AUDIO_TOGGLE, (cb) => cb && cb(this.audio.toggle()));

        eventBus.on(EVENTS.SHAPE_CHANGED, ({ shape, evolution }) => {
            this.swarm.setShape(shape, evolution);
            this.ghost.updateShape(shape, evolution);
            this.brain.reset();
            const params = this.uiController.getParams();
            this.network.tuneIn(shape, params);
        });

        // Network Debounce Fix
        const debouncedTuneIn = debounce((shape, params) => {
            this.network.tuneIn(shape, params);
        }, 500);

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
            debouncedTuneIn(this.uiController.getCurrentShape(), params);
        });

        eventBus.on(EVENTS.DISRUPT, () => {
            this.brain.trauma();
            this.swarm.explode();
        });

        eventBus.on(EVENTS.RESET, () => {
            this.swarm.scramble();
            this.brain.trauma();
        });
    }

    animate() {
        requestAnimationFrame(this.animate);
        const time = performance.now() * 0.001;
        const bioDrift = this.simplex.noise2D(time * 0.05, 42) * 1.5;
        const biologicalTime = time + bioDrift;
        const breathCycle = (Math.sin(biologicalTime * (Math.PI * 2 / 11)) + 1) / 2;
        
        const params = this.uiController.getParams();
        const mode = this.uiController.getMode();
        const morphicBoost = this.network.getResonanceBoost();
        const effectiveResonance = params.resonance + morphicBoost;

        this.inputController.updateIntersection();

        if (mode === MODES.EXPERIMENTAL) {
            const sculptParams = this.inputController.getSculptParams();
            if (sculptParams) {
                this.swarm.sculpt(sculptParams.point, sculptParams.radius, sculptParams.strength);
                if (this.inputController.isPrecisionSculpting()) {
                    this.brain.setStability(Math.min(1.0, this.brain.getStability() + 0.002));
                }
            }
        }

        const stability = this.brain.update(time, effectiveResonance, params.vitality);
        this.swarm.update(time, effectiveResonance, params.vitality, stability, params.evolution, breathCycle);
        this.ether.update(time, params.vitality);

        if (stability > 0.5 && mode === MODES.CLASSIC) {
            const shape = this.uiController.getCurrentShape();
            this.network.reinforce(shape, params);
       }

        this.audio.update(stability, params.vitality, breathCycle);
        this.sceneManager.render();
    }

    dispose() {
        this.audio.dispose();
        this.swarm.dispose();
        this.ether.dispose();
        this.ghost.dispose();
        this.sceneManager.dispose();
    }
}

// Auto-start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}