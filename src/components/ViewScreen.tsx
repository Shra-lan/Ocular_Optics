import React, { useEffect, useRef, useState } from 'react';
import { AppState } from '../types';
import { motion, useSpring } from 'motion/react';

interface Props {
  state: AppState;
}

export function ViewScreen({ state }: Props) {
  const { u, L, pCorr, mode, aperture, age } = state;

  // Physics Math 
  const pTarget = (1 / L) + (1 / Math.max(u, 1));
  const pCorrSys = mode === 'EYE' ? pCorr * 0.001 : 0;
  
  let pEyeActual = 0.01;
  let maxLensP = 0.03;
  if (mode === 'EYE') {
    if (age && age > 40) {
       maxLensP = Math.max(0.01, 0.03 - ((age - 40) * 0.0005));
    }
    pEyeActual = Math.max(0.01, Math.min(maxLensP, pTarget - pCorrSys));
  }
  
  const pTotal = pEyeActual + pCorrSys;
  
  let vActual = Infinity;
  if (pTotal > 1 / u) {
    vActual = 1 / (pTotal - 1/u);
  } else {
    vActual = -1 / ( (1/u) - pTotal + 0.0001);
  }

  const lensRadius = aperture ? (40 * 2.8) / aperture : 40;
  const raySlopeSpan = lensRadius / (vActual); 
  const targetBlurRadius = Math.abs(L - vActual) * Math.abs(raySlopeSpan);

  // Constrain blur for visual appeal
  const safeBlur = Math.max(0, Math.min(40, targetBlurRadius / 2));
  
  const animatedBlur = useSpring(safeBlur, { stiffness: 100, damping: 20 });
  const [displayBlur, setDisplayBlur] = useState(safeBlur);

  useEffect(() => {
    animatedBlur.set(safeBlur);
  }, [safeBlur, animatedBlur]);

  useEffect(() => {
    return animatedBlur.on('change', (val) => {
       setDisplayBlur(val);
    });
  }, [animatedBlur]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    setCameraError(null);

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Failed to access camera", err);
        setCameraError(err.message || "Permission denied or camera not available");
      }
    };

    if (state.useLiveCamera) {
      startCamera();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(track => track.stop());
         videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [state.useLiveCamera]);

  // Canvas Optical Disk Blur Engine (Bokeh) for Eye Chart
  useEffect(() => {
    if (state.useLiveCamera && !cameraError) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Create Offscreen Snellen Chart
    const offscreen = document.createElement('canvas');
    offscreen.width = 600;
    offscreen.height = 400;
    const octx = offscreen.getContext('2d');
    
    if (octx) {
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, 600, 400);
      
      octx.fillStyle = '#0f172a';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.font = 'bold 80px serif';
      octx.fillText('E', 300, 80);
      octx.font = 'bold 50px serif';
      octx.fillText('F P', 300, 160);
      octx.font = 'bold 36px serif';
      octx.fillText('T O Z', 300, 220);
      octx.font = 'bold 24px serif';
      octx.fillText('L P E D', 300, 270);
      octx.font = 'bold 16px serif';
      octx.fillText('P E C F D', 300, 310);
      octx.font = 'bold 12px serif';
      octx.fillText('E D F C Z P', 300, 340);
      
      octx.fillStyle = '#ef4444';
      octx.beginPath();
      octx.arc(300, 370, 8, 0, Math.PI*2);
      octx.fill();
    }

    let animationFrameId: number;

    const renderCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        animationFrameId = requestAnimationFrame(renderCanvas);
        return;
      }
      
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      
      const w = rect.width;
      const h = rect.height;
      
      ctx.fillStyle = '#0B0E14';
      ctx.fillRect(0, 0, w, h);

      const blur = animatedBlur.get();
      const scale = Math.min(w / 600, h / 400) * 0.9;
      const dw = 600 * scale;
      const dh = 400 * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;

      // Draw Base Sharp Image or Blurred Image
      if (blur < 0.5 && !state.chromaticAberration) {
        ctx.globalAlpha = 1.0;
        ctx.drawImage(offscreen, dx, dy, dw, dh);
      } else {
        // True Optical Disk Blur (Bokeh) Simulation using Fibonacci Spiral
        const samples = blur < 0.5 ? 1 : Math.min(64, Math.max(16, Math.floor(blur * 2)));
        ctx.globalAlpha = 1 / samples;
        const golden_angle = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < samples; i++) {
          const r = blur * Math.sqrt(i / samples);
          const theta = i * golden_angle;
          const shiftX = Math.cos(theta) * r;
          const shiftY = Math.sin(theta) * r;
          
          ctx.drawImage(offscreen, dx + shiftX, dy + shiftY, dw, dh);
        }
        ctx.globalAlpha = 1.0;
        
        // Chromatic Aberration Post-Processing Overlay
        if (state.chromaticAberration) {
             ctx.globalCompositeOperation = 'screen';
             ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
             ctx.fillRect(dx - 2 - blur*0.1, dy, dw, dh);
             ctx.fillStyle = 'rgba(0, 0, 255, 0.15)';
             ctx.fillRect(dx + 2 + blur*0.1, dy, dw, dh);
             ctx.globalCompositeOperation = 'source-over';
        }
      }

      animationFrameId = requestAnimationFrame(renderCanvas);
    };

    renderCanvas();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state.useLiveCamera, cameraError, state.chromaticAberration, animatedBlur]);


  return (
    <div className="flex-1 w-full h-full bg-black/40 rounded-2xl border border-slate-800 shadow-inner flex flex-col relative overflow-hidden shrink-0">
      <div className="absolute top-4 left-4 p-3 z-10 pointer-events-none drop-shadow-md border border-slate-700 bg-slate-900/80 backdrop-blur rounded-lg shadow-lg">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold text-blue-400">Retinal Projection Preview</div>
        <div className="font-mono text-[10px] text-slate-300">Through the Lens Simulation</div>
      </div>

      <div className="flex-1 w-full h-full flex items-center justify-center p-8">
        <div 
          className="relative w-full max-w-lg aspect-video rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black"
        >
          {state.useLiveCamera && !cameraError ? (
            <motion.video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                 filter: `blur(${displayBlur}px) ${state.chromaticAberration ? 'drop-shadow(4px 0 0 rgba(255,0,0,0.5)) drop-shadow(-4px 0 0 rgba(0,0,255,0.5))' : ''}`, 
                 transform: 'scale(1.05)' 
              }}
            />
          ) : (
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
          )}

          {state.useLiveCamera && cameraError && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-6 z-20">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Camera Access Failed</h3>
              <p className="text-slate-400 text-sm">{cameraError}</p>
              <p className="text-slate-500 text-xs mt-4 max-w-xs">Using fallback simulation image. To use the live camera, please allow camera permissions in your browser.</p>
            </div>
          )}

          {/* Overlay to emphasize optics feel */}
          <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none"></div>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Focus Bracket UI */}
            <div className="w-1/3 aspect-square border border-white/30 rounded-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-red-500/80 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* HUD Info */}
      <div className="absolute bottom-6 inset-x-0 mx-auto max-w-sm text-center tracking-wide">
         <div className="inline-block bg-black/80 backdrop-blur text-white text-[10px] px-4 py-2 rounded-full border border-white/10 shadow-lg font-mono flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full overflow-hidden shadow-inner ${displayBlur < 1 ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-red-400 shadow-[0_0_8px_#f87171]'}`}></div>
            <span>BLUR RADIUS: {displayBlur.toFixed(1)}px</span>
            <div className="w-px h-3 bg-zinc-700"></div>
            {displayBlur < 1 ? (
              <span className="text-green-400 font-bold">IN FOCUS</span>
            ) : (
              <span className="text-red-400 font-bold opacity-80">OUT OF FOCUS</span>
            )}
         </div>
      </div>
    </div>
  );
}
