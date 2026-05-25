export type AppMode = 'EYE' | 'CAMERA';

export interface AppState {
  mode: AppMode;
  u: number; // Object distance from lens (pixels)
  L: number; // Axial length / Sensor distance (pixels)
  pCorr: number; // Corrective lens power (scaled diopters, e.g., -50 to +50)
  aperture: number; // f-number (e.g. 2.8 to 16)
  age: number; // 10 to 80
  chromaticAberration: boolean;
  useLiveCamera: boolean;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  mode: AppMode;
  axialLength: number;
  objectDistance: number;
  correctivePower: number;
  aperture?: number;
  age?: number;
}
