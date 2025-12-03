/**
 * Ghost Field Module
 * Wireframe visualization of the target shape
 * Single Responsibility: Display target shape wireframe
 */

import { COLORS, SHAPE_NAMES } from '../config/constants.js';

export class GhostField {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;

        this.material = new THREE.MeshBasicMaterial({
            color: COLORS.GHOST_FIELD,
            wireframe: true,
            transparent: true,
            opacity: 0.05,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    /**
     * Update the ghost field to show a new shape
     * @param {string} name - Shape name
     * @param {number} evolution - Evolution factor (unused for ghosts but kept for interface consistency)
     */
    updateShape(name, evolution) {
        // Cleanup previous mesh
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            this.mesh = null;
        }

        const s = 1.0;
        let geo;

        switch (name) {
            case SHAPE_NAMES.TORUS:
                geo = new THREE.TorusKnotGeometry(2.5 * s, 0.6, 120, 20);
                break;
            case SHAPE_NAMES.SPHERE:
                geo = new THREE.SphereGeometry(3.0 * s, 32, 32);
                break;
            case SHAPE_NAMES.DODECA:
                geo = new THREE.DodecahedronGeometry(3.5 * s, 0);
                break;
            case SHAPE_NAMES.ICOSA:
                geo = new THREE.IcosahedronGeometry(3.5 * s, 0);
                break;
            case SHAPE_NAMES.FLOWER:
                geo = new THREE.IcosahedronGeometry(3.0 * s, 1);
                break;
            case SHAPE_NAMES.TREE:
                this.createTreeGhost(s);
                return;
            case SHAPE_NAMES.KUNDALINI:
                this.createKundaliniGhost(s);
                return;
            case SHAPE_NAMES.VECTOR:
                this.createVectorGhost(s);
                return;
            case SHAPE_NAMES.SPIRAL:
                this.createSpiralGhost(s);
                return;
            case SHAPE_NAMES.MERKABA:
                this.createMerkabaGhost(s);
                return;
            default:
                return; // No ghost for scatter/chaos
        }

        if (geo) {
            this.mesh = new THREE.Mesh(geo, this.material);
            this.scene.add(this.mesh);
        }
    }

    /**
     * Create Tree of Life ghost
     * @param {number} s - Scale factor
     * @private
     */
    createTreeGhost(s) {
        this.mesh = new THREE.Group();
        const nodes = [
            { x: 0, y: 4, z: 0 }, { x: 1.5, y: 3, z: 0 }, { x: -1.5, y: 3, z: 0 },
            { x: 1.5, y: 1, z: 0 }, { x: -1.5, y: 1, z: 0 }, { x: 0, y: 0, z: 0 },
            { x: 1.5, y: -1, z: 0 }, { x: -1.5, y: -1, z: 0 }, { x: 0, y: -2, z: 0 },
            { x: 0, y: -4, z: 0 }
        ];

        const nodeGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const nodeMat = this.material.clone();
        nodeMat.opacity = 0.2;

        nodes.forEach(n => {
            const m = new THREE.Mesh(nodeGeo, nodeMat);
            m.position.set(n.x, n.y, n.z);
            this.mesh.add(m);
        });

        this.scene.add(this.mesh);
    }

    /**
     * Create Kundalini ghost
     * @param {number} s - Scale factor
     * @private
     */
    createKundaliniGhost(s) {
        const pts1 = [], pts2 = [];

        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const y = (t - 0.5) * 10;
            const ang = t * Math.PI * 8;
            pts1.push(new THREE.Vector3(Math.sin(ang) * 1.5, y, Math.cos(ang) * 1.5));
            pts2.push(new THREE.Vector3(Math.sin(ang + Math.PI) * 1.5, y, Math.cos(ang + Math.PI) * 1.5));
        }

        const g1 = new THREE.BufferGeometry().setFromPoints(pts1);
        const g2 = new THREE.BufferGeometry().setFromPoints(pts2);
        const lineMat = new THREE.LineBasicMaterial({
            color: COLORS.GHOST_FIELD,
            transparent: true,
            opacity: 0.15
        });

        this.mesh = new THREE.Group();
        this.mesh.add(new THREE.Line(g1, lineMat));
        this.mesh.add(new THREE.Line(g2, lineMat));
        this.scene.add(this.mesh);
    }

    /**
     * Create Vector Equilibrium ghost
     * @param {number} s - Scale factor
     * @private
     */
    createVectorGhost(s) {
        const r = 3.5 * s;
        const v = [
            new THREE.Vector3(r, r, 0), new THREE.Vector3(r, -r, 0),
            new THREE.Vector3(-r, r, 0), new THREE.Vector3(-r, -r, 0),
            new THREE.Vector3(r, 0, r), new THREE.Vector3(r, 0, -r),
            new THREE.Vector3(-r, 0, r), new THREE.Vector3(-r, 0, -r),
            new THREE.Vector3(0, r, r), new THREE.Vector3(0, r, -r),
            new THREE.Vector3(0, -r, r), new THREE.Vector3(0, -r, -r)
        ];

        const vEdges = [];
        for (let i = 0; i < v.length; i++) {
            for (let j = i + 1; j < v.length; j++) {
                const d2 = v[i].distanceToSquared(v[j]);
                if (d2 > 0.1 && d2 < (2.1 * r * r)) {
                    vEdges.push(v[i]);
                    vEdges.push(v[j]);
                }
            }
        }

        const geo = new THREE.BufferGeometry().setFromPoints(vEdges);
        this.mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
            color: COLORS.GHOST_FIELD,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
        }));
        this.scene.add(this.mesh);
    }

    /**
     * Create Spiral ghost
     * @param {number} s - Scale factor
     * @private
     */
    createSpiralGhost(s) {
        const pts = [];

        for (let i = 0; i < 500; i++) {
            const t = i / 500;
            const ang = t * Math.PI * 20 * 0.8;
            const r = t * 8;
            pts.push(new THREE.Vector3(r * Math.cos(ang), (t - 0.5) * 10, r * Math.sin(ang)));
        }

        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        this.mesh = new THREE.Line(geo, new THREE.LineBasicMaterial({
            color: COLORS.GHOST_FIELD,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending
        }));
        this.scene.add(this.mesh);
    }

    /**
     * Create Merkaba ghost
     * @param {number} s - Scale factor
     * @private
     */
    createMerkabaGhost(s) {
        this.mesh = new THREE.Group();

        const m1 = new THREE.Mesh(new THREE.TetrahedronGeometry(4 * s, 0), this.material);
        const m2 = new THREE.Mesh(new THREE.TetrahedronGeometry(4 * s, 0), this.material);
        m2.rotateX(Math.PI / 2);
        m2.rotateZ(Math.PI / 4);

        const coreMat = this.material.clone();
        coreMat.opacity = 0.05;
        const core = new THREE.Mesh(new THREE.SphereGeometry(1.5 * s, 16, 16), coreMat);

        this.mesh.add(m1);
        this.mesh.add(m2);
        this.mesh.add(core);
        this.scene.add(this.mesh);
    }

    /**
     * Animate the ghost field
     * @param {number} stability - Current stability
     * @param {number} time - Current time
     */
    animate(stability, time) {
        if (!this.mesh) return;

        this.mesh.rotation.y += 0.002;

        // Special animation for merkaba
        if (this.mesh.type === 'Group' && this.mesh.children.length > 2) {
            this.mesh.children[0].rotation.z -= 0.001;
            this.mesh.children[1].rotation.z += 0.001;
        }

        const op = 0.02 + (stability * 0.08);
        const breath = 1.0 + Math.sin(time * 0.5) * 0.05;
        this.mesh.scale.set(breath, breath, breath);

        if (this.mesh.type === 'Group') {
            this.mesh.children.forEach(c => {
                if (c.material) c.material.opacity = op;
            });
        } else {
            if (this.mesh.material) this.mesh.material.opacity = op;
        }
    }

    /**
     * Set visibility
     * @param {boolean} visible - Whether to show the ghost
     */
    setVisible(visible) {
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }

    /**
     * Cleanup resources
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
        }
        this.material.dispose();
    }
}
