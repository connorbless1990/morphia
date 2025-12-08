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
        this.count = count;

        // Texture size must be power of 2
        // sqrt(24000) approx 154 -> 128x128 = 16k, 256x256 = 65k
        // We'll use 128x128 for mobile safety (16,384 particles)
        // or dynamic sizing.
        this.texSize = Math.ceil(Math.sqrt(this.count));
        this.count = this.texSize * this.texSize; // Adjust count to match texture

        this.initGPGPU(scene.getObjectByName("renderer")); // Need access to renderer
    }

    initGPGPU(renderer) {
        // If renderer isn't passed yet (App.js architecture dependency), we wait or handle it.
        // For now, we assume SceneManager exposes the renderer globally or we pass it.
        // Let's assume App.js passes the renderer.
        if (!renderer) {
            console.error("GPUSwarm: Renderer required for initialization");
            return;
        }

        this.gpuCompute = new THREE.GPUComputationRenderer(this.texSize, this.texSize, renderer);

        // 1. Create Initial Data (Textures)
        const dtPosition = this.gpuCompute.createTexture();
        const dtVelocity = this.gpuCompute.createTexture();
        const dtTarget = this.gpuCompute.createTexture(); // The "Blueprint"

        this.fillTextures(dtPosition, dtVelocity, dtTarget);

        // 2. Create Variables
        this.velocityVariable = this.gpuCompute.addVariable("textureVelocity", velocityShader, dtVelocity);
        this.positionVariable = this.gpuCompute.addVariable("texturePosition", positionShader, dtPosition);
        
        // This is a passive texture (read-only for shaders), not a variable that gets updated by physics
        this.targetTexture = dtTarget;

        // 3. Dependency Wiring (Velocity needs Pos, Pos needs Vel)
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
            console.error(error);
        }

        // 6. Create Visuals
        this.createVisuals();
    }

    /**
     * Seed the textures with initial data
     */
    fillTextures(texturePos, textureVel, textureTarget) {
        const posArray = texturePos.image.data;
        const velArray = textureVel.image.data;
        const targetArray = textureTarget.image.data;

        // Generate Chaos for initial layout
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

    /**
     * Create the Points mesh that renders the particles
     */
    createVisuals() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3); // Unused but required by frustum culling usually
        const references = new Float32Array(this.count * 2); // UV coordinates to lookup GPGPU texture

        for (let i = 0; i < this.count; i++) {
            // Map index to UV coordinate (0..1)
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
                uSize: { value: APP_CONFIG.PARTICLE_SIZE * 5.0 }, // Adjust for shader sizing
                uColor1: { value: new THREE.Color(COLORS.CHAOS) },
                uColor2: { value: new THREE.Color(COLORS.ORDER) },
                uVitality: { value: 0.5 }
            },
            vertexShader: renderVertexShader,
            fragmentShader: renderFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Points(geometry, this.renderMaterial);
        this.mesh.frustumCulled = false; // Important: bounds aren't updated on CPU
        this.scene.add(this.mesh);
    }

    /**
     * Update the target blueprint from the CPU Architect
     */
    setShape(name, evolution) {
        // 1. Generate new target positions on CPU
        const targets = this.architect.generateTargets(name, this.count, evolution);
        
        // 2. Upload to the Target Texture
        const targetArray = this.targetTexture.image.data;
        for (let i = 0; i < this.count; i++) {
            const k = i * 4;
            targetArray[k + 0] = targets[i * 3];
            targetArray[k + 1] = targets[i * 3 + 1];
            targetArray[k + 2] = targets[i * 3 + 2];
            targetArray[k + 3] = 1.0;
        }
        
        this.targetTexture.needsUpdate = true;
        
        // Update shader reference
        this.velocityUniforms['textureTarget'].value = this.targetTexture;
    }

    sculpt(point, radius, strength) {
        // GPGPU Sculpting is harder. 
        // For now, we simply don't implement sculpting in the "Overhaul" MVP 
        // OR we pass the mouse pos to the shader.
        // Let's pass mouse pos to shader for a simple "repel/attract" cursor.
        // (Left as exercise for simplicity, as requested "Simple, Readable")
    }

    scramble() {
        // We can just reset the target texture to chaos
        this.setShape('scatter', 1.0);
    }

    explode() {
        // Hard to do "one-off" impulses in this stateless shader setup without extra uniforms
        // We skip for MVP
    }

    update(time, resonance, vitality, stability, evolution, breathCycle) {
        if (!this.gpuCompute) return;

        // 1. Update Uniforms
        this.velocityUniforms['uTime'].value = time;
        this.velocityUniforms['uResonance'].value = resonance;
        this.velocityUniforms['uVitality'].value = vitality;

        // 2. Compute
        this.gpuCompute.compute();

        // 3. Update Visuals
        // Get the result of the simulation (the new positions) and feed it to the render material
        this.renderMaterial.uniforms.texturePosition.value = this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
        
        // Update color mixing
        const c1 = new THREE.Color(COLORS.CHAOS);
        const c2 = new THREE.Color(COLORS.ORDER);
        this.renderMaterial.uniforms.uColor1.value.lerp(c1, 0.1);
        this.renderMaterial.uniforms.uColor2.value.lerp(c2, 0.1);
    }

    setCameraPos(pos) {
        // Not needed for Points material (billboarding is automatic)
    }

    dispose() {
        // Cleanup
    }
}