/**
 * Scene Manager Module
 * Handles Three.js scene setup and camera controls
 * Single Responsibility: 3D scene infrastructure
 */

import { APP_CONFIG } from '../config/constants.js';

export class SceneManager {
    constructor(containerId = 'canvas-container') {
        this.containerId = containerId;
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Camera orbit state
        this.theta = 0;
        this.phi = Math.PI / 2;
        this.radius = APP_CONFIG.CAMERA_DEFAULT_RADIUS;
        this.target = new THREE.Vector3(0, 0, 0);

        // Interaction state
        this.isDragging = false;
        this.lastPosition = { x: 0, y: 0 };

        this.init();
    }

    /**
     * Initialize the Three.js scene
     * @private
     */
    init() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            APP_CONFIG.CAMERA_FOV,
            window.innerWidth / window.innerHeight,
            APP_CONFIG.CAMERA_NEAR,
            APP_CONFIG.CAMERA_FAR
        );

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(APP_CONFIG.CLEAR_COLOR);

        const container = document.getElementById(this.containerId);
        if (container) {
            container.appendChild(this.renderer.domElement);
        }

        this.updateCamera();
        this.setupResizeHandler();
    }

    /**
     * Update camera position based on orbital parameters
     */
    updateCamera() {
        const x = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
        const y = this.radius * Math.cos(this.phi);
        const z = this.radius * Math.sin(this.phi) * Math.sin(this.theta);

        this.camera.position.copy(this.target).add(new THREE.Vector3(x, y, z));
        this.camera.lookAt(this.target);
    }

    /**
     * Rotate the camera orbit
     * @param {number} deltaX - Horizontal rotation delta
     * @param {number} deltaY - Vertical rotation delta
     */
    rotate(deltaX, deltaY) {
        this.theta -= deltaX * 0.005;
        this.phi -= deltaY * 0.005;
        this.phi = Math.max(
            APP_CONFIG.CAMERA_PHI_MIN,
            Math.min(APP_CONFIG.CAMERA_PHI_MAX, this.phi)
        );
        this.updateCamera();
    }

    /**
     * Zoom the camera
     * @param {number} delta - Zoom delta (positive = zoom out)
     */
    zoom(delta) {
        this.radius = Math.max(
            APP_CONFIG.CAMERA_MIN_RADIUS,
            Math.min(APP_CONFIG.CAMERA_MAX_RADIUS, this.radius + delta * 0.05)
        );
        this.updateCamera();
    }

    /**
     * Setup window resize handler
     * @private
     */
    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    /**
     * Render the scene
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Get the scene
     * @returns {THREE.Scene}
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get the camera
     * @returns {THREE.PerspectiveCamera}
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Get the renderer
     * @returns {THREE.WebGLRenderer}
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Get the container element
     * @returns {HTMLElement}
     */
    getContainer() {
        return document.getElementById(this.containerId);
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.renderer.dispose();
    }
}
