/**
 * ASCII 3D Rendering Engine
 * Real-time text-based 3D graphics with mouse-driven rotation
 */

class ASCII3DEngine {
    constructor() {
        // Canvas configuration
        this.canvas = document.getElementById('ascii-canvas');

        // Math constants for performance
        this.PI = Math.PI;
        this.PI2 = Math.PI * 2;
        this.PI_HALF = Math.PI / 2;
        this.RAD_TO_DEG = 180 / Math.PI;


        // ASCII character ramp (light to dark) - dot reserved for background only
        // this.chars = '&#@%=*+-:';
        // this.chars = '-=+*#%@';
        this.chars = '₹¥£€$=*+-';





        // Rendering buffers
        this.buffer = [];
        this.zBuffer = [];

        // Camera/rotation state
        this.rotationX = 0;
        this.rotationY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;

        // Mouse tracking
        this.mouseX = 0;
        this.mouseY = 0;

        // Performance tracking
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();

        // Initialize
        this.updateDimensions();
        this.initEventListeners();

        // Auto-load Xflow logo
        this.loadXflowLogo();
    }

    async loadXflowLogo() {
        try {
            // URL encode the path to handle the space in 'obj files'
            const response = await fetch('obj%20files/Xflow.obj');
            const objText = await response.text();
            this.parseOBJ(objText);
            this.render();
        } catch (error) {
            console.error('Failed to load Xflow logo:', error);
            // Fallback to torus knot if loading fails
            this.createTorusKnot();
            this.render();
        }
    }

    updateDimensions() {
        // Calculate grid size based on window size and approx font size (6px width, 10px height)
        const charWidth = 6;
        const charHeight = 10;

        this.width = Math.floor(window.innerWidth / charWidth);
        this.height = Math.floor(window.innerHeight / charHeight);

        // Update viewport offsets
        this.halfWidth = this.width / 2;
        this.halfHeight = this.height / 2;

        // Re-initialize buffers with new size
        this.initBuffers();
    }

    initBuffers() {
        // Create 2D arrays for character buffer and z-buffer
        for (let y = 0; y < this.height; y++) {
            this.buffer[y] = new Array(this.width).fill('.');
            this.zBuffer[y] = new Array(this.width).fill(Infinity);
        }
    }

    initEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.updateDimensions();
        });

        // Track mouse movement for camera rotation
        document.addEventListener('mousemove', (e) => {
            const rect = document.body.getBoundingClientRect();
            this.mouseX = (e.clientX / rect.width) * 2 - 1;  // -1 to 1
            this.mouseY = (e.clientY / rect.height) * 2 - 1; // -1 to 1

            // Subtle tilt effect - object follows cursor but with limited rotation
            // Limit rotation to ±20 degrees (about 0.35 radians) for subtle effect
            const maxTilt = 0.3;
            this.targetRotationY = -this.mouseX * maxTilt;       // Left-right tilt (reversed)
            this.targetRotationX = -this.mouseY * maxTilt * 0.5; // Up-down tilt (flipped to match Y-axis)
        });
    }


    createTorusKnot() {
        this.vertices = [];
        this.faces = [];

        const p = 3;
        const q = 2;
        const segments = 120;
        const tubeSegments = 20;
        const radius = 2;
        const tube = 0.8;

        for (let i = 0; i < segments; i++) {
            const u = (i / segments) * this.PI2 * q;

            for (let j = 0; j < tubeSegments; j++) {
                const v = (j / tubeSegments) * this.PI2;

                const r = radius + tube * Math.cos(v);
                const x = r * Math.cos(p * u / q);
                const y = r * Math.sin(p * u / q);
                const z = tube * Math.sin(v);

                this.vertices.push({ x, y, z });

                if (i < segments - 1 && j < tubeSegments - 1) {
                    const current = i * tubeSegments + j;
                    const next = current + tubeSegments;

                    this.faces.push([current, next, next + 1]);
                    this.faces.push([current, next + 1, current + 1]);
                }
            }
        }
    }
    parseOBJ(objText) {
        this.vertices = [];
        this.faces = [];

        const lines = objText.split('\n');

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);

            if (parts[0] === 'v') {
                // Vertex
                const x = parseFloat(parts[1]);
                const y = parseFloat(parts[2]);
                const z = parseFloat(parts[3]);
                this.vertices.push({ x, y, z });
            } else if (parts[0] === 'f') {
                // Face (supports v, v/vt, v/vt/vn formats)
                const indices = [];
                for (let i = 1; i < parts.length; i++) {
                    const vertexIndex = parseInt(parts[i].split('/')[0]) - 1; // OBJ is 1-indexed
                    indices.push(vertexIndex);
                }

                // Triangulate if needed (assumes convex polygons)
                if (indices.length === 3) {
                    this.faces.push(indices);
                } else if (indices.length === 4) {
                    // Quad to two triangles
                    this.faces.push([indices[0], indices[1], indices[2]]);
                    this.faces.push([indices[0], indices[2], indices[3]]);
                } else if (indices.length > 4) {
                    // Fan triangulation for n-gons
                    for (let i = 1; i < indices.length - 1; i++) {
                        this.faces.push([indices[0], indices[i], indices[i + 1]]);
                    }
                }
            }
        }

        // Auto-scale and center the model
        this.normalizeModel();
    }

    normalizeModel() {
        if (this.vertices.length === 0) return;

        // Find bounding box
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const v of this.vertices) {
            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            minZ = Math.min(minZ, v.z);
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
            maxZ = Math.max(maxZ, v.z);
        }

        // Calculate center and scale
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const maxSize = Math.max(sizeX, sizeY, sizeZ);

        const targetSize = 10; // Target size for display
        const scale = targetSize / maxSize;

        // Center and scale all vertices
        for (const v of this.vertices) {
            v.x = (v.x - centerX) * scale;
            v.y = (v.y - centerY) * scale;
            v.z = (v.z - centerZ) * scale;
        }
    }

    // 3D Math Functions
    rotateX(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: point.x,
            y: point.y * cos - point.z * sin,
            z: point.y * sin + point.z * cos
        };
    }

    rotateY(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: point.x * cos + point.z * sin,
            y: point.y,
            z: -point.x * sin + point.z * cos
        };
    }

    rotateZ(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: point.x * cos - point.y * sin,
            y: point.x * sin + point.y * cos,
            z: point.z
        };
    }

    project(point) {
        // Perspective projection
        const fov = 7;
        const distance = 10;
        const z = point.z + distance;

        if (z <= 0) return null; // Behind camera

        const scale = fov / z;

        // Aspect ratio correction: ASCII chars are ~1.6x taller than wide
        // Scale X more to compensate (makes models appear with correct proportions)
        const aspectRatio = 1.6; // Typical monospace character height/width ratio

        return {
            x: ~~(point.x * scale * 8 * aspectRatio + this.halfWidth),   // Wider scaling
            y: ~~(-point.y * scale * 8 + this.halfHeight),                // Negated Y (screen Y goes down, 3D Y goes up)
            z: z
        };
    }

    clearBuffers() {
        for (let y = 0; y < this.height; y++) {
            this.buffer[y].fill('.');
            this.zBuffer[y].fill(Infinity);
        }
    }

    drawTriangle(v0, v1, v2, brightness) {
        // Get bounding box (using bitwise operators for performance)
        const minX = Math.max(0, ~~Math.min(v0.x, v1.x, v2.x));
        const maxX = Math.min(this.width - 1, ~~Math.max(v0.x, v1.x, v2.x) + 1);
        const minY = Math.max(0, ~~Math.min(v0.y, v1.y, v2.y));
        const maxY = Math.min(this.height - 1, ~~Math.max(v0.y, v1.y, v2.y) + 1);

        // Rasterize triangle
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Barycentric coordinates for point-in-triangle test
                const w0 = this.edgeFunction(v1, v2, { x, y });
                const w1 = this.edgeFunction(v2, v0, { x, y });
                const w2 = this.edgeFunction(v0, v1, { x, y });

                if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                    // Interpolate z-depth
                    const area = this.edgeFunction(v0, v1, v2);
                    if (area === 0) continue;

                    const z = (v0.z * w0 + v1.z * w1 + v2.z * w2) / area;

                    // Z-buffer test
                    if (z < this.zBuffer[y][x]) {
                        this.zBuffer[y][x] = z;

                        // Map brightness to ASCII character
                        // Brightness is already in 0-1 range from ambient + diffuse lighting
                        const charIndex = Math.floor(brightness * (this.chars.length - 1));
                        this.buffer[y][x] = this.chars[Math.max(0, Math.min(this.chars.length - 1, charIndex))];
                    }
                }
            }
        }
    }

    edgeFunction(a, b, c) {
        return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x);
    }

    calculateNormal(v0, v1, v2) {
        // Calculate face normal using cross product
        const u = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const v = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

        return {
            x: u.y * v.z - u.z * v.y,
            y: u.z * v.x - u.x * v.z,
            z: u.x * v.y - u.y * v.x
        };
    }

    normalize(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len === 0) return { x: 0, y: 0, z: 0 };
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    }

    renderFrame() {
        this.clearBuffers();

        // Smooth rotation interpolation
        this.rotationX += (this.targetRotationX - this.rotationX) * 0.1;
        this.rotationY += (this.targetRotationY - this.rotationY) * 0.1;

        // Auto-rotation disabled - models only rotate with mouse movement
        // const time = performance.now() * 0.0003;
        // const autoRotY = time;
        // const autoRotX = Math.sin(time * 0.5) * 0.2;

        // Transform and project vertices
        const transformedVertices = this.vertices.map(v => {
            let p = { ...v };
            p = this.rotateY(p, this.rotationY);
            p = this.rotateX(p, this.rotationX);
            // Removed auto Z-rotation
            return p;
        });

        const projectedVertices = transformedVertices.map(v => this.project(v));

        // Light direction options - uncomment one to try different lighting:

        // Option 1: Upper right front (current) - balanced, shows form well
        // const light = this.normalize({ x: 0.3, y: -0.6, z: -0.8 });

        // Option 2: Direct front top - dramatic top lighting, strong highlights
        // const light = this.normalize({ x: 0, y: -1, z: -0.5 });

        // Option 3: Side lighting (right) - emphasizes edges and contours
        // const light = this.normalize({ x: 1, y: -0.3, z: -0.5 });

        // Option 4: Soft upper left - gentle, diffused look
        const light = this.normalize({ x: -0.4, y: -0.7, z: -0.6 });

        // Option 5: Dramatic low angle - rim lighting effect
        // const light = this.normalize({ x: 0.2, y: 0.8, z: -0.5 });

        // View direction (camera looking down -Z axis)
        const viewDir = this.normalize({ x: 0, y: 0, z: -1 });

        // Lighting parameters
        const ambientStrength = 0.2;   // Ambient light (base illumination)
        const diffuseStrength = 0.5;   // Diffuse light (matte surface)
        const specularStrength = 0.6;  // Specular light (glossy highlights)
        const shininess = 32;          // Higher = smaller, sharper highlights (metallic)

        // Render faces
        const facesWithDepth = this.faces.map((face, i) => {
            const v0 = transformedVertices[face[0]];
            const v1 = transformedVertices[face[1]];
            const v2 = transformedVertices[face[2]];

            // Calculate average z for sorting
            const avgZ = (v0.z + v1.z + v2.z) / 3;

            // Calculate normal and lighting
            const normal = this.normalize(this.calculateNormal(v0, v1, v2));



            // Diffuse lighting (Lambertian)
            const diffuse = Math.max(0, -(normal.x * light.x + normal.y * light.y + normal.z * light.z));

            // Specular lighting (Phong)
            // Reflect light vector around normal: R = 2(N·L)N - L
            const dotNL = -(normal.x * light.x + normal.y * light.y + normal.z * light.z);
            const reflectX = 2 * dotNL * normal.x + light.x;
            const reflectY = 2 * dotNL * normal.y + light.y;
            const reflectZ = 2 * dotNL * normal.z + light.z;

            // Normalize reflection vector
            const reflectLen = Math.sqrt(reflectX * reflectX + reflectY * reflectY + reflectZ * reflectZ);
            const reflectNormX = reflectX / reflectLen;
            const reflectNormY = reflectY / reflectLen;
            const reflectNormZ = reflectZ / reflectLen;

            // Calculate specular component (R·V)^shininess
            const specDot = Math.max(0, reflectNormX * viewDir.x + reflectNormY * viewDir.y + reflectNormZ * viewDir.z);
            const specular = Math.pow(specDot, shininess);

            // Combine all lighting components
            // Ambient + Diffuse + Specular
            const brightness = ambientStrength + (diffuseStrength * diffuse) + (specularStrength * specular);

            // Clamp to 0-1 range
            const finalBrightness = Math.min(1, Math.max(0, brightness));

            return { face, avgZ, brightness: finalBrightness };
        });

        // Sort faces by depth (painter's algorithm)
        // Draw from farthest (smallest Z) to closest (largest Z)
        facesWithDepth.sort((a, b) => a.avgZ - b.avgZ);

        // Draw faces
        facesWithDepth.forEach(({ face, brightness }) => {
            const p0 = projectedVertices[face[0]];
            const p1 = projectedVertices[face[1]];
            const p2 = projectedVertices[face[2]];

            if (p0 && p1 && p2) {
                this.drawTriangle(p0, p1, p2, brightness);
            }
        });
    }

    displayBuffer() {
        // Convert buffer to HTML
        let html = '<tbody><tr><td style="display:block;width:' + (this.width * 7.5) + 'px;height:' + (this.height * 11) + 'px;overflow:hidden">';

        for (let y = 0; y < this.height; y++) {
            html += this.buffer[y].join('');
            if (y < this.height - 1) html += '<br>';
        }

        html += '</td></tr></tbody>';
        this.canvas.innerHTML = html;
    }

    updateStats() {
        // Calculate FPS
        this.frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;

        if (elapsed >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastTime = currentTime;

            this.fpsDisplay.textContent = `FPS: ${this.fps}`;
        }

        // Update rotation display (using cached conversion)
        const rotX = ~~(this.rotationX * this.RAD_TO_DEG);
        const rotY = ~~(this.rotationY * this.RAD_TO_DEG);
        this.rotationDisplay.textContent = `Rotation: ${rotY}°, ${rotX}°`;
    }

    render() {
        this.renderFrame();
        this.displayBuffer();

        requestAnimationFrame(() => this.render());
    }
}

// Initialize engine when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ASCII3DEngine();
});
