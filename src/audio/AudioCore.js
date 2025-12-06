/**
 * Audio Core Module
 * Handles all audio synthesis and playback
 * Single Responsibility: Audio generation and control
 * Depends on abstraction (SilentAudioBridge interface)
 */

import { SilentAudioBridge } from './SilentAudioBridge.js';
import { AUDIO_CONFIG } from '../config/constants.js';

export class AudioCore {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.isInit = false;
        this.isEnabled = false;
        this.bridge = new SilentAudioBridge();

        // Audio nodes
        this.noiseNode = null;
        this.noiseGain = null;
        this.droneOsc = null;
        this.droneGain = null;
        this.lfo = null;
        this.lfoGain = null;
    }

    /**
     * Unlock audio context (required for mobile browsers)
     * Must be called from user interaction
     */
    unlock() {
        if (this.isInit) return;

        this.bridge.play();

        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.0;
        this.master.connect(this.ctx.destination);

        // Create empty buffer to ensure audio context is running
        const empty = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = empty;
        src.connect(this.ctx.destination);
        src.start(0);

        this.setupLoops();

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isInit = true;
        this.isEnabled = true;

        const t = this.ctx.currentTime;
        this.master.gain.setTargetAtTime(AUDIO_CONFIG.MASTER_GAIN, t, 1.0);
    }

    /**
     * Setup ambient audio loops (noise + drone)
     * @private
     */
    setupLoops() {
        this.setupNoiseLoop();
        this.setupDroneLoop();
    }

    /**
     * Setup brownian noise generator
     * @private
     */
    setupNoiseLoop() {
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }

        this.noiseNode = this.ctx.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        this.noiseGain = this.ctx.createGain();
        this.noiseGain.gain.value = AUDIO_CONFIG.NOISE_GAIN;

        this.noiseNode.connect(this.noiseGain);
        this.noiseGain.connect(this.master);
        this.noiseNode.start();
    }

    /**
     * Setup drone oscillator with LFO modulation
     * @private
     */
    setupDroneLoop() {
        // FREQUENCIES

        // Left Ear (Base)
        this.droneOscL = this.ctx.createOscillator();
        this.droneOscL.type = 'sine';
        this.droneOscL.frequency.value = AUDIO_CONFIG.ROOT_FREQ;

        // Right Ear (Base + 7Hz) -> Brain creates the phantom 7Hz beat
        this.droneOscR = this.ctx.createOscillator();
        this.droneOscR.type = 'sine';
        this.droneOscR.frequency.value = AUDIO_CONFIG.ROOT_FREQ + AUDIO_CONFIG.THETA_BEAT;

        // Stereo Panning
        const merger = this.ctx.createChannelMerger(2);
        this.droneOscL.connect(merger, 0, 0); // Left input
        this.droneOscR.connect(merger, 0, 1); // Right input

        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.value = 0.0;

        merger.connect(this.droneGain);
        this.droneGain.connect(this.master);

        this.droneOscL.start();
        this.droneOscR.start();

        // LFO for subtle frequency modulation
        this.lfo = this.ctx.createOscillator();
        this.lfo.frequency.value = AUDIO_CONFIG.LFO_FREQUENCY;

        this.lfoGain = this.ctx.createGain();
        this.lfoGain.gain.value = AUDIO_CONFIG.LFO_GAIN;

        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.droneGain.gain);
        
        this.lfo.start();
    }

    /**
     * Toggle audio on/off
     * @returns {boolean} New enabled state
     */
    toggle() {
        if (!this.ctx) return false;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isEnabled = !this.isEnabled;
        const t = this.ctx.currentTime;

        if (this.isEnabled) {
            this.master.gain.setTargetAtTime(AUDIO_CONFIG.MASTER_GAIN, t, 0.1);
        } else {
            this.master.gain.setTargetAtTime(0, t, 0.1);
        }

        return this.isEnabled;
    }

    /**
     * Trigger a bell sound
     * @param {number} stability - Current field stability (0-1+)
     */
    triggerBell(stability) {
        if (!this.isInit || !this.isEnabled) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const mod = this.ctx.createOscillator();
        const masterGain = this.ctx.createGain();
        const modGain = this.ctx.createGain();

        const freqs = AUDIO_CONFIG.BELL_FREQUENCIES;
        const freq = freqs[Math.floor(Math.random() * freqs.length)] * (Math.random() > 0.5 ? 0.5 : 1);

        osc.frequency.value = freq;
        mod.frequency.value = freq * 1.5;

        masterGain.gain.setValueAtTime(0, t);
        masterGain.gain.linearRampToValueAtTime(0.1 + (stability * 0.1), t + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.001, t + 4.0 + (stability * 4));

        modGain.gain.setValueAtTime(100, t);
        modGain.gain.exponentialRampToValueAtTime(1, t + 2);

        mod.connect(modGain);
        modGain.connect(osc.frequency);
        osc.connect(masterGain);
        masterGain.connect(this.master);

        osc.start(t);
        mod.start(t);
        osc.stop(t + 8);
        mod.stop(t + 8);
    }

    /**
     * Update audio based on simulation state
     * @param {number} stability - Field stability (0-1+)
     * @param {number} vitality - Field vitality/chaos (0-1)
     * @param {number} breath - Breathing animation factor
     */
    update(stability, vitality, breath) {
        if (!this.isInit) return;

        const targetDrone = 0.1 + (stability * 0.2);
        // Breath-based volume swelling (Oceanic feeling)
        const baseVol = 0.1 + (stability * 0.2);
        const breathVol = baseVol * (0.8 + (breath * 0.4)); // Swells by 40% on inhale
        this.droneGain.gain.setTargetAtTime(breathVol, this.ctx.currentTime, 0.5);

        // Randomly trigger bells based on vitality
        const bellProbability = AUDIO_CONFIG.BELL_PROBABILITY_BASE +
            (vitality * AUDIO_CONFIG.BELL_PROBABILITY_VITALITY_FACTOR);

        if (Math.random() < bellProbability) {
            this.triggerBell(stability);
        }
    }

    /**
     * Cleanup audio resources
     */
    dispose() {
        if (this.ctx) {
            this.ctx.close();
        }
        if (this.bridge) {
            this.bridge.dispose();
        }
    }
}
