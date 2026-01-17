# How to Upload Custom 3D Models

## Quick Start

1. **Select "Custom (Upload OBJ)"** from the Model dropdown
2. **Click "Choose File"** and select your `.obj` file
3. **Watch your model render** in ASCII art!

## Supported Format

The engine supports **Wavefront OBJ** files (`.obj` extension), which is one of the most common 3D model formats.

### What's Supported:
- ✅ Vertices (`v x y z`)
- ✅ Faces (`f v1 v2 v3`)
- ✅ Triangles, quads, and n-gons (auto-triangulated)
- ✅ Texture coordinates format (`f v1/vt1 v2/vt2 v3/vt3`)
- ✅ Normal coordinates format (`f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3`)
- ✅ Automatic scaling and centering

### Not Yet Supported:
- ❌ Materials (`.mtl` files)
- ❌ Textures
- ❌ Vertex normals (calculated automatically)
- ❌ Groups/objects (all merged into one model)

## Where to Find OBJ Files

### Free 3D Model Resources:
1. **[Thingiverse](https://www.thingiverse.com/)** - Free 3D printable models
2. **[Free3D](https://free3d.com/)** - Free 3D models in various formats
3. **[Sketchfab](https://sketchfab.com/)** - Many models available for download
4. **[TurboSquid Free](https://www.turbosquid.com/Search/3D-Models/free)** - Free section
5. **[CGTrader Free](https://www.cgtrader.com/free-3d-models)** - Free models

### Creating Your Own:
- **Blender** (Free) - Export as OBJ
- **Tinkercad** (Free, web-based) - Export as OBJ
- **SketchUp** (Free version available) - Export as OBJ

## Example OBJ File

Here's a simple pyramid you can copy and save as `pyramid.obj`:

```obj
# Simple Pyramid
v 0.0 1.0 0.0
v -1.0 -1.0 1.0
v 1.0 -1.0 1.0
v 1.0 -1.0 -1.0
v -1.0 -1.0 -1.0

f 1 2 3
f 1 3 4
f 1 4 5
f 1 5 2
f 2 5 4
f 2 4 3
```

Save this as a `.obj` file and upload it!

## Tips for Best Results

### Model Complexity:
- **Simple models** (100-1000 triangles) render fastest
- **Complex models** (10,000+ triangles) may slow down performance
- The engine handles up to ~50,000 triangles smoothly

### Model Size:
- Don't worry about scale - models are **automatically normalized**
- The engine centers and scales your model to fit the viewport

### Model Orientation:
- Models are loaded as-is from the OBJ file
- Use your 3D software to orient the model before exporting
- The engine applies rotation based on mouse movement

## Troubleshooting

### Model doesn't appear:
- Check that the file is a valid `.obj` file
- Ensure it contains both vertices (`v`) and faces (`f`)
- Try a simpler model first to test

### Model looks wrong:
- Some OBJ exporters use different coordinate systems
- Try rotating the model in your 3D software before exporting
- Check that faces are defined correctly (counter-clockwise winding)

### Performance issues:
- Reduce polygon count in your 3D software
- Use "Decimate" modifier in Blender to reduce triangles
- Simpler models = better performance

## Built-in Models

Don't have an OBJ file? Try these built-in models:
- **Torus Knot** - Complex mathematical shape (default)
- **Sphere** - Classic smooth sphere
- **Cube** - Simple geometric cube

## Technical Details

The OBJ parser:
1. Reads vertex positions (`v` lines)
2. Reads face definitions (`f` lines)
3. Handles 1-indexed vertices (OBJ standard)
4. Triangulates quads and n-gons automatically
5. Calculates bounding box
6. Centers model at origin
7. Scales to fit viewport (target size: 5 units)

All rendering uses the same ASCII pipeline regardless of model source!
