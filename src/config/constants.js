/**
 * Application Constants and Configuration
 * Single source of truth for magic numbers and configuration values
 * Follows Open/Closed Principle - extend via new constants, don't modify existing
 */

export const APP_CONFIG = {
    // Particle counts
    SWARM_PARTICLE_COUNT: 24000,
    ETHER_PARTICLE_COUNT: 2000,

    // Physics
    DEFAULT_RESONANCE: 0.1,
    DEFAULT_VITALITY: 0.8,
    DEFAULT_EVOLUTION: 1.0,
    CONTAINMENT_RADIUS_SQ: 2500,
    FRICTION_BASE: 0.92,
    FRICTION_CHAOS_FACTOR: 0.05,

    // Camera
    CAMERA_FOV: 75,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 100,
    CAMERA_DEFAULT_RADIUS: 12,
    CAMERA_MIN_RADIUS: 2,
    CAMERA_MAX_RADIUS: 200,
    CAMERA_PHI_MIN: 0.1,
    CAMERA_PHI_MAX: Math.PI - 0.1,

    // Rendering
    CLEAR_COLOR: 0x000200,
    PARTICLE_SIZE: 0.22,
    ETHER_PARTICLE_SIZE: 0.15,

    // Timing
    DELTA_TIME: 0.016,
    STABILITY_DURATION: 60.0, // seconds to reach full stability

    // Mobile breakpoint
    MOBILE_BREAKPOINT: 768,
};

export const COLORS = {
    CHAOS: 0xff4400,
    ORDER: 0x00ffff,
    GHOST_FIELD: 0x44ffaa,
    ETHER: 0x446688,
    STABILITY_NORMAL: '#4ade80',
    STABILITY_TRANSCENDENT: '#ffffff',
};

export const AUDIO_CONFIG = {
    MASTER_GAIN: 0.3,
    NOISE_GAIN: 0.05,
    DRONE_BASE_FREQUENCY: 55.0,
    LFO_FREQUENCY: 7.0,
    LFO_GAIN: 0.15,
    BELL_FREQUENCIES: [110, 164.8, 196, 220, 293.6],
    BELL_PROBABILITY_BASE: 0.005,
    BELL_PROBABILITY_VITALITY_FACTOR: 0.01,
    ROOT_FREQ : 136.1, // The "Om" / Earth Year frequency
    THETA_BEAT : 7.0, // The target brainwave state (meditative)
};

export const SCULPT_CONFIG = {
    DEFAULT_RADIUS: 3.5,
    PRECISION_RADIUS: 2.5,
    BROAD_RADIUS: 6.0,
    DEFAULT_STRENGTH: 0.05,
    PRECISION_STRENGTH: 0.1,
    BROAD_STRENGTH: 0.03,
    SLOW_VELOCITY_THRESHOLD: 0.5,
    FAST_VELOCITY_THRESHOLD: 2.0,
};

export const SHAPE_NAMES = {
    SPHERE: 'sphere',
    TORUS: 'torus',
    MERKABA: 'merkaba',
    DODECA: 'dodeca',
    ICOSA: 'icosa',
    SPIRAL: 'spiral',
    FLOWER: 'flower',
    SCATTER: 'scatter',
    TREE: 'tree',
    KUNDALINI: 'kundalini',
    VECTOR: 'vector',
};

export const MODES = {
    CLASSIC: 'classic',
    EXPERIMENTAL: 'experimental',
};
