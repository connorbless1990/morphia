/**
 * GPUSwarm Module
 * High-performance GPGPU particle system
 * Replaces the CPU-bound Swarm.js
 */

import { Architect } from '../geometry/Architect.js';
import { APP_CONFIG, COLORS } from '../config/constants.js';
import { velocityShader, positionShader, renderVertexShader, renderFragmentShader } from '../shaders/simulationShaders.js';

export class Swarm {
    constructor(scene, simplex, count = APP_CONFIG.SWARM_PARTICLE_COUNT) {
        this.scene = scene;
        this.simplex = simplex;
        this.architect = new Architect(simplex);
        
        // Texture size must be power of 2
        this.texSize = Math.ceil(Math.sqrt(count));
        this.count = this.texSize * this.texSize;

        this.gpuCompute = null;
        this.mesh = null;
    }

    /**
     * Explicit initialization requiring the renderer
     */
    initGPGPU(renderer) {
        if (!renderer) {
            console.error("GPUSwarm: Renderer required for initialization");
            return;
        }

        try {
            this.gpuCompute = new THREE.GPUComputationRenderer(this.texSize, this.texSize, renderer);
        } catch (e) {
            console.warn("GPGPU not supported on this device.", e);
            return;
        }

        // 1. Create Initial Data (Textures)
        const dtPosition = this.gpuCompute.createTexture();
        const dtVelocity = this.gpuCompute.createTexture();
        const dtTarget = this.gpuCompute.createTexture(); 

        this.fillTextures(dtPosition, dtVelocity, dtTarget);

        // 2. Create Variables
        this.velocityVariable = this.gpuCompute.addVariable("textureVelocity", velocityShader, dtVelocity);
        this.positionVariable = this.gpuCompute.addVariable("texturePosition", positionShader, dtPosition);
        
        this.targetTexture = dtTarget;

        // 3. Dependency Wiring
        this.gpuCompute.setVariableDependencies(this.velocityVariable, [this.positionVariable, this.velocityVariable]);
        this.gpuCompute.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable]);

        // 4. Uniforms
        this.velocityUniforms = this.velocityVariable.material.uniforms;
        this.velocityUniforms['uTime'] = { value: 0.0 };
        this.velocityUniforms['uResonance'] = { value: 0.5 };
        this.velocityUniforms['uVitality'] = { value: 0.5 };
        this.velocityUniforms['textureTarget'] = { value: this.targetTexture };

        // 5. Initialize
        const error = this.gpuCompute.init();
        if (error !== null) {
            console.error("GPGPU Init Error:", error);
        }

        // 6. Create Visuals
        this.createVisuals();
    }

    fillTextures(texturePos, textureVel, textureTarget) {
        const posArray = texturePos.image.data;
        const velArray = textureVel.image.data;
        const targetArray = textureTarget.image.data;

        const chaosPositions = new Float32Array(this.count * 3);
        this.architect.generateChaos(chaosPositions, this.count);

        for (let k = 0, kl = posArray.length; k < kl; k += 4) {
            const i = k / 4;
            // Position (Chaos)
            posArray[k + 0] = chaosPositions[i * 3];
            posArray[k + 1] = chaosPositions[i * 3 + 1];
            posArray[k + 2] = chaosPositions[i * 3 + 2];
            posArray[k + 3] = 1.0;

            // Target (Same as pos initially)
            targetArray[k + 0] = chaosPositions[i * 3];
            targetArray[k + 1] = chaosPositions[i * 3 + 1];
            targetArray[k + 2] = chaosPositions[i * 3 + 2];
            targetArray[k + 3] = 1.0;

            // Velocity (Zero)
            velArray[k + 0] = 0;
            velArray[k + 1] = 0;
            velArray[k + 2] = 0;
            velArray[k + 3] = 1.0;
        }
    }

    createVisuals() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3); 
        const references = new Float32Array(this.count * 2); 

        for (let i = 0; i < this.count; i++) {
            const x = (i % this.texSize) / this.texSize;
            const y = Math.floor(i / this.texSize) / this.texSize;
            references[i * 2] = x;
            references[i * 2 + 1] = y;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('reference', new THREE.BufferAttribute(references, 2));

        this.renderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                texturePosition: { value: null },
                uSize: { value: APP_CONFIG.PARTICLE_SIZE * 1.5 }, 
                // COLOR FIX: Explicit colors for Chaos (Red) and Order (Cyan)
                uColorChaos: { value: new THREE.Color(COLORS.CHAOS) },
                uColorOrder: { value: new THREE.Color(COLORS.ORDER) },
                // STABILITY FIX: Dynamic value to control the mix
                uStability: { value: 0.0 }
            },
            vertexShader: renderVertexShader,
            fragmentShader: renderFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Points(geometry, this.renderMaterial);
        this.mesh.frustumCulled = false; 
        this.scene.add(this.mesh);
    }

    setShape(name, evolution) {
        if (!this.targetTexture) return;

        const targets = this.architect.generateTargets(name, this.count, evolution);
        const targetArray = this.targetTexture.image.data;
        for (let i = 0; i < this.count; i++) {
            const k = i * 4;
            targetArray[k + 0] = targets[i * 3];
            targetArray[k + 1] = targets[i * 3 + 1];
            targetArray[k + 2] = targets[i * 3 + 2];
            targetArray[k + 3] = 1.0;
        }
        
        this.targetTexture.needsUpdate = true;
        this.velocityUniforms['textureTarget'].value = this.targetTexture;
    }

    sculpt(point, radius, strength) {
    }

    scramble() {
        this.setShape('scatter', 1.0);
    }

    explode() {
    }

    update(time, resonance, vitality, stability, evolution, breathCycle) {
        if (!this.gpuCompute) return;

        this.velocityUniforms['uTime'].value = time;
        this.velocityUniforms['uResonance'].value = resonance;
        this.velocityUniforms['uVitality'].value = vitality;

        this.gpuCompute.compute();

        this.renderMaterial.uniforms.texturePosition.value = this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
        
        // CRITICAL FIX: Pass stability to the fragment shader
        // This makes the particles RED when unstable and BLUE when stable
        this.renderMaterial.uniforms.uStability.value = stability;
    }

    setCameraPos(pos) {}

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}