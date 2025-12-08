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
        
        this.texSize = Math.ceil(Math.sqrt(count));
        this.count = this.texSize * this.texSize;

        this.gpuCompute = null;
        this.mesh = null;
    }

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

        const dtPosition = this.gpuCompute.createTexture();
        const dtVelocity = this.gpuCompute.createTexture();
        const dtTarget = this.gpuCompute.createTexture(); 

        this.fillTextures(dtPosition, dtVelocity, dtTarget);

        this.velocityVariable = this.gpuCompute.addVariable("textureVelocity", velocityShader, dtVelocity);
        this.positionVariable = this.gpuCompute.addVariable("texturePosition", positionShader, dtPosition);
        
        this.targetTexture = dtTarget;

        this.gpuCompute.setVariableDependencies(this.velocityVariable, [this.positionVariable, this.velocityVariable]);
        this.gpuCompute.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable]);

        this.velocityUniforms = this.velocityVariable.material.uniforms;
        this.velocityUniforms['uTime'] = { value: 0.0 };
        this.velocityUniforms['uResonance'] = { value: 0.5 };
        this.velocityUniforms['uVitality'] = { value: 0.5 };
        this.velocityUniforms['textureTarget'] = { value: this.targetTexture };
        
        // NEW INTERACTION UNIFORMS
        this.velocityUniforms['uMousePos'] = { value: new THREE.Vector3(0,0,0) };
        this.velocityUniforms['uMouseRadius'] = { value: 5.0 };
        this.velocityUniforms['uMouseStrength'] = { value: 0.0 };
        this.velocityUniforms['uMouseType'] = { value: 0 }; // 0=None
        this.velocityUniforms['uMouseVel'] = { value: new THREE.Vector3(0,0,0) };

        const error = this.gpuCompute.init();
        if (error !== null) {
            console.error("GPGPU Init Error:", error);
        }

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
            posArray[k + 0] = chaosPositions[i * 3];
            posArray[k + 1] = chaosPositions[i * 3 + 1];
            posArray[k + 2] = chaosPositions[i * 3 + 2];
            posArray[k + 3] = 1.0;

            targetArray[k + 0] = chaosPositions[i * 3];
            targetArray[k + 1] = chaosPositions[i * 3 + 1];
            targetArray[k + 2] = chaosPositions[i * 3 + 2];
            targetArray[k + 3] = 1.0;

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
                uColorChaos: { value: new THREE.Color(COLORS.CHAOS) },
                uColorOrder: { value: new THREE.Color(COLORS.ORDER) },
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

    /**
     * Update interaction uniforms
     * @param {Object} params - { point, radius, strength, isRightClick, velocity }
     */
    sculpt(params) {
        if (!this.gpuCompute || !params) {
            // Reset if no params
            if (this.velocityUniforms) this.velocityUniforms['uMouseType'].value = 0;
            return;
        }

        this.velocityUniforms['uMousePos'].value.copy(params.point);
        this.velocityUniforms['uMouseRadius'].value = params.radius * 2.0; // Boost radius for better feel
        this.velocityUniforms['uMouseStrength'].value = params.strength;
        
        if (params.isRightClick) {
            this.velocityUniforms['uMouseType'].value = 1; // GRAVITY
        } else {
            this.velocityUniforms['uMouseType'].value = 2; // FLOW
            // Scale up velocity for visible effect
            this.velocityUniforms['uMouseVel'].value.copy(params.velocity).multiplyScalar(5.0); 
        }
    }

    scramble() {
        this.setShape('scatter', 1.0);
    }

    explode() {}

    update(time, resonance, vitality, stability, evolution, breathCycle) {
        if (!this.gpuCompute) return;

        this.velocityUniforms['uTime'].value = time;
        this.velocityUniforms['uResonance'].value = resonance;
        this.velocityUniforms['uVitality'].value = vitality;

        this.gpuCompute.compute();

        this.renderMaterial.uniforms.texturePosition.value = this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
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