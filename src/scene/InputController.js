/**
 * Input Controller Module
 * Handles mouse, touch, and keyboard input
 * Single Responsibility: Input handling and event dispatching
 */

import { eventBus, EVENTS } from '../utils/eventBus.js';
import { MODES, SCULPT_CONFIG } from '../config/constants.js';

export class InputController {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.container = sceneManager.getContainer();

        // Mouse state
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.isDrawing = false;
        this.isRightClick = false;
        this.isDragging = false;
        this.lastPosition = { x: 0, y: 0 };

        // Velocity tracking
        this.lastMousePos = new THREE.Vector2();
        this.lastMouseTime = 0;
        this.mouseVelocity = 0;

        // Intersection point for sculpting
        this.intersectPoint = null;

        // Current mode
        this.mode = MODES.CLASSIC;
        this.setupEventListeners();

        this.initialPinchDistance = null;
        this.initialZoom = 0;
    }

    /**
     * Set the current interaction mode
     * @param {string} mode - 'classic' or 'experimental'
     */
    setMode(mode) {
        this.mode = mode;
    }

    /**
     * Setup all event listeners
     * @private
     */
    setupEventListeners() {
        // Mouse events
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleEnd.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));

        // Touch events
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        window.addEventListener('touchend', this.handleEnd.bind(this));
        window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });

        // Wheel zoom
        this.container.addEventListener('wheel', this.handleWheel.bind(this));

        // Context menu (prevent right-click menu)
        this.container.addEventListener('contextmenu', e => e.preventDefault());

        // Double click for disruption
        this.container.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    }

    /**
     * Handle mouse down event
     * @param {MouseEvent} e
     * @private
     */
    handleMouseDown(e) {
        this.handleStart(e.clientX, e.clientY, e.button === 2);
    }

    /**
     * Handle touch start event
     * @param {TouchEvent} e
     * @private
     */
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 2) {
            // Start Pinch
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
            // Assuming SceneManager exposes radius, or we use a getter
            this.initialZoom = this.sceneManager.radius; 
        } else {
            // Start Drag
            this.handleStart(e.touches[0].clientX, e.touches[0].clientY, false);
        }
    }

    /**
     * Handle interaction start
     * @param {number} x - Client X
     * @param {number} y - Client Y
     * @param {boolean} isRight - Is right click
     * @private
     */
    handleStart(x, y, isRight) {
        this.isDragging = true;
        this.isRightClick = isRight;
        this.lastPosition = { x, y };

        if (this.mode === MODES.EXPERIMENTAL && !isRight) {
            this.isDrawing = true;
            this.container.classList.add('cursor-cross');
        } else {
            this.container.classList.add('cursor-move');
        }

        this.lastMousePos.set(x, y);
        this.lastMouseTime = performance.now();
        this.mouseVelocity = 0;
    }

    /**
     * Handle interaction end
     * @private
     */
    handleEnd() {
        this.isDragging = false;
        this.isDrawing = false;
        this.container.classList.remove('cursor-move');
        this.container.classList.remove('cursor-cross');
        this.intersectPoint = null;
    }

    /**
     * Handle mouse move event
     * @param {MouseEvent} e
     * @private
     */
    handleMouseMove(e) {
        this.handleMove(e.clientX, e.clientY);
    }

    /**
     * Handle touch move event
     * @param {TouchEvent} e
     * @private
     */
    handleTouchMove(e) {
        if (e.target === this.container) {
            e.preventDefault();
        }
        // Handle Pinch
        if (e.touches.length === 2 && this.initialPinchDistance) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate delta
            const diff = this.initialPinchDistance - currentDistance;
            
            // Sensitivity factor
            const zoomSpeed = 0.1; 
            
            // Call scene manager zoom (reusing your existing wheel logic method essentially)
            this.sceneManager.zoom(diff * zoomSpeed);
            
            // Update for next frame to keep it smooth
            this.initialPinchDistance = currentDistance;
            return;
        }

        // Handle Drag
        if (this.isDragging) {
            this.handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }

    /**
     * Handle pointer movement
     * @param {number} clientX
     * @param {number} clientY
     * @private
     */
    handleMove(clientX, clientY) {
        // Update normalized mouse coordinates
        this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;

        // Track velocity
        const now = performance.now();
        const dt = now - this.lastMouseTime;
        if (dt > 0) {
            const dx = clientX - this.lastMousePos.x;
            const dy = clientY - this.lastMousePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = dist / dt;
            this.mouseVelocity = this.mouseVelocity * 0.7 + speed * 0.3;
            this.lastMousePos.set(clientX, clientY);
            this.lastMouseTime = now;
        }

        if (!this.isDragging) return;

        const dx = clientX - this.lastPosition.x;
        const dy = clientY - this.lastPosition.y;
        this.lastPosition = { x: clientX, y: clientY };

        // Camera orbit in classic mode or right-click in experimental
        if (this.mode === MODES.CLASSIC || (this.mode === MODES.EXPERIMENTAL && this.isRightClick)) {
            this.sceneManager.rotate(dx, dy);
        }
    }

    /**
     * Handle wheel event for zoom
     * @param {WheelEvent} e
     * @private
     */
    handleWheel(e) {
        this.sceneManager.zoom(e.deltaY);
    }

    /**
     * Handle double click for disruption
     * @private
     */
    handleDoubleClick() {
        eventBus.emit(EVENTS.DISRUPT);
    }

    /**
     * Update intersection point for sculpting (called in animation loop)
     */
    updateIntersection() {
        this.intersectPoint = null;

        if (this.mode !== MODES.EXPERIMENTAL) return;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.getCamera());
        const plane = new THREE.Plane(
            new THREE.Vector3(0, 0, 1).applyQuaternion(this.sceneManager.getCamera().quaternion),
            0
        );
        const pt = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, pt);

        if (pt) {
            this.intersectPoint = pt;
        }
    }

    /**
     * Get sculpt parameters based on mouse velocity
     * @returns {{ radius: number, strength: number } | null}
     */
    getSculptParams() {
        if (!this.isDrawing || !this.intersectPoint) return null;

        let radius = SCULPT_CONFIG.DEFAULT_RADIUS;
        let strength = SCULPT_CONFIG.DEFAULT_STRENGTH;

        if (this.mouseVelocity < SCULPT_CONFIG.SLOW_VELOCITY_THRESHOLD) {
            radius = SCULPT_CONFIG.PRECISION_RADIUS;
            strength = SCULPT_CONFIG.PRECISION_STRENGTH;
        } else if (this.mouseVelocity > SCULPT_CONFIG.FAST_VELOCITY_THRESHOLD) {
            radius = SCULPT_CONFIG.BROAD_RADIUS;
            strength = SCULPT_CONFIG.BROAD_STRENGTH;
        }

        return { radius, strength, point: this.intersectPoint };
    }

    /**
     * Check if precision sculpting (for stability boost)
     * @returns {boolean}
     */
    isPrecisionSculpting() {
        return this.mouseVelocity < SCULPT_CONFIG.SLOW_VELOCITY_THRESHOLD;
    }

    /**
     * Cleanup event listeners
     */
    dispose() {
        // Event listeners are auto-cleaned when elements are removed
    }
}
