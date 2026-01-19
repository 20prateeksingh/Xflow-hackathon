/**
 * Three.js 3D Rendering Engine
 * Professional WebGL rendering with ASCII reveal interaction
 */

class ThreeJSEngine {
    constructor() {
        // Get canvas elements
        this.pixelCanvas = document.getElementById('pixel-canvas');
        this.asciiCanvas = document.getElementById('ascii-canvas');
        this.container = document.getElementById('canvas-container');

        // Mouse tracking for rotation and mask
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;

        // Mask position tracking (for smooth following)
        this.maskX = 0.5;
        this.maskY = 0.5;
        this.targetMaskX = 0.5;
        this.targetMaskY = 0.5;

        // ASCII Settings
        this.charWidth = 6;  // Approximate width for monospace font
        this.charHeight = 10; // Defined in CSS
        // this.asciiChars = "..:-=+*#%@"; // Changed space to dot for background pattern
        this.asciiChars = ".₹$€£"; // Changed space to dot for background pattern


        // Initialize helpers for ASCII generation
        this.initASCIIHelpers();

        // Initialize Three.js
        this.initThreeJS();
        this.initEventListeners();
        this.loadModel();

        // Start animation loop
        this.animate();
    }

    initASCIIHelpers() {
        // Offscreen canvas for downsampling
        this.smallCanvas = document.createElement('canvas');
        this.smallCtx = this.smallCanvas.getContext('2d', { willReadFrequently: true });
        this.updateASCIIDimensions();
    }

    updateASCIIDimensions() {
        // Calculate grid dimensions based on viewport size
        const cols = Math.floor(window.innerWidth / this.charWidth);
        const rows = Math.floor(window.innerHeight / this.charHeight);

        this.smallCanvas.width = cols;
        this.smallCanvas.height = rows;
        this.cols = cols;
        this.rows = rows;
    }

    initThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);  // Reverted to white background

        // Create camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 1000);
        this.camera.position.z = 15;

        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.pixelCanvas,
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true // Required to read pixels for ASCII
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Add lights
        // 1. Ambient Light (Base brightness, increased from 0.4)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        // 2. Key Light (Main directional light, bright white)
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
        keyLight.position.set(1, 1, 2).normalize();
        this.scene.add(keyLight);

        // 3. Fill Light (Softer, slightly blueish to add depth)
        const fillLight = new THREE.DirectionalLight(0xeef4ff, 0.5);
        fillLight.position.set(-1, -1, 1).normalize();
        this.scene.add(fillLight);

        // Model group for rotation
        this.modelGroup = new THREE.Group();
        this.scene.add(this.modelGroup);
    }

    loadModel() {
        // Check if OBJLoader is available
        if (typeof THREE.OBJLoader === 'undefined') {
            console.warn('OBJLoader not available, using fallback cube');
            this.createFallbackModel();
            return;
        }

        const loader = new THREE.OBJLoader();

        loader.load(
            'obj%20files/Xflow.obj',
            (object) => {
                // Apply material
                const material = new THREE.MeshPhongMaterial({
                    color: 0x2E5CB8, // Metallic Blue (Xflow-esque)
                    shininess: 60,   // Higher shininess for metallic look
                    flatShading: false,
                    side: THREE.DoubleSide
                });

                object.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.material = material;
                    }
                });

                // Calculate bounds
                const box = new THREE.Box3().setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                // Calculate scale - REDUCED to match original ASCII look
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 4 / maxDim; // Reduced from 10 to 4

                // Center the model at origin (accounting for scale)
                object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
                object.scale.setScalar(scale);

                this.modelGroup.add(object);
                this.model = object;
            },
            (xhr) => { /* Progress */ },
            (error) => {
                console.error('Error loading model:', error);
                this.createFallbackModel();
            }
        );
    }

    createFallbackModel() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({
            color: 0x808080,
            shininess: 30
        });
        const cube = new THREE.Mesh(geometry, material);
        this.modelGroup.add(cube);
        this.model = cube;
    }

    initEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.updateASCIIDimensions(); // Update ASCII grid size
        });

        // Track mouse
        document.addEventListener('mousemove', (e) => {
            const rect = document.body.getBoundingClientRect();
            this.mouseX = (e.clientX / rect.width) * 2 - 1;
            this.mouseY = (e.clientY / rect.height) * 2 - 1;

            // Tilt effect
            const maxTilt = 0.5;
            this.targetRotationY = this.mouseX * maxTilt;
            this.targetRotationX = this.mouseY * maxTilt * 0.5;

            // Mask position
            this.targetMaskX = e.clientX / window.innerWidth;
            this.targetMaskY = e.clientY / window.innerHeight;
        });
    }

    renderASCII() {
        if (!this.model) return;

        // Downsample the rendered scene to the small canvas
        // We use the pixelCanvas (source) -> smallCanvas (dest)
        this.smallCtx.drawImage(this.pixelCanvas, 0, 0, this.cols, this.rows);

        // Get pixel data
        const imageData = this.smallCtx.getImageData(0, 0, this.cols, this.rows);
        const data = imageData.data;

        let asciiStr = "";

        for (let i = 0; i < this.cols * this.rows; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];

            // Calculate brightness
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            // Map to char (Inverted for white background: Dark = Dense Char, Light = Space)
            const charIndex = Math.floor((1.0 - brightness) * (this.asciiChars.length - 1));
            const char = this.asciiChars[charIndex];

            asciiStr += char;

            // Newline at end of row
            if ((i + 1) % this.cols === 0) {
                asciiStr += "\n";
            }
        }

        this.asciiCanvas.innerText = asciiStr;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Rotation interpolation
        if (this.modelGroup) {
            this.modelGroup.rotation.y += (this.targetRotationY - this.modelGroup.rotation.y) * 0.1;
            this.modelGroup.rotation.x += (this.targetRotationX - this.modelGroup.rotation.x) * 0.1;
        }

        // Mask interpolation
        const maskEasing = 0.2;
        this.maskX += (this.targetMaskX - this.maskX) * maskEasing;
        this.maskY += (this.targetMaskY - this.maskY) * maskEasing;

        // Update CSS mask
        this.container.style.setProperty('--mask-x', `${this.maskX * 100}%`);
        this.container.style.setProperty('--mask-y', `${this.maskY * 100}%`);

        // Render scene
        this.renderer.render(this.scene, this.camera);

        // Generate ASCII overlay
        this.renderASCII();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ThreeJSEngine();
});
