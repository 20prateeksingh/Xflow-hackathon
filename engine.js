/**
 * Xflow AI Hackathon 2026 - Rendering Engines
 * 
 * ASCIIOnlyEngine: Pure ASCII rendering for hero section
 * ThreeJSEngine: 3D + ASCII hover reveal for content sections
 */

// ===== ASCII ONLY ENGINE (Hero Section) =====
class ASCIIOnlyEngine {
    constructor(canvasId, modelPath) {
        this.canvas = document.getElementById(canvasId);
        this.modelPath = modelPath;

        // Mouse tracking
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;

        // ASCII Settings (High Resolution 9px)
        this.charWidth = 5.4;
        this.charHeight = 9;
        this.asciiChars = ".:*₹€£$";
        // this.asciiChars = "£€$₹..";


        // Performance
        this.frameCount = 0;
        this.asciiUpdateInterval = 2; // Update ASCII every N frames

        // Initialize
        this.initASCIIHelpers();
        this.initThreeJS();
        this.initEventListeners();
        this.loadModel();
        this.animate();
    }

    initASCIIHelpers() {
        this.smallCanvas = document.createElement('canvas');
        this.smallCtx = this.smallCanvas.getContext('2d', { willReadFrequently: true });
        this.smallCtx.imageSmoothingEnabled = false;
        this.updateASCIIDimensions();
    }

    updateASCIIDimensions() {
        // Use container dimensions (hero-frame) instead of viewport
        const container = this.canvas.parentElement;
        const width = container ? container.clientWidth : 1200;
        const height = container ? container.clientHeight : 642;

        const cols = Math.floor(width / this.charWidth);
        const rows = Math.floor(height / this.charHeight);

        this.smallCanvas.width = cols;
        this.smallCanvas.height = rows;
        this.cols = cols;
        this.rows = rows;

        this.containerWidth = width;
        this.containerHeight = height;
    }

    initThreeJS() {
        // Get container dimensions
        const container = this.canvas.parentElement;
        const width = container ? container.clientWidth : 1200;
        const height = container ? container.clientHeight : 642;

        this.containerWidth = width;
        this.containerHeight = height;

        // Offscreen renderer (sized to container, not viewport)
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1F2741);

        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 1000);
        this.camera.position.z = 15;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.offscreenCanvas,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
        keyLight.position.set(1, 1, 2).normalize();
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xeef4ff, 0.5);
        fillLight.position.set(-1, -1, 1).normalize();
        this.scene.add(fillLight);

        this.modelGroup = new THREE.Group();
        this.scene.add(this.modelGroup);
    }

    loadModel() {
        if (typeof THREE.OBJLoader === 'undefined') {
            console.warn('OBJLoader not available');
            return;
        }

        const loader = new THREE.OBJLoader();

        loader.load(
            this.modelPath,
            (object) => {
                const material = new THREE.MeshPhongMaterial({
                    color: 0x2E5CB8,
                    shininess: 0,
                    flatShading: false,
                    side: THREE.DoubleSide
                });

                object.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.material = material;
                    }
                });

                const box = new THREE.Box3().setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                this.modelSize = size;
                this.modelCenter = center;

                this.modelGroup.add(object);
                this.model = object;

                this.fitModel();
            },
            (xhr) => { },
            (error) => {
                console.error('Error loading model:', error);
            }
        );
    }

    fitModel() {
        if (!this.model || !this.modelSize || !this.modelCenter) return;

        const dist = this.camera.position.z;
        const vFOV = (this.camera.fov * Math.PI) / 180;
        const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
        const visibleWidth = visibleHeight * this.camera.aspect;

        const targetWidth = visibleWidth * 0.60;
        const scale = targetWidth / this.modelSize.x;

        this.model.scale.setScalar(scale);
        this.model.position.set(
            -this.modelCenter.x * scale,
            -this.modelCenter.y * scale,
            -this.modelCenter.z * scale
        );
    }

    initEventListeners() {
        window.addEventListener('resize', () => {
            // Use container dimensions for resize
            const container = this.canvas.parentElement;
            const width = container ? container.clientWidth : 1200;
            const height = container ? container.clientHeight : 642;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
            this.offscreenCanvas.width = width;
            this.offscreenCanvas.height = height;
            this.updateASCIIDimensions();
            this.fitModel(); // Update model scale
        });


        // Only track mouse when over hero section
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.addEventListener('mousemove', (e) => {
                const rect = heroSection.getBoundingClientRect();
                this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

                const maxTilt = 0.5;
                this.targetRotationY = this.mouseX * maxTilt;
                this.targetRotationX = this.mouseY * maxTilt * 0.5;
            });

            heroSection.addEventListener('mouseleave', () => {
                this.targetRotationY = 0;
                this.targetRotationX = 0;
            });
        }
    }

    renderASCII() {
        if (!this.model) return;

        // Throttle ASCII generation for performance
        if (this.frameCount % this.asciiUpdateInterval !== 0) {
            return;
        }

        this.smallCtx.drawImage(this.offscreenCanvas, 0, 0, this.cols, this.rows);
        const imageData = this.smallCtx.getImageData(0, 0, this.cols, this.rows);
        const data = imageData.data;

        let asciiStr = "";

        for (let i = 0; i < this.cols * this.rows; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];

            let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            // Contrast stretching: Map 0.15-0.55 to 0.0-1.0 to use full ramp
            brightness = (brightness - 0.15) * 3.0;
            brightness = Math.max(0, Math.min(1, brightness));

            const charIndex = Math.floor(brightness * (this.asciiChars.length - 1));
            const char = this.asciiChars[charIndex];

            asciiStr += char;

            if ((i + 1) % this.cols === 0) {
                asciiStr += "\n";
            }
        }

        this.canvas.innerText = asciiStr;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.modelGroup) {
            this.modelGroup.rotation.y += (this.targetRotationY - this.modelGroup.rotation.y) * 0.1;
            this.modelGroup.rotation.x += (this.targetRotationX - this.modelGroup.rotation.x) * 0.1;
        }

        this.renderer.render(this.scene, this.camera);
        this.renderASCII();
        this.frameCount++;
    }
}

// ===== THREE.JS ENGINE (Content Sections) =====
class ThreeJSEngine {
    constructor(sectionId, modelPath) {
        this.sectionId = sectionId;
        this.pixelCanvas = document.getElementById(`pixel-canvas-${sectionId}`);
        this.asciiCanvas = document.getElementById(`ascii-canvas-${sectionId}`);
        this.container = document.getElementById(`canvas-container-${sectionId}`);

        // Mouse tracking
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;

        // Mask position (Start off-screen)
        this.maskX = -1;
        this.maskY = -1;
        this.targetMaskX = -1;
        this.targetMaskY = -1;

        // ASCII Settings (Optimized)
        this.charWidth = 6;  // Match 10px font width
        this.charHeight = 10; // Match 10px font height
        this.asciiChars = ".₹$€£";

        // Performance
        this.frameCount = 0;
        this.asciiUpdateInterval = 3; // Update ASCII every N frames
        this.isVisible = false; // Only render when visible

        // Initialize
        this.hasEntered = false;
        this.spinSpeed = 0.35; // Start fast (approx 360 deg spin)
        this.initASCIIHelpers();
        this.initThreeJS();
        this.initEventListeners();
        this.setupObserver(); // New observer
        this.loadModel(modelPath);
        this.animate();
    }

    initASCIIHelpers() {
        this.smallCanvas = document.createElement('canvas');
        this.smallCtx = this.smallCanvas.getContext('2d', { willReadFrequently: true });
        this.smallCtx.imageSmoothingEnabled = false;

        this.updateDimensions();
    }

    updateDimensions() {
        if (!this.container) return;

        const width = this.container.clientWidth || 590;
        const height = this.container.clientHeight || 642;

        // Update ASCII Helpers
        if (this.smallCanvas) {
            const cols = Math.floor(width / this.charWidth);
            const rows = Math.floor(height / this.charHeight);

            this.smallCanvas.width = cols;
            this.smallCanvas.height = rows;
            this.cols = cols;
            this.rows = rows;
        }

        // Update ThreeJS
        if (this.camera && this.renderer) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent background

        const width = this.container ? (this.container.clientWidth || 590) : 590;
        const height = this.container ? (this.container.clientHeight || 642) : 642;

        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 1000);
        this.camera.position.z = 15;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.pixelCanvas,
            antialias: true,
            alpha: true, // Enable transparency
            preserveDrawingBuffer: true
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Increased for better fill
        this.scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.0); // Slightly increased
        keyLight.position.set(5, 5, 10); // Moved further out for better shadows
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xeef4ff, 0.5);
        fillLight.position.set(-1, -1, 1).normalize();
        this.scene.add(fillLight);

        // Rim Light (Back)
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
        rimLight.position.set(0, 2, -2).normalize();
        this.scene.add(rimLight);

        // Extra Fill (Left Side)
        const sideLight = new THREE.DirectionalLight(0xeef4ff, 0.4);
        sideLight.position.set(-2, 0, 0).normalize();
        this.scene.add(sideLight);

        this.modelGroup = new THREE.Group();
        this.modelGroup.position.y = -8; // Start below view
        this.scene.add(this.modelGroup);
    }

    loadModel(modelPath) {
        if (typeof THREE.OBJLoader === 'undefined') {
            console.warn('OBJLoader not available');
            return;
        }

        const loader = new THREE.OBJLoader();

        loader.load(
            modelPath,
            (object) => {
                const material = new THREE.MeshStandardMaterial({
                    color: 0x7991FB, // Lighter blue
                    metalness: 0.70,
                    roughness: 0.25,
                    flatShading: false,
                    side: THREE.DoubleSide
                });

                object.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.material = material;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                const box = new THREE.Box3().setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 4 / maxDim;

                object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
                object.scale.setScalar(scale);

                this.modelGroup.add(object);
                this.model = object;
            },
            (xhr) => { },
            (error) => {
                console.error('Error loading model:', error);
            }
        );
    }

    initEventListeners() {
        window.addEventListener('resize', () => {
            this.updateDimensions();
        });

        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.mouseX = (x / rect.width) * 2 - 1;
            this.mouseY = (y / rect.height) * 2 - 1;

            // Mouse tilt removed per user request (Cover only)
            // this.targetRotationY = this.mouseX * maxTilt;
            // this.targetRotationX = this.mouseY * maxTilt * 0.5;

            this.targetMaskX = x / rect.width;
            this.targetMaskY = y / rect.height;
        });

        this.container.addEventListener('mouseleave', () => {
            this.targetMaskX = -1;
            this.targetMaskY = -1;
        });
    }

    setupObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                this.isVisible = entry.isIntersecting;
            });
        }, { threshold: 0.1 }); // 10% visible

        observer.observe(this.container);
    }

    renderASCII() {
        if (!this.model) return;

        // Throttle ASCII generation for performance
        if (this.frameCount % this.asciiUpdateInterval !== 0) {
            return;
        }

        this.smallCtx.clearRect(0, 0, this.cols, this.rows);
        this.smallCtx.drawImage(this.pixelCanvas, 0, 0, this.cols, this.rows);
        const imageData = this.smallCtx.getImageData(0, 0, this.cols, this.rows);
        const data = imageData.data;

        let asciiStr = "";

        for (let i = 0; i < this.cols * this.rows; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            const a = data[i * 4 + 3];

            if (a < 50) {
                // Background (transparent) -> Use '.'
                asciiStr += ".";
            } else {
                let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

                // Contrast stretching: Map 0.15-0.55 to 0.0-1.0 to use full ramp
                brightness = (brightness - 0.15) * 3.0;
                brightness = Math.max(0, Math.min(1, brightness));

                const charIndex = Math.floor(brightness * (this.asciiChars.length - 1));
                const char = this.asciiChars[charIndex];
                asciiStr += char;
            }

            if ((i + 1) % this.cols === 0) {
                asciiStr += "\n";
            }
        }

        this.asciiCanvas.innerText = asciiStr;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Only render if visible
        if (!this.isVisible) return;

        if (this.modelGroup) {
            // Apply current spin speed
            this.modelGroup.rotation.y += this.spinSpeed;

            // Decay speed towards idle (0.002)
            this.spinSpeed += (0.002 - this.spinSpeed) * 0.05;

            if (!this.hasEntered) {
                // ENTRANCE POSITION (Move up)
                this.modelGroup.position.y += (0 - this.modelGroup.position.y) * 0.04;

                // Check completion
                if (this.modelGroup.position.y > -0.1) {
                    this.hasEntered = true;
                    this.modelGroup.position.y = 0;
                }
            } else {
                if (this.model) {
                    // IDLE MOUSE INTERACTION (Only after entrance)
                    this.model.rotation.y += (this.targetRotationY - this.model.rotation.y) * 0.1;
                    this.model.rotation.x += (this.targetRotationX - this.model.rotation.x) * 0.1;
                }
            }
        }

        const maskEasing = 0.2;
        this.maskX += (this.targetMaskX - this.maskX) * maskEasing;
        this.maskY += (this.targetMaskY - this.maskY) * maskEasing;

        this.container.style.setProperty('--mask-x', `${this.maskX * 100}%`);
        this.container.style.setProperty('--mask-y', `${this.maskY * 100}%`);

        this.renderer.render(this.scene, this.camera);
        this.renderASCII();
        this.frameCount++;
    }
}
