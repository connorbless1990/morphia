/**
 * Utility Functions Module
 * Shared helper functions used across the application
 * Follows Single Responsibility Principle - pure utility functions only
 */

/**
 * Generate a random number between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random value in range
 */
export const rand = (min, max) => Math.random() * (max - min) + min;

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Create a glow texture for particles using canvas
 * @returns {THREE.CanvasTexture} Glow texture
 */
export function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
}

/**
 * Toggle panel visibility by ID
 * @param {string} id - Element ID to toggle
 */
export function togglePanel(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle('minimized');
    }
}

// Expose togglePanel globally for inline HTML onclick handlers
window.togglePanel = togglePanel;
