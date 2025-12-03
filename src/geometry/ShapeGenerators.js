/**
 * Sacred Geometry Shape Generators
 * Each generator follows Single Responsibility Principle
 * Implements Strategy Pattern for shape generation
 */

import { BaseShapeGenerator } from './BaseShapeGenerator.js';

/**
 * Generates Tree of Life (Kabbalah) particle distribution
 */
export class TreeOfLifeGenerator extends BaseShapeGenerator {
    constructor(simplex) {
        super(simplex);
        this.nodes = [
            { x: 0, y: 4, z: 0 }, { x: 1.5, y: 3, z: 0 }, { x: -1.5, y: 3, z: 0 },
            { x: 1.5, y: 1, z: 0 }, { x: -1.5, y: 1, z: 0 }, { x: 0, y: 0, z: 0 },
            { x: 1.5, y: -1, z: 0 }, { x: -1.5, y: -1, z: 0 }, { x: 0, y: -2, z: 0 },
            { x: 0, y: -4, z: 0 }
        ];
        this.paths = [
            [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5], [3, 5], [4, 5],
            [3, 6], [4, 7], [5, 6], [5, 7], [5, 8], [6, 8], [7, 8], [8, 9]
        ];
    }

    generate(targets, count, scale, evolution) {
        const noiseAmp = (evolution - 1.0) * 0.5;

        for (let i = 0; i < count; i++) {
            let px, py, pz;

            if (Math.random() < 0.6) {
                // Node cluster
                const node = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                const theta = Math.random() * 2 * Math.PI;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = 0.4 * Math.cbrt(Math.random());

                px = node.x * scale + r * Math.sin(phi) * Math.cos(theta);
                py = node.y * scale + r * Math.sin(phi) * Math.sin(theta);
                pz = node.z * scale + r * Math.cos(phi);
            } else {
                // Path distribution
                const path = this.paths[Math.floor(Math.random() * this.paths.length)];
                const n1 = this.nodes[path[0]];
                const n2 = this.nodes[path[1]];
                const r = Math.random();

                px = (n1.x + (n2.x - n1.x) * r) * scale + (Math.random() - 0.5) * 0.2;
                py = (n1.y + (n2.y - n1.y) * r) * scale + (Math.random() - 0.5) * 0.2;
                pz = (n1.z + (n2.z - n1.z) * r) * scale + (Math.random() - 0.5) * 0.2;
            }

            if (evolution > 1.0) {
                const n = this.simplex.noise3D(px, py, pz);
                px += n * noiseAmp;
                py += n * noiseAmp;
                pz += n * noiseAmp;
            }

            targets[i * 3] = px;
            targets[i * 3 + 1] = py;
            targets[i * 3 + 2] = pz;
        }

        return targets;
    }
}

/**
 * Generates Kundalini (double helix) particle distribution
 */
export class KundaliniGenerator extends BaseShapeGenerator {
    generate(targets, count, scale, evolution) {
        const height = 10 * scale;

        for (let i = 0; i < count; i++) {
            const pct = i / count;
            const y = (pct - 0.5) * height;
            const angle = pct * Math.PI * 8;
            let px, py, pz;

            const rand = Math.random();
            if (rand < 0.4) {
                // Central column
                px = (Math.random() - 0.5) * 0.5;
                pz = (Math.random() - 0.5) * 0.5;
                py = y;
            } else if (rand < 0.7) {
                // First helix
                px = Math.sin(angle) * 1.5 * scale;
                pz = Math.cos(angle) * 1.5 * scale;
                py = y;
            } else {
                // Second helix (opposite phase)
                px = Math.sin(angle + Math.PI) * 1.5 * scale;
                pz = Math.cos(angle + Math.PI) * 1.5 * scale;
                py = y;
            }

            px += (Math.random() - 0.5) * 0.2;
            pz += (Math.random() - 0.5) * 0.2;

            if (evolution > 1.0) {
                const spread = (evolution - 1.0) * 2.0;
                px *= (1 + spread * 0.5);
                pz *= (1 + spread * 0.5);
            }

            targets[i * 3] = px;
            targets[i * 3 + 1] = py;
            targets[i * 3 + 2] = pz;
        }

        return targets;
    }
}

/**
 * Generates Vector Equilibrium (Cuboctahedron) particle distribution
 */
export class VectorEquilibriumGenerator extends BaseShapeGenerator {
    generate(targets, count, scale, evolution) {
        const r = 3.5 * scale;
        const verts = [
            { x: r, y: r, z: 0 }, { x: r, y: -r, z: 0 },
            { x: -r, y: r, z: 0 }, { x: -r, y: -r, z: 0 },
            { x: r, y: 0, z: r }, { x: r, y: 0, z: -r },
            { x: -r, y: 0, z: r }, { x: -r, y: 0, z: -r },
            { x: 0, y: r, z: r }, { x: 0, y: r, z: -r },
            { x: 0, y: -r, z: r }, { x: 0, y: -r, z: -r }
        ];

        for (let i = 0; i < count; i++) {
            let px, py, pz;

            if (Math.random() < 0.2) {
                // Vertex cluster
                const v = verts[Math.floor(Math.random() * verts.length)];
                px = v.x + (Math.random() - 0.5) * 0.5;
                py = v.y + (Math.random() - 0.5) * 0.5;
                pz = v.z + (Math.random() - 0.5) * 0.5;
            } else {
                // Edge distribution
                const idx1 = Math.floor(Math.random() * verts.length);
                const v1 = verts[idx1];
                let v2 = v1;
                let attempts = 0;

                while (attempts < 10) {
                    const test = verts[Math.floor(Math.random() * verts.length)];
                    const d2 = (test.x - v1.x) ** 2 + (test.y - v1.y) ** 2 + (test.z - v1.z) ** 2;
                    if (d2 > 0.1 && d2 < (2.1 * r * r)) {
                        v2 = test;
                        break;
                    }
                    attempts++;
                }

                const lerp = Math.random();
                px = v1.x + (v2.x - v1.x) * lerp + (Math.random() - 0.5) * 0.3;
                py = v1.y + (v2.y - v1.y) * lerp + (Math.random() - 0.5) * 0.3;
                pz = v1.z + (v2.z - v1.z) * lerp + (Math.random() - 0.5) * 0.3;
            }

            if (evolution > 1.0) {
                const theta = (evolution - 1.0) * 1.5;
                const oldX = px, oldZ = pz;
                px = oldX * Math.cos(theta) - oldZ * Math.sin(theta);
                pz = oldX * Math.sin(theta) + oldZ * Math.cos(theta);
            }

            targets[i * 3] = px;
            targets[i * 3 + 1] = py;
            targets[i * 3 + 2] = pz;
        }

        return targets;
    }
}

/**
 * Generates Merkaba (Star Tetrahedron) particle distribution
 */
export class MerkabaGenerator extends BaseShapeGenerator {
    generate(targets, count, scale, evolution) {
        const g1 = new THREE.TetrahedronGeometry(4 * scale, 0).toNonIndexed();
        const g2 = new THREE.TetrahedronGeometry(4 * scale, 0).toNonIndexed();
        g2.rotateX(Math.PI / 2);
        g2.rotateZ(Math.PI / 4);

        const sample = (pos, offset, limit) => {
            const faces = pos.count / 3;
            for (let i = offset; i < limit; i++) {
                const f = Math.floor(Math.random() * faces);
                const ax = pos.getX(f * 3), ay = pos.getY(f * 3), az = pos.getZ(f * 3);
                const bx = pos.getX(f * 3 + 1), by = pos.getY(f * 3 + 1), bz = pos.getZ(f * 3 + 1);
                const cx = pos.getX(f * 3 + 2), cy = pos.getY(f * 3 + 2), cz = pos.getZ(f * 3 + 2);

                let px, py, pz;
                if (Math.random() < 0.3) {
                    const r = Math.random();
                    px = ax + r * (bx - ax);
                    py = ay + r * (by - ay);
                    pz = az + r * (bz - az);
                } else {
                    let r1 = Math.random(), r2 = Math.random();
                    if (r1 + r2 > 1) {
                        r1 = 1 - r1;
                        r2 = 1 - r2;
                    }
                    px = ax + r1 * (bx - ax) + r2 * (cx - ax);
                    py = ay + r1 * (by - ay) + r2 * (cy - ay);
                    pz = az + r1 * (bz - az) + r2 * (cz - az);
                }

                if (evolution > 1.0) {
                    const disp = 1 + (this.simplex.noise3D(px * 0.2, py * 0.2, pz * 0.2) * (evolution - 1.0) * 0.5);
                    px *= disp;
                    py *= disp;
                    pz *= disp;
                }

                targets[i * 3] = px;
                targets[i * 3 + 1] = py;
                targets[i * 3 + 2] = pz;
            }
        };

        sample(g1.attributes.position, 0, count / 2);
        sample(g2.attributes.position, count / 2, count);

        g1.dispose();
        g2.dispose();

        return targets;
    }
}

/**
 * Generates Flower of Life particle distribution
 */
export class FlowerOfLifeGenerator extends BaseShapeGenerator {
    constructor(simplex) {
        super(simplex);
        this.centers = [
            { x: 0, y: 0, z: 0 },
            { x: 2, y: 0, z: 0 }, { x: -2, y: 0, z: 0 },
            { x: 1, y: 1.73, z: 0 }, { x: -1, y: 1.73, z: 0 },
            { x: 1, y: -1.73, z: 0 }, { x: -1, y: -1.73, z: 0 }
        ];
    }

    generate(targets, count, scale, evolution) {
        const g = new THREE.SphereGeometry(1.2 * scale, 16, 16);
        const pos = g.attributes.position;
        const noiseAmp = (evolution - 1.0) * 0.3;

        for (let i = 0; i < count; i++) {
            const ct = this.centers[Math.floor(Math.random() * this.centers.length)];
            const idx = Math.floor(Math.random() * pos.count);

            let lx = pos.getX(idx);
            let ly = pos.getY(idx);
            let lz = pos.getZ(idx);

            if (evolution > 1.0) {
                const n = this.simplex.noise3D(lx + ct.x, ly + ct.y, lz + ct.z);
                const disp = 1 + (n * noiseAmp);
                lx *= disp;
                ly *= disp;
                lz *= disp;
            }

            targets[i * 3] = lx * scale + ct.x * scale;
            targets[i * 3 + 1] = ly * scale + ct.y * scale;
            targets[i * 3 + 2] = lz * scale + ct.z * scale;
        }

        g.dispose();
        return targets;
    }
}

/**
 * Generates Chaos (random volumetric cloud) distribution
 */
export class ChaosGenerator extends BaseShapeGenerator {
    generate(targets, count, scale = 1, evolution = 1) {
        for (let i = 0; i < count; i++) {
            // Volumetric cloud using cube root for uniform volume distribution
            const r = 15 * Math.cbrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);

            targets[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            targets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            targets[i * 3 + 2] = r * Math.cos(phi);
        }
        return targets;
    }
}

/**
 * Generates Spiral particle distribution
 */
export class SpiralGenerator extends BaseShapeGenerator {
    generate(targets, count, scale, evolution) {
        const tw = evolution * 0.8;
        const noiseAmp = Math.max(0, evolution - 1.0);

        for (let i = 0; i < count; i++) {
            const tt = i / count;
            const ang = tt * Math.PI * 20 * tw;
            const r = tt * 8;

            let x = r * Math.cos(ang);
            let y = (tt - 0.5) * 10;
            let z = r * Math.sin(ang);

            x += (Math.random() - 0.5) * 0.5;
            y += (Math.random() - 0.5) * 0.5;
            z += (Math.random() - 0.5) * 0.5;

            if (noiseAmp > 0) {
                const n = this.simplex.noise3D(x * 0.1, y * 0.1, z * 0.1);
                x += n * noiseAmp;
                y += n * noiseAmp;
                z += n * noiseAmp;
            }

            targets[i * 3] = x;
            targets[i * 3 + 1] = y;
            targets[i * 3 + 2] = z;
        }

        return targets;
    }
}
