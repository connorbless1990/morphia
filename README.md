# MORPHIA - Morphic Field Visualizer

An interactive 3D visualization of morphic resonance using Three.js, following SOLID principles and modern modular JavaScript architecture.

## Architecture Overview

The application follows **SOLID principles** for maintainable, extensible code:

### Project Structure

```
Morphic/
├── index.html              # Entry point HTML (minimal, clean)
├── vercel.json            # Vercel deployment config
└── src/
    ├── App.js             # Main orchestrator (Composition Root)
    ├── config/
    │   └── constants.js   # Configuration and magic numbers
    ├── audio/
    │   ├── index.js
    │   ├── AudioCore.js         # Audio synthesis engine
    │   └── SilentAudioBridge.js # Mobile audio unlock
    ├── geometry/
    │   ├── index.js
    │   ├── Architect.js           # Shape orchestrator (Strategy Pattern)
    │   ├── BaseShapeGenerator.js  # Base class for generators
    │   └── ShapeGenerators.js     # Individual shape strategies
    ├── particles/
    │   ├── index.js
    │   ├── Swarm.js       # Main particle system
    │   ├── Ether.js       # Background flow field
    │   └── GhostField.js  # Wireframe target shape
    ├── scene/
    │   ├── index.js
    │   ├── SceneManager.js     # Three.js scene setup
    │   └── InputController.js  # Mouse/touch/keyboard handling
    ├── simulation/
    │   ├── index.js
    │   └── MorphicBrain.js # Stability/coherence tracking
    ├── styles/
    │   └── main.css       # Extracted CSS styles
    ├── ui/
    │   ├── index.js
    │   └── UIController.js # DOM interactions
    └── utils/
        ├── eventBus.js    # Pub/sub for decoupling
        └── helpers.js     # Utility functions
```

## SOLID Principles Applied

### Single Responsibility Principle (SRP)
Each module has one job:
- `AudioCore` → Audio synthesis
- `MorphicBrain` → Stability tracking
- `Architect` → Shape generation
- `Swarm` → Particle physics
- `UIController` → DOM events

### Open/Closed Principle (OCP)
- New shapes added via `ShapeGenerators.js` without modifying `Architect`
- Event bus allows extending behavior without modifying existing code

### Liskov Substitution Principle (LSP)
- All shape generators extend `BaseShapeGenerator` and are interchangeable
- Strategy pattern for shape generation

### Interface Segregation Principle (ISP)
- Small, focused interfaces per module
- Components only depend on what they use

### Dependency Inversion Principle (DIP)
- High-level `App.js` depends on abstractions (module interfaces)
- Event bus decouples components

## Design Patterns Used

1. **Strategy Pattern** - Shape generators (`ShapeGenerators.js`)
2. **Mediator Pattern** - Event bus (`eventBus.js`)
3. **Singleton Pattern** - Event bus instance
4. **Composition Root** - `App.js` wires all dependencies

## Technology Stack

- **Three.js** (r128) - 3D rendering
- **Simplex Noise** - Flow field generation
- **Web Audio API** - Sound synthesis
- **Tailwind CSS** - UI styling
- **ES Modules** - Native module system

## Deployment

Deployed on **Vercel** with zero config. Just push to the repo.

```bash
# Local development (requires a server for ES modules)
npx serve .

# Or with Python
python -m http.server 8000
```

## Modes

### Platonic Mode
Observe sacred geometries:
- Sphere, Torus, Merkaba, Dodecahedron
- Icosahedron, Spiral, Flower of Life
- Tree of Life, Kundalini, Vector Equilibrium

### Quantum Mode
Sculpt the morphic field with your cursor:
- Slow movements = precision sculpting
- Fast movements = broad influence

## Parameters

| Parameter | Description |
|-----------|-------------|
| **Resonance** | Field coherence (order) |
| **Vitality** | Particle energy (chaos) |
| **Evolution** | Shape warping factor |

## License

MIT
