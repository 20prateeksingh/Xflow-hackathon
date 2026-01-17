#!/usr/bin/env python3
"""
SVG to OBJ Converter - Simplified version
Converts SVG paths to extruded 3D OBJ models
"""

import re
import xml.etree.ElementTree as ET

def approximate_bezier(p0, p1, p2, p3, segments=10):
    """Approximate cubic Bezier curve with line segments"""
    points = []
    for i in range(segments + 1):
        t = i / segments
        # Cubic Bezier formula
        x = (1-t)**3 * p0[0] + 3*(1-t)**2*t * p1[0] + 3*(1-t)*t**2 * p2[0] + t**3 * p3[0]
        y = (1-t)**3 * p0[1] + 3*(1-t)**2*t * p1[1] + 3*(1-t)*t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
    return points

def parse_svg_path_robust(path_d):
    """Robustly parse SVG path data"""
    points = []
    current_x, current_y = 0, 0
    start_x, start_y = 0, 0
    
    # Tokenize the path
    tokens = re.findall(r'[MLHVZCmlhvzc]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?', path_d)
    
    i = 0
    while i < len(tokens):
        cmd = tokens[i]
        i += 1
        
        if cmd in 'Mm':
            # Move to
            x = float(tokens[i])
            y = float(tokens[i+1])
            i += 2
            
            if cmd == 'M':
                current_x, current_y = x, y
            else:
                current_x += x
                current_y += y
            
            start_x, start_y = current_x, current_y
            points.append((current_x, current_y))
            
        elif cmd in 'Ll':
            # Line to
            x = float(tokens[i])
            y = float(tokens[i+1])
            i += 2
            
            if cmd == 'L':
                current_x, current_y = x, y
            else:
                current_x += x
                current_y += y
            
            points.append((current_x, current_y))
            
        elif cmd in 'Hh':
            # Horizontal line
            x = float(tokens[i])
            i += 1
            
            if cmd == 'H':
                current_x = x
            else:
                current_x += x
            
            points.append((current_x, current_y))
            
        elif cmd in 'Vv':
            # Vertical line
            y = float(tokens[i])
            i += 1
            
            if cmd == 'V':
                current_y = y
            else:
                current_y += y
            
            points.append((current_x, current_y))
            
        elif cmd in 'Cc':
            # Cubic Bezier curve
            x1 = float(tokens[i])
            y1 = float(tokens[i+1])
            x2 = float(tokens[i+2])
            y2 = float(tokens[i+3])
            x = float(tokens[i+4])
            y = float(tokens[i+5])
            i += 6
            
            if cmd == 'c':
                x1 += current_x
                y1 += current_y
                x2 += current_x
                y2 += current_y
                x += current_x
                y += current_y
            
            # Approximate curve with line segments
            curve_points = approximate_bezier(
                (current_x, current_y),
                (x1, y1),
                (x2, y2),
                (x, y),
                segments=5
            )
            points.extend(curve_points[1:])  # Skip first point (already added)
            
            current_x, current_y = x, y
            
        elif cmd in 'Zz':
            # Close path
            if (current_x, current_y) != (start_x, start_y):
                points.append((start_x, start_y))
            current_x, current_y = start_x, start_y
    
    return points

def triangulate_polygon_earclip(points):
    """Simple ear clipping triangulation"""
    if len(points) < 3:
        return []
    
    # For now, use simple fan triangulation
    # (works well for convex polygons)
    triangles = []
    for i in range(1, len(points) - 1):
        triangles.append([0, i, i + 1])
    
    return triangles

def svg_to_obj(svg_file, width=100, depth=10, output_file='output.obj'):
    """Convert SVG to OBJ with extrusion"""
    
    # Parse SVG
    tree = ET.parse(svg_file)
    root = tree.getroot()
    
    # Get viewBox
    viewbox = root.get('viewBox')
    if viewbox:
        vb = [float(x) for x in viewbox.split()]
        svg_width = vb[2]
        svg_height = vb[3]
    else:
        svg_width = float(root.get('width', 100))
        svg_height = float(root.get('height', 100))
    
    # Scale factor
    scale = width / svg_width
    
    # Find all path elements
    # Handle SVG namespace
    namespaces = {'svg': 'http://www.w3.org/2000/svg'}
    paths = root.findall('.//svg:path', namespaces)
    if not paths:
        paths = root.findall('.//path')  # Try without namespace
    
    vertices = []
    faces = []
    
    for path in paths:
        path_d = path.get('d')
        if not path_d:
            continue
        
        # Parse path
        points = parse_svg_path_robust(path_d)
        
        if len(points) < 3:
            continue
        
        # Scale and flip Y
        scaled_points = []
        for x, y in points:
            scaled_x = x * scale
            scaled_y = -y * scale  # Flip Y axis
            scaled_points.append((scaled_x, scaled_y))
        
        # Create front face vertices (z = depth/2)
        front_start = len(vertices)
        for x, y in scaled_points:
            vertices.append((x, y, depth / 2))
        
        # Create back face vertices (z = -depth/2)
        back_start = len(vertices)
        for x, y in scaled_points:
            vertices.append((x, y, -depth / 2))
        
        # Triangulate front face
        front_triangles = triangulate_polygon_earclip(scaled_points)
        for tri in front_triangles:
            face = [
                front_start + tri[0] + 1,  # +1 for OBJ 1-indexing
                front_start + tri[1] + 1,
                front_start + tri[2] + 1
            ]
            faces.append(face)
        
        # Triangulate back face (reversed winding)
        for tri in front_triangles:
            face = [
                back_start + tri[0] + 1,
                back_start + tri[2] + 1,  # Reversed
                back_start + tri[1] + 1
            ]
            faces.append(face)
        
        # Create side faces
        n = len(scaled_points)
        for i in range(n):
            next_i = (i + 1) % n
            
            v1 = front_start + i + 1
            v2 = back_start + i + 1
            v3 = back_start + next_i + 1
            v4 = front_start + next_i + 1
            
            # Two triangles per quad
            faces.append([v1, v2, v3])
            faces.append([v1, v3, v4])
    
    # Write OBJ file
    with open(output_file, 'w') as f:
        f.write("# OBJ file generated from SVG\n")
        f.write(f"# Original SVG: {svg_width}x{svg_height}\n")
        f.write(f"# Scaled to: {width} units wide, {depth} units deep\n")
        f.write(f"# Generated from: {svg_file}\n\n")
        
        # Write vertices
        for v in vertices:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        
        f.write("\n")
        
        # Write faces
        for face in faces:
            f.write(f"f {face[0]} {face[1]} {face[2]}\n")
    
    print(f"✅ Converted SVG to OBJ: {output_file}")
    print(f"   Vertices: {len(vertices)}")
    print(f"   Faces: {len(faces)}")
    print(f"   Paths processed: {len(paths)}")

if __name__ == "__main__":
    svg_to_obj('reference/xflow.svg', width=100, depth=10, output_file='reference/xflow.obj')
