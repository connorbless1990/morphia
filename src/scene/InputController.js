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
        
        // 3D Velocity Vector (For "Stirring" the field)
        this.currentWorldPos = new THREE.Vector3();
        this.lastWorldPos = new THREE.Vector3();
        this.worldVelocity = new THREE.Vector3();

        // Intersection point for sculpting
        this.intersectPoint = null;

        // Current mode
        this.mode = MODES.CLASSIC;
        
        // Pinch Zoom State
        this.initialPinchDistance = null;
        this.initialZoom = 0;

        this.setupEventListeners();
    }

    /**
     * Set the current interaction mode
     */
    setMode(mode) {
        this.mode = mode;
    }

    setupEventListeners() {
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleEnd.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));

        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        window.addEventListener('touchend', this.handleEnd.bind(this));
        window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });

        this.container.addEventListener('wheel', this.handleWheel.bind(this));
        this.container.addEventListener('contextmenu', e => e.preventDefault());
        this.container.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    }

    handleMouseDown(e) {
        this.handleStart(e.clientX, e.clientY, e.button === 2);
    }

    handleTouchStart(e) {
        // Prevent default to stop scrolling/refreshing
        if(e.cancelable) e.preventDefault();
        
        if (e.touches.length === 2) {
            // Start Pinch
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
            this.initialZoom = this.sceneManager.radius; 
        } else {
            // Start Drag
            this.handleStart(e.touches[0].clientX, e.touches[0].clientY, false);
        }
    }

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

    handleEnd() {
        this.isDragging = false;
        this.isDrawing = false;
        this.container.classList.remove('cursor-move');
        this.container.classList.remove('cursor-cross');
        this.intersectPoint = null;
        this.worldVelocity.set(0, 0, 0); // Reset velocity
        
        // Reset pinch state
        this.initialPinchDistance = null;
    }

    handleMouseMove(e) {
        this.handleMove(e.clientX, e.clientY);
    }

    handleTouchMove(e) {
        if (e.cancelable) e.preventDefault();

        // Handle Pinch
        if (e.touches.length === 2 && this.initialPinchDistance) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate delta
            const diff = this.initialPinchDistance - currentDistance;
            
            // Sensitivity factor for pinch zoom
            const zoomSpeed = 0.5; 
            
            // Call scene manager zoom
            this.sceneManager.zoom(diff * zoomSpeed);
            
            // Update for next frame to keep it smooth
            this.initialPinchDistance = currentDistance;
            return;
        }

        // Handle Drag
        if (this.isDragging && e.touches.length === 1) {
            this.handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }

    handleMove(clientX, clientY) {
        this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;

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

        // Camera orbit is allowed in Classic Mode
        // In Experimental, Drag = Paint, so we disable orbit to prevent conflict
        if (this.mode === MODES.CLASSIC) {
            this.sceneManager.rotate(dx, dy);
        }
    }

    handleWheel(e) {
        this.sceneManager.zoom(e.deltaY);
    }

    handleDoubleClick() {
        eventBus.emit(EVENTS.DISRUPT);
    }

    updateIntersection() {
        this.intersectPoint = null;

        if (this.mode !== MODES.EXPERIMENTAL) return;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.getCamera());
        // Intersect with a plane facing the camera (Billboarding plane) 
        // to find where the mouse "is" in 3D space
        const plane = new THREE.Plane(
            new THREE.Vector3(0, 0, 1).applyQuaternion(this.sceneManager.getCamera().quaternion),
            0
        );
        const pt = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, pt);

        if (pt) {
            this.intersectPoint = pt;
            
            // Calculate 3D Velocity
            // worldVelocity = currentPos - lastPos
            this.currentWorldPos.copy(pt);
            
            // If we just started, velocity is 0
            if (this.lastWorldPos.lengthSq() === 0) {
                this.worldVelocity.set(0, 0, 0);
            } else {
                this.worldVelocity.subVectors(this.currentWorldPos, this.lastWorldPos);
            }
            
            this.lastWorldPos.copy(this.currentWorldPos);
        }
    }

    /**
     * Get sculpt parameters
     * @returns {Object|null}
     */
    getSculptParams() {
        if (!this.isDragging || !this.intersectPoint) return null;

        let radius = SCULPT_CONFIG.DEFAULT_RADIUS;
        let strength = SCULPT_CONFIG.DEFAULT_STRENGTH;

        // Dynamic radius based on speed
        if (this.mouseVelocity < SCULPT_CONFIG.SLOW_VELOCITY_THRESHOLD) {
            radius = SCULPT_CONFIG.PRECISION_RADIUS;
            strength = SCULPT_CONFIG.PRECISION_STRENGTH;
        } else if (this.mouseVelocity > SCULPT_CONFIG.FAST_VELOCITY_THRESHOLD) {
            radius = SCULPT_CONFIG.BROAD_RADIUS;
            strength = SCULPT_CONFIG.BROAD_STRENGTH;
        }

        return { 
            point: this.intersectPoint,
            radius: radius, 
            strength: strength,
            isRightClick: this.isRightClick,
            velocity: this.worldVelocity
        };
    }

    isPrecisionSculpting() {
        return this.mouseVelocity < SCULPT_CONFIG.SLOW_VELOCITY_THRESHOLD;
    }

    dispose() {}
}