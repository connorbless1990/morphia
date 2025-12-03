/**
 * Ether Module
 * Background particle flow field visualization
 * Single Responsibility: Ambient background particle effects
 */

import { APP_CONFIG, COLORS } from '../config/constants.js';

export class Ether {
    constructor(scene, simplex, count = APP_CONFIG.ETHER_PARTICLE_COUNT) {
        this.count = count;
        this.simplex = simplex;
        this.pos = new Float32Array(count * 3);

        // Initialize random positions in a large volume
        for (let i = 0; i < count; i++) {
            this.pos[i * 3] = (Math.random() - 0.5) * 100.0;
            this.pos[i * 3 + 1] = (Math.random() - 0.5) * 60.0;
            this.pos[i * 3 + 2] = (Math.random() - 0.5) * 60.0;
        }

        this.createMesh(scene);
    }

    /**
     * Create the instanced mesh for ether particles
     * @param {THREE.Scene} scene - Three.js scene
     * @private
     */
    createMesh(scene) {
        const geo = new THREE.PlaneGeometry(
            APP_CONFIG.ETHER_PARTICLE_SIZE,
            APP_CONFIG.ETHER_PARTICLE_SIZE
        );

        const mat = new THREE.MeshBasicMaterial({
            color: COLORS.ETHER,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.InstancedMesh(geo, mat, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(this.mesh);

        this.dummy = new THREE.Object3D();
    }

    /**
     * Update ether particles based on flow field
     * @param {number} time - Current time
     * @param {number} vitality - Field vitality affecting flow speed
     */
    update(time, vitality) {
        const dt = APP_CONFIG.DELTA_TIME;
        const fieldScale = 0.15;
        const fieldStrength = 2.5;
        const limitX = 50, limitY = 30, limitZ = 30;

        for (let i = 0; i < this.count; i++) {
            const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

            // 4D noise for smooth flow field
            const nx = this.simplex.noise4D(
                this.pos[ix] * fieldScale,
                this.pos[iy] * fieldScale,
                this.pos[iz] * fieldScale,
                time * 0.2
            );
            const ny = this.simplex.noise4D(
                this.pos[ix] * fieldScale,
                this.pos[iy] * fieldScale + 100,
                this.pos[iz] * fieldScale,
                time * 0.2
            );
            const nz = this.simplex.noise4D(
                this.pos[ix] * fieldScale,
                this.pos[iy] * fieldScale + 200,
                this.pos[iz] * fieldScale,
                time * 0.2
            );

            // Apply flow
            this.pos[ix] += nx * vitality * fieldStrength * dt;
            this.pos[iy] += ny * vitality * fieldStrength * dt;
            this.pos[iz] += nz * vitality * fieldStrength * dt;

            // Wrap around boundaries
            if (this.pos[ix] > limitX) this.pos[ix] = -limitX;
            if (this.pos[ix] < -limitX) this.pos[ix] = limitX;
            if (this.pos[iy] > limitY) this.pos[iy] = -limitY;
            if (this.pos[iy] < -limitY) this.pos[iy] = limitY;
            if (this.pos[iz] > limitZ) this.pos[iz] = -limitZ;
            if (this.pos[iz] < -limitZ) this.pos[iz] = limitZ;

            // Update instance matrix
            this.dummy.position.set(this.pos[ix], this.pos[iy], this.pos[iz]);
            this.dummy.lookAt(this.dummy.position.clone().add(new THREE.Vector3(0, 0, 1)));
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
