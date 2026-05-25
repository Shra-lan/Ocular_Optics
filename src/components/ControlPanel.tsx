import React from 'react';
import { AppState, Preset } from '../types';
import { Camera, Eye, Plus } from 'lucide-react';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  presets: Preset[];
  loadPreset: (p: Preset) => void;
  savePreset: () => void;
}

export function ControlPanel({ state, setState, presets, loadPreset, savePreset }: Props) {
  const isEye = state.mode === 'EYE';

  return (
    <div className="bg-[#0F1219] border-l border-slate-800 h-full p-6 flex flex-col shadow-lg overflow-y-auto w-80 shrink-0">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5" /> Mode Selection
        </h2>
        <div className="flex bg-[#1A1F26] p-1 rounded-lg border border-slate-700">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${isEye ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => setState({ ...state, mode: 'EYE' })}
          >
            <Eye className="w-4 h-4" /> Eye
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${!isEye ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => setState({ ...state, mode: 'CAMERA' })}
          >
            <Camera className="w-4 h-4" /> Camera
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {isEye 
            ? "Eye Mode: Sensor distance is fixed. Ciliary muscles bend the lens to change focal length (accommodation)." 
            : "Camera Mode: Lens focal length is fixed. The lens moves mechanically to change the sensor distance."}
        </p>
      </div>

      <div className="space-y-6 flex-1">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Object Distance (u)</label>
            <span className="text-sm text-white font-mono">{state.u} px</span>
          </div>
          <input
            type="range"
            min="50"
            max="1000"
            value={state.u}
            onChange={(e) => setState({ ...state, u: parseInt(e.target.value) })}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div>
           <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-tighter">
              {isEye ? 'Eyeball Axial Length (v)' : 'Sensor Distance (v)'}
            </label>
            <span className="text-sm text-white font-mono">{state.L} px</span>
          </div>
          <input
            type="range"
            min="60"
            max="150"
            value={state.L}
            onChange={(e) => setState({ ...state, L: parseInt(e.target.value) })}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          {isEye && (
            <div className="text-[10px] uppercase font-bold mt-2 text-slate-500 flex justify-between">
              <span>Hypermetropic</span>
              <span>Normal</span>
              <span>Myopic</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Corrective Lens Power (p)</label>
            <span className="text-sm text-white font-mono">{state.pCorr} Diopters</span>
          </div>
          <input
            type="range"
            min="-10"
            max="10"
            step="0.5"
            value={state.pCorr}
            onChange={(e) => setState({ ...state, pCorr: parseFloat(e.target.value) })}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            disabled={!isEye}
          />
          <p className="text-xs text-slate-500 mt-2">
            {!isEye ? "Disabled in Camera mode" : "Negative for myopia (concave), positive for hypermetropia (convex)"}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Aperture (f-stop)</label>
            <span className="text-sm text-white font-mono">f/{state.aperture}</span>
          </div>
          <input
            type="range"
            min="2.8"
            max="16"
            step="0.1"
            value={state.aperture}
            onChange={(e) => setState({ ...state, aperture: parseFloat(e.target.value) })}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
          />
        </div>

        {isEye && (
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Patient Age</label>
              <span className="text-sm text-white font-mono">{state.age} yrs</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              value={state.age}
              onChange={(e) => setState({ ...state, age: parseInt(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
            />
            <p className="text-[10px] text-slate-500 mt-1">Simulates Presbyopia (loss of lens elasticity over 40)</p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4 border-t border-slate-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={state.chromaticAberration}
              onChange={(e) => setState({ ...state, chromaticAberration: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-500 accent-blue-500"
            />
            <span className="text-xs font-medium text-slate-300 uppercase tracking-tighter">Chromatic Aberration</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={state.useLiveCamera}
              onChange={(e) => setState({ ...state, useLiveCamera: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-500 accent-blue-500"
            />
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-tighter">Use Live Camera Feed</span>
          </label>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-800 pt-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
          Presets
          <button onClick={savePreset} title="Save current as preset" className="text-blue-400 hover:text-blue-300 p-1 bg-blue-900/30 rounded-full">
            <Plus className="w-4 h-4" />
          </button>
        </h3>
        <div className="space-y-2">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => loadPreset(p)}
              className="w-full text-left p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
            >
              <div className="font-semibold text-slate-300 text-xs">{p.name}</div>
              <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{p.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
