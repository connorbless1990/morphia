/**
 * Architect Module
 * Orchestrates shape generation using Strategy Pattern
 * Single Responsibility: Coordinate shape generation and sculpting
 * Open/Closed: Add new shapes by creating new generators, not modifying Architect
 */

import { BaseShapeGenerator } from './BaseShapeGenerator.js';
import {
    TreeOfLifeGenerator,
    KundaliniGenerator,
    VectorEquilibriumGenerator,
    MerkabaGenerator,
    FlowerOfLifeGenerator,
    ChaosGenerator,
    SpiralGenerator
} from './ShapeGenerators.js';
import { SHAPE_NAMES } from '../config/constants.js';

export class Architect {
    constructor(simplex) {
        this.simplex = simplex;
        this.baseGenerator = new BaseShapeGenerator(simplex);

        // Registry of shape generators (Strategy Pattern)
        this.generators = {
            [SHAPE_NAMES.TREE]: new TreeOfLifeGenerator(simplex),
            [SHAPE_NAMES.KUNDALINI]: new KundaliniGenerator(simplex),
            [SHAPE_NAMES.VECTOR]: new VectorEquilibriumGenerator(simplex),
            [SHAPE_NAMES.MERKABA]: new MerkabaGenerator(simplex),
            [SHAPE_NAMES.FLOWER]: new FlowerOfLifeGenerator(simplex),
            [SHAPE_NAMES.SPIRAL]: new SpiralGenerator(simplex),
            [SHAPE_NAMES.SCATTER]: new ChaosGenerator(simplex),
        };

        this.chaosGenerator = new ChaosGenerator(simplex);
    }

    /**
     * Sculpt target positions toward a point
     * @param {Float32Array} targets - Target position array
     * @param {THREE.Vector3} point - Sculpt center point
     * @param {number} radius - Sculpt radius
     * @param {number} strength - Sculpt strength
     */
    sculpt(targets, point, radius, strength) {
        const count = targets.length / 3;
        const rSq = radius * radius;

        for (let i = 0; i < count; i++) {
            const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
            const dx = targets[ix] - point.x;
            const dy = targets[iy] - point.y;
            const dz = targets[iz] - point.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq < rSq) {
                const force = strength * (1 - (distSq / rSq));
                const jitter = (Math.random() - 0.5) * 2;

                targets[ix] -= (dx - jitter) * force;
                targets[iy] -= (dy - jitter) * force;
                targets[iz] -= (dz - jitter) * force;
            }
        }
    }

    /**
     * Generate target positions for a shape
     * @param {string} shapeName - Name of the shape to generate
     * @param {number} count - Number of particles
     * @param {number} evolution - Evolution/warping factor
     * @returns {Float32Array} Generated target positions
     */
    generateTargets(shapeName, count, evolution) {
        const targets = new Float32Array(count * 3);
        const scale = 1.0;

        // Check for custom generators first
        if (this.generators[shapeName]) {
            return this.generators[shapeName].generate(targets, count, scale, evolution);
        }

        // Handle Three.js geometry-based shapes
        let geo;
        switch (shapeName) {
            case SHAPE_NAMES.TORUS:
                geo = new THREE.TorusKnotGeometry(2.5 * scale, 0.6, 150, 20);
                break;
            case SHAPE_NAMES.SPHERE:
                geo = new THREE.SphereGeometry(3.0 * scale, 64, 64);
                break;
            case SHAPE_NAMES.DODECA:
                geo = new THREE.DodecahedronGeometry(3.5 * scale, 0);
                break;
            case SHAPE_NAMES.ICOSA:
                geo = new THREE.IcosahedronGeometry(3.5 * scale, 0);
                break;
            default:
                // Default to chaos
                return this.chaosGenerator.generate(targets, count, scale, evolution);
        }

        if (geo) {
            this.baseGenerator.sampleGeometry(geo, targets, count, evolution);
            geo.dispose();
        }

        return targets;
    }

    /**
     * Generate chaos distribution (convenience method)
     * @param {Float32Array} targets - Target array to fill
     * @param {number} count - Number of particles
     * @returns {Float32Array} Filled target array
     */
    generateChaos(targets, count) {
        return this.chaosGenerator.generate(targets, count, 1, 1);
    }

    /**
     * Register a new shape generator
     * @param {string} name - Shape name
     * @param {BaseShapeGenerator} generator - Generator instance
     */
    registerGenerator(name, generator) {
        this.generators[name] = generator;
    }
}
