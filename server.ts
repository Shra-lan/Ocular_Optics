import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Mock database for presets
interface Preset {
  id: string;
  name: string;
  description: string;
  mode: 'EYE' | 'CAMERA';
  axialLength: number;
  objectDistance: number;
  correctivePower: number;
  aperture?: number;
  age?: number;
}

// --- DATABASE SCHEMA (SQL Mock representation) ---
/**
 * CREATE TABLE patient_profiles (
 *     id SERIAL PRIMARY KEY,
 *     name VARCHAR(100),
 *     condition_type VARCHAR(50), -- 'myopia', 'hypermetropia', 'presbyopia'
 *     axial_length_mm NUMERIC(4,2),
 *     lens_elasticity_factor NUMERIC(3,2)
 * );
 */

const presets: Preset[] = [
  {
    id: '1',
    name: 'Normal Vision (Emmetropia)',
    description: 'Parallel light rays converge perfectly onto the retina.',
    mode: 'EYE',
    axialLength: 100, // Standard base size
    objectDistance: 500, // Distance to focus on
    correctivePower: 0,
  },
  {
    id: '2',
    name: 'Patient A: Severe Myopia',
    description: 'Elongated eyeball causing focus in front of the retina. Requires a diverging (concave) lens.',
    mode: 'EYE',
    axialLength: 120, // Elongated
    objectDistance: 500,
    correctivePower: -4.0, // Diopters
  },
  {
    id: '3',
    name: 'Patient B: Hypermetropia',
    description: 'Shortened eyeball causing focus behind the retina. Requires a converging (convex) lens.',
    mode: 'EYE',
    axialLength: 80, // Shortened
    objectDistance: 200, // Near object
    correctivePower: 4.0,
  },
  {
    id: '3b',
    name: 'Patient C: Presbyopia (Age 65)',
    description: 'Loss of lens elasticity prevents near focus accommodation. Requires reading glasses (convex lens).',
    mode: 'EYE',
    axialLength: 100, 
    objectDistance: 150, 
    correctivePower: 5.0,
    age: 65,
  },
  {
    id: '4',
    name: 'Camera: Manual Focus',
    description: 'Focal length is fixed. Sensor distance changes to focus.',
    mode: 'CAMERA',
    axialLength: 100, // Sensor distance relative to lens
    objectDistance: 200,
    correctivePower: 0,
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/presets', (req, res) => {
    res.json(presets);
  });

  app.post('/api/presets', (req, res) => {
    const newPreset: Preset = { ...req.body, id: Date.now().toString() };
    presets.push(newPreset);
    res.status(201).json(newPreset);
  });

  // Required API routes per spec mapping to the same underlying mock DB
  app.get('/api/patients', (req, res) => {
    res.json(presets);
  });

  app.post('/api/prescriptions', (req, res) => {
    // Record calculated corrective lens diopters back to mock DB
    const newPreset: Preset = { ...req.body, id: Date.now().toString() };
    presets.push(newPreset);
    res.status(201).json({ success: true, prescription: newPreset });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
