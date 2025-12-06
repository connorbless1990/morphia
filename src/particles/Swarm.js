/**
 * Swarm Module
 * Main particle system for the morphic field visualization
 * Single Responsibility: Particle physics simulation and rendering
 */

import { Architect } from '../geometry/Architect.js';
import { APP_CONFIG, COLORS } from '../config/constants.js';
import { createGlowTexture } from '../utils/helpers.js';

export class Swarm {
    constructor(scene, simplex, count = APP_CONFIG.SWARM_PARTICLE_COUNT) {
        this.count = count;
        this.scene = scene;
        this.simplex = simplex;
        this.architect = new Architect(simplex);

        // Position, velocity, and target arrays
        this.pos = new Float32Array(this.count * 3);
        this.vel = new Float32Array(this.count * 3);
        this.target = new Float32Array(this.count * 3);

        // UNIVERSE TELEPORTER
        // We pick a random point in the infinite 4D noise space to start our simulation.
        // This ensures the "terrain" of the wind is 100% unique every session.
        this.noiseOffset = new THREE.Vector3(
            Math.random() * 10000.0,
            Math.random() * 10000.0,
            Math.random() * 10000.0
        );

        // Initialize with chaos
        this.architect.generateChaos(this.pos, this.count);
        this.architect.generateChaos(this.target, this.count);

        // Create instanced mesh
        this.createMesh();

        // Camera position for billboard effect
        this.cameraPosition = new THREE.Vector3(0, 0, 10);
    }

    /**
     * Create the instanced mesh for particles
     * @private
     */
    createMesh() {
        const tex = createGlowTexture();
        const geo = new THREE.PlaneGeometry(APP_CONFIG.PARTICLE_SIZE, APP_CONFIG.PARTICLE_SIZE);

        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.InstancedMesh(geo, mat, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);

        this.dummy = new THREE.Object3D();
        this.color = new THREE.Color();
    }

    /**
     * Set the target shape
     * @param {string} name - Shape name
     * @param {number} evolution - Evolution factor
     */
    setShape(name, evolution) {
        this.target.set(this.architect.generateTargets(name, this.count, evolution));
    }

    /**
     * Sculpt the field by modifying targets (Morphic Rewriting)
     * @param {THREE.Vector3} point - Sculpt center
     * @param {number} radius - Sculpt radius
     * @param {number} strength - Sculpt strength
     */
    sculpt(point, radius, strength) {
        const rSq = radius * radius;

        for (let i = 0; i < this.count; i++) {
            const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

            // Check distance between particle and brush
            const dx = this.pos[ix] - point.x;
            const dy = this.pos[iy] - point.y;
            const dz = this.pos[iz] - point.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq < rSq) {
                // Calculate influence falloff
                const factor = 1 - (distSq / rSq);

                // Pull TARGET towards mouse (rewrite the blueprint)
                const tx = point.x - this.target[ix];
                const ty = point.y - this.target[iy];
                const tz = point.z - this.target[iz];

                // Move the blueprint closer to mouse
                this.target[ix] += tx * strength * factor;
                this.target[iy] += ty * strength * factor;
                this.target[iz] += tz * strength * factor;

                // Add velocity to "wake up" the particle
                this.vel[ix] += tx * strength * 0.1;
                this.vel[iy] += ty * strength * 0.1;
                this.vel[iz] += tz * strength * 0.1;
            }
        }
    }

    /**
     * Randomize all targets to chaos
     */
    scramble() {
        this.architect.generateChaos(this.target, this.count);
    }

    /**
     * Apply explosive force to all particles
     */
    explode() {
        for (let i = 0; i < this.count; i++) {
            const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
            this.vel[ix] += (Math.random() - 0.5) * 5.0;
            this.vel[iy] += (Math.random() - 0.5) * 5.0;
            this.vel[iz] += (Math.random() - 0.5) * 5.0;
        }
    }

    /**
     * CALCULATE CURL (VORTICITY)
     * Instead of getting the noise value (density), we get the rate of change (slope)
     * and rotate it to find the direction of the flow.
     */
    computeCurl(x, y, z, time) {
        const eps = 0.1; // Epsilon (distance to sample neighbor)

        // Find the "slope" of the noise in all 3 directions
        // Rate of change in Y
        const n1 = this.simplex.noise4D(x, y + eps, z, time); 
        const n2 = this.simplex.noise4D(x, y - eps, z, time); 
        const a = (n1 - n2) / (2 * eps);

        // Rate of change in Z
        const n3 = this.simplex.noise4D(x, y, z + eps, time); 
        const n4 = this.simplex.noise4D(x, y, z - eps, time); 
        const b = (n3 - n4) / (2 * eps);

        // Rate of change in X
        const n5 = this.simplex.noise4D(x + eps, y, z, time); 
        const n6 = this.simplex.noise4D(x - eps, y, z, time); 
        const c = (n5 - n6) / (2 * eps);

        // Curl = (dy/dz - dz/dy, dz/dx - dx/dz, dx/dy - dy/dx)
        // This is the cross product equivalent that creates "Spin"
        return new THREE.Vector3(a - b, b - c, c - a);
    }

    /**
     * Update particle simulation
     * @param {number} time - Current time
     * @param {number} resonance - Field resonance (order)
     * @param {number} vitality - Field vitality (chaos)
     * @param {number} stability - Current stability
     * @param {number} evolution - Evolution factor
     * @param {number} breathCycle - The 0-1 breath cycle value
     */
    update(time, resonance, vitality, stability, evolution, breathCycle) {
        const dt = APP_CONFIG.DELTA_TIME;
        const breath = Math.sin(time * 0.5) * 0.1 + 1.0;
        
        // VISUAL FIX 1: Diminishing returns on stability
        const visualStability = Math.min(stability, 1.2);
        
        // Color interpolation clamp
        const colorStability = Math.min(stability, 1.0);

        // Dynamic grip - high vitality weakens resonance
        const chaosDampener = 1.0 - (vitality * 0.8);
        
        // VISUAL FIX 2: Clamp the maximum attraction force
        const gravityCap = 1.0 + Math.min(stability, 1.5); 
        const effectiveResonance = Math.max(resonance, 0.2) * gravityCap * chaosDampener;

        // Color interpolation
        const colorChaos = new THREE.Color(COLORS.CHAOS);
        const colorOrder = new THREE.Color(COLORS.ORDER);
        const currentColor = new THREE.Color().lerpColors(colorChaos, colorOrder, colorStability);

        // VISUAL FIX 3: Dynamic Field Scaling (Zoom In)
        // As evolution increases, we lower the field scale to keep structures large
        const timeScale = time * (0.2 * evolution);
        const fieldScale = 0.15 / (1.0 + (evolution * 0.5)); 
        
        const fieldStrength = 0.5 + (vitality * 2.0);
        const breathScale = 1.0 + (breathCycle * (0.15 + (visualStability * 0.05)));

        for (let i = 0; i < this.count; i++) {
            const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

            // 1. ATTRACTION (The Blueprint)
            // Apply breath to the target position
            let fx = (this.target[ix] * breathScale - this.pos[ix]) * effectiveResonance * 5.0;
            let fy = (this.target[iy] * breathScale - this.pos[iy]) * effectiveResonance * 5.0;
            let fz = (this.target[iz] * breathScale - this.pos[iz]) * effectiveResonance * 5.0;

            // 2. VORTICITY (The Natural Flow)
            // Calculate Curl Noise instead of Standard Noise
            const curl = this.computeCurl(
                (this.pos[ix] * fieldScale) + this.noiseOffset.x, 
                (this.pos[iy] * fieldScale) + this.noiseOffset.y, 
                (this.pos[iz] * fieldScale) + this.noiseOffset.z, 
                timeScale
            );

            // Apply the curl as the chaotic force
            fx += curl.x * vitality * fieldStrength;
            fy += curl.y * vitality * fieldStrength;
            fz += curl.z * vitality * fieldStrength;

            // Containment force
            const d2 = this.pos[ix] * this.pos[ix] +
                       this.pos[iy] * this.pos[iy] +
                       this.pos[iz] * this.pos[iz];

            if (d2 > APP_CONFIG.CONTAINMENT_RADIUS_SQ) {
                const pull = -0.01;
                fx += this.pos[ix] * pull;
                fy += this.pos[iy] * pull;
                fz += this.pos[iz] * pull;
            }

            // Apply forces
            this.vel[ix] += fx * dt;
            this.vel[iy] += fy * dt;
            this.vel[iz] += fz * dt;

            // Friction (increases with chaos)
            const fric = APP_CONFIG.FRICTION_BASE - (vitality * APP_CONFIG.FRICTION_CHAOS_FACTOR);
            this.vel[ix] *= fric;
            this.vel[iy] *= fric;
            this.vel[iz] *= fric;

            // Update position
            this.pos[ix] += this.vel[ix];
            this.pos[iy] += this.vel[iy];
            this.pos[iz] += this.vel[iz];

            // Update instance
            this.dummy.position.set(this.pos[ix], this.pos[iy], this.pos[iz]);
            this.dummy.lookAt(this.cameraPosition);
            
            // Scale clamped by visualStability
            const s = (0.5 + (visualStability * 0.5)) * (0.8 + (breath * 0.4));
            
            this.dummy.scale.set(s, s, s);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
            this.mesh.setColorAt(i, currentColor);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        this.mesh.instanceColor.needsUpdate = true;
    }

    /**
     * Set camera position for billboard effect
     */
    setCameraPos(pos) {
        this.cameraPosition = pos;
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
