import React, { useState, useEffect } from 'react';
import { EyeCanvas } from './components/EyeCanvas';
import { ViewScreen } from './components/ViewScreen';
import { ControlPanel } from './components/ControlPanel';
import { AppState, Preset } from './types';

export default function App() {
  const [state, setState] = useState<AppState>({
    mode: 'EYE',
    u: 500,
    L: 100,
    pCorr: 0,
    aperture: 2.8,
    age: 25,
    chromaticAberration: false,
    useLiveCamera: false,
  });

  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    // Fetch initial presets from API
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => setPresets(data))
      .catch(err => console.error("Could not load presets", err));
  }, []);

  const loadPreset = (p: Preset) => {
    setState((prev) => ({
      ...prev,
      mode: p.mode,
      u: p.objectDistance,
      L: p.axialLength,
      pCorr: p.correctivePower,
      aperture: p.aperture ?? prev.aperture,
      age: p.age ?? prev.age,
    }));
  };

  const savePreset = () => {
    const name = window.prompt("Enter a name for your custom preset:");
    if (!name) return;
    
    fetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: `Custom ${state.mode} configuration.`,
        mode: state.mode,
        axialLength: state.L,
        objectDistance: state.u,
        correctivePower: state.pCorr,
        aperture: state.aperture,
        age: state.age,
      })
    })
      .then(res => res.json())
      .then(data => {
         if (data.prescription) setPresets([...presets, data.prescription]);
      })
      .catch(err => console.error("Could not save preset", err));
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0B0E14] text-slate-300 font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800 bg-[#0F1219] shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">OcularOptics <span className="text-blue-500 font-light">Sim</span></span>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-400">MATH CORE ACTIVE</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 p-6 flex flex-col gap-4 bg-[radial-gradient(circle_at_center,_#161b22_0%,_#0B0E14_100%)]">
          {/* Main Simulation Viewport */}
          <div className="flex-1 flex flex-col xl:flex-row gap-4 min-h-0 relative">
             <EyeCanvas state={state} />
             <ViewScreen state={state} />
          </div>
        </section>
        
        {/* Control Panel (Right Sidebar) */}
        <ControlPanel 
          state={state} 
          setState={setState} 
          presets={presets} 
          loadPreset={loadPreset} 
          savePreset={savePreset} 
        />
      </main>

      <footer className="h-8 bg-[#0B0E14] border-t border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="text-[10px] text-slate-500">
          System Status: <span className="text-emerald-500">NOMINAL</span> • Focus mode: {state.mode}
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[10px] text-slate-500 font-mono tracking-tighter">λ = 555nm (Green-Peak)</span>
          <span className="text-[10px] text-slate-500 font-mono">FOV: 155° HORIZ</span>
        </div>
      </footer>
    </div>
  );
}
