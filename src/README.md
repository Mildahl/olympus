# AECO Olympus Core

The Olympus core is the main runtime engine for the AECO application. This document describes the scene orientation, axis conventions, and coordinate transformations used throughout the system.

## Scene Orientation

AECO presents a **Z-up** coordinate system to users, following engineering, GIS, and BIM conventions:

| Axis | Direction | Usage |
|------|-----------|-------|
| **X** | Right (+) / Left (-) | Horizontal plane |
| **Y** | Forward (+) / Back (-) | Horizontal plane (depth) |
| **Z** | Up (+) / Down (-) | Vertical (elevation) |

## Hybrid Coordinate System Architecture

Three.js rendering pipeline is **Y-up**. This cannot be changed - shaders, built-in helpers, and the WebGL renderer expect Y as vertical. However, BIM/CAD/GIS standards use **Z-up**.

AECO uses a **hybrid approach**:

| Layer | Convention | Purpose |
|-------|------------|---------|
| **User API** | Z-up | All public APIs accept Z-up coordinates |
| **Camera Controls** | Z-up | `camera.up = (0,0,1)` makes orbit/pan feel natural |
| **Three.js Storage** | Y-up | Internal geometry storage matches renderer |
| **IFC Backend** | Z-up | IfcOpenShell uses native Z-up |

### Why This Architecture?

1. **Three.js renders Y-up** - We cannot change WebGL's coordinate expectations
2. **IFC data is Z-up** - BIM industry standard, stored natively in IfcOpenShell
3. **Users expect Z-up** - Engineers/architects think in Z-up coordinates
4. **Camera.up controls orbit axis** - Setting to Z makes controls feel correct

The transformations happen at system boundaries, keeping each subsystem internally consistent.

## Camera Configuration

Camera up vector settings depend on the context:

| Context | `camera.up` | Purpose |
|---------|-------------|---------|
| Initial setup (ThreeHelpers) | `(0, 0, 1)` | Orbit controls feel Z-up to user |
| Pose resets (NavigationController) | `(0, 1, 0)` | `lookAt()` expects Y-up internally |

The orbit controls interpret the up vector for pan/orbit behavior. But when doing explicit `camera.lookAt()` calls during navigation, we use Y-up because the internal coordinate storage is Y-up.

## Coordinate Transformations

### 1. Placement API (Z-up API → Internal Y-up Storage)

The [tool/model/placement.js](tool/model/placement.js) transforms Z-up API coordinates to internal storage:

```javascript
static setPosition(context, object, position) {
    object.position.set(position.x, position.z, -position.y);
}

static setRotation(context, object, axis, degrees) {
    switch (axis.toLowerCase()) {
        case 'x': object.rotation.x = radians; break;
        case 'y': object.rotation.z = radians; break;
        case 'z': object.rotation.y = -radians; break;
    }
}
```

| API Input (Z-up) | Internal Storage (Y-up) |
|------------------|-------------------------|
| `position.x` | `THREE.position.x` |
| `position.y` | `THREE.position.z` (negated) |
| `position.z` | `THREE.position.y` |

### 2. IFC/BIM Geometry Loading

IFC models from IfcOpenShell use Z-up convention natively. When loading IFC geometry:

**Strategy**: Apply -90° X rotation to the parent Group container

In [core/bim.js](core/bim.js):

```javascript
place(projectRootGroup, {
    position: { x: 0, y: 0, z: 0 },
    rotation: { axis: "x", angle: -90 },
});
```

For individual IFC elements added to scene:

```javascript
worldTools.placement.setRotation(null, group, "x", "-90");
```

**Why this works**: IFC matrices from the backend are applied directly to meshes, and the parent group's rotation transforms the entire geometry from Z-up to the scene's coordinate display.

### 3. BIM Modeling Operations (Drawing → IFC Backend)

When creating BIM elements through drawing tools, coordinates from the Three.js raycaster (internal Y-up) must be transformed to IFC Z-up convention before sending to the Python backend.

The shared transformation function in [context/world/utils/CoordinateSystemHelper.js](context/world/utils/CoordinateSystemHelper.js):

```javascript
static toIFCCoordinates(position) {
    return { x: position.x, y: -position.z, z: position.y };
}
```

| Three.js Internal (Y-up) | IFC Backend (Z-up) |
|--------------------------|---------------------|
| `position.x` | `x` |
| `position.y` | `z` |
| `position.z` | `-y` |

This transformation is applied to `start`, `end`, and `position` parameters before executing BIM operations.

## IFC Database Coordinate Convention

The Python IFC authoring tools in [static/pytools/ifc_author.py](../static/pytools/ifc_author.py) work natively in Z-up convention:

```python
Position = namedtuple('Position', ['x', 'y', 'z'])  # Z-up
Rotation = namedtuple('Rotation', ['x', 'y', 'z'])
```

Placement matrices are created directly in Z-up:

```python
matrix[:, 3][:3] = [position.x, position.y, position.z]  # Z-up coordinates
```

## Helper Utilities

### CoordinateSystemHelper

The [context/world/utils/CoordinateSystemHelper.js](context/world/utils/CoordinateSystemHelper.js) provides utility functions:

| Function | Purpose |
|----------|---------|
| `toIFCCoordinates(position)` | Convert Three.js Y-up to IFC Z-up coordinates |
| `getMovementAxis(constraint)` | Get axis vector for movement constraints |
| `getConstraintColor(constraint)` | Get color for axis (X=red, Y=green, Z=blue) |
| `projectToConstraint(vector, constraint)` | Project movement onto constraint axis |
| `getAxisDescription(constraint)` | Get human-readable axis description |
| `transformMatrixToIFC(threeJsMatrix)` | Convert Three.js matrix to IFC format |

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                          (Z-up coordinate display)                          │
│                     Gizmo shows: X=red, Y=green, Z=blue                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLACEMENT API                                      │
│                   positions (Z-up) → setPosition()                          │
│                   rotations (Z-up) → setRotation()                          │
│              CoordinateSystemHelper.toIFCCoordinates()                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
┌──────────────────────────────┐     ┌──────────────────────────────────────┐
│      THREE.JS SCENE          │     │         IFC/BIM BACKEND              │
│    (Y-up internal storage)   │     │       (Z-up native storage)          │
│                              │     │                                      │
│  Objects positioned by:      │     │  Python IfcOpenShell:                │
│  object.position.set(        │     │  Position(x, y, z) # Z-up            │
│    x, z, -y                  │     │                                      │
│  )                           │     │  Matrices stored in Z-up             │
│                              │     │                                      │
│  IFC geometry groups:        │     │                                      │
│  -90° X rotation applied     │◄────│  IFC matrices applied directly       │
│  to parent container         │     │  to meshes                           │
└──────────────────────────────┘     └──────────────────────────────────────┘
```

## Color Coding Convention

Axes follow the standard CAD/3D color convention:

| Axis | Color | Hex Value |
|------|-------|-----------|
| X | Red | `0xff0000` |
| Y | Green | `0x00ff00` |
| Z | Blue | `0x0000ff` |

## Related Files

| File | Purpose |
|------|---------|
| [context/world/Editor.js](context/world/Editor.js) | Scene setup, Z-up definition |
| [context/world/Viewport.js](context/world/Viewport.js) | Rendering, grid, transform controls |
| [context/world/utils/ThreeHelpers.js](context/world/utils/ThreeHelpers.js) | Visual helpers, camera setup |
| [context/world/utils/CoordinateSystemHelper.js](context/world/utils/CoordinateSystemHelper.js) | Coordinate utilities |
| [tool/model/placement.js](tool/model/placement.js) | Position/rotation API |
| [core/bim.js](core/bim.js) | BIM geometry loading |
| [modules/bim.model/operators.js](modules/bim.model/operators.js) | BIM modeling operations |
| [tool/bim/geometry.js](tool/bim/geometry.js) | Three.js mesh generation |
| [static/pytools/ifc_author.py](../static/pytools/ifc_author.py) | Python IFC authoring |
