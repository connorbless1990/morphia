/**
 * Shape Generator Interface
 * Defines the contract for shape generators
 * Follows Interface Segregation Principle
 */

/**
 * @interface IShapeGenerator
 * @property {function(Float32Array, number, number, number): Float32Array} generate
 */

/**
 * Base shape generator with common utilities
 */
export class BaseShapeGenerator {
    constructor(simplex) {
        this.simplex = simplex;
    }

    /**
     * Apply evolution noise to coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @param {number} evolution - Evolution factor
     * @returns {{x: number, y: number, z: number}} Displaced coordinates
     */
    applyEvolution(x, y, z, evolution) {
        if (evolution <= 1.0) {
            return { x, y, z };
        }

        const n = this.simplex.noise3D(x * 0.5, y * 0.5, z * 0.5 + (evolution * 0.2));
        const disp = 1 + (n * (evolution - 1.0) * 0.8);

        return {
            x: x * disp,
            y: y * disp,
            z: z * disp
        };
    }

    /**
     * Sample points from a Three.js geometry
     * @param {THREE.BufferGeometry} geometry - Source geometry
     * @param {Float32Array} targets - Output array
     * @param {number} count - Number of points to generate
     * @param {number} evolution - Evolution factor
     */
    sampleGeometry(geometry, targets, count, evolution) {
        const pos = geometry.attributes.position;
        const faceCount = pos.count / 3;

        for (let i = 0; i < count; i++) {
            const fIdx = Math.floor(Math.random() * faceCount);
            const ax = pos.getX(fIdx * 3), ay = pos.getY(fIdx * 3), az = pos.getZ(fIdx * 3);
            const bx = pos.getX(fIdx * 3 + 1), by = pos.getY(fIdx * 3 + 1), bz = pos.getZ(fIdx * 3 + 1);
            const cx = pos.getX(fIdx * 3 + 2), cy = pos.getY(fIdx * 3 + 2), cz = pos.getZ(fIdx * 3 + 2);

            let px, py, pz;

            // Edge bias (30%)
            if (Math.random() < 0.3) {
                const t = Math.random();
                const edge = Math.random();
                if (edge < 0.33) {
                    px = ax + t * (bx - ax);
                    py = ay + t * (by - ay);
                    pz = az + t * (bz - az);
                } else if (edge < 0.66) {
                    px = bx + t * (cx - bx);
                    py = by + t * (cy - by);
                    pz = bz + t * (cz - bz);
                } else {
                    px = cx + t * (ax - cx);
                    py = cy + t * (ay - cy);
                    pz = cz + t * (az - cz);
                }
            }
            // Volume bias (70%)
            else {
                let r1 = Math.random(), r2 = Math.random();
                if (r1 + r2 > 1) {
                    r1 = 1 - r1;
                    r2 = 1 - r2;
                }
                px = ax + r1 * (bx - ax) + r2 * (cx - ax);
                py = ay + r1 * (by - ay) + r2 * (cy - ay);
                pz = az + r1 * (bz - az) + r2 * (cz - az);
            }

            const evolved = this.applyEvolution(px, py, pz, evolution);
            targets[i * 3] = evolved.x;
            targets[i * 3 + 1] = evolved.y;
            targets[i * 3 + 2] = evolved.z;
        }
    }
}
