import React, { useRef, useEffect, Dispatch, SetStateAction } from 'react';
import { AppState } from '../types';
import { useSpring } from 'motion/react';

interface Props {
  state: AppState;
}

export function EyeCanvas({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Smooth spring transition for L (Sensor Distance)
  const animatedL = useSpring(state.L, { stiffness: 100, damping: 20 });

  useEffect(() => {
    animatedL.set(state.L);
  }, [state.L, animatedL]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Resize handling for high DPI displays
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Only resize if dimensions actually changed to prevent resetting canvas unnecessarily
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      
      const w = rect.width;
      const h = rect.height;

      // Clear background
      ctx.clearRect(0, 0, w, h);
      
      // Coordinates
      const centerY = h / 2;
      const lensX = w / 2;
      const { u, pCorr, mode, aperture, age, chromaticAberration } = state;
      const L = animatedL.get();
      
      // Physics Math
      const pTarget = (1 / L) + (1 / Math.max(u, 1));
      const pCorrSys = mode === 'EYE' ? pCorr * 0.001 : 0;
      
      let pEyeActual = 0.01;
      let maxLensP = 0.03;
      if (mode === 'EYE') {
        // Presbyopia age simulation
        if (age > 40) {
           maxLensP = Math.max(0.01, 0.03 - ((age - 40) * 0.0005));
        }
        pEyeActual = Math.max(0.01, Math.min(maxLensP, pTarget - pCorrSys));
      }
      
      const pTotal = pEyeActual + pCorrSys;
      
      // Focus distance calculation
      let vActual = Infinity;
      if (pTotal > 1 / u) {
        vActual = 1 / (pTotal - 1/u);
      } else {
        vActual = -1 / ( (1/u) - pTotal + 0.0001); // Virtual image
      }

      // Aperture calculation
      // base radius 40px at f/2.8.
      const lensRadius = aperture ? (40 * 2.8) / aperture : 40;
      const raySlopeSpan = lensRadius / (vActual); // Approximation
      const blurRadiusAtSensor = Math.abs(L - vActual) * Math.abs(raySlopeSpan);

      // Draw background grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let i=0; i<w; i+=50) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
      for(let j=0; j<h; j+=50) { ctx.moveTo(0, j); ctx.lineTo(w, j); }
      ctx.stroke();

      // Draw Axis
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Aperture Blades
      ctx.fillStyle = '#0f172a';
      const gap = lensRadius;
      ctx.fillRect(lensX - 10, 0, 20, centerY - gap);
      ctx.fillRect(lensX - 10, centerY + gap, 20, h - (centerY + gap));

      // Draw Sensor / Retina Plane
      const sensorX = lensX + L;
      ctx.fillStyle = mode === 'EYE' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(51, 65, 85, 0.4)';
      if (mode === 'EYE') {
        // Draw simple eyeball curve
        ctx.beginPath();
        ctx.arc(lensX + L/2, centerY, L/2 + 20, -Math.PI/2.5, Math.PI/2.5);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#94a3b8';
        ctx.stroke();
        ctx.fill();
      } else {
        // Draw Camera Sensor
        ctx.fillStyle = '#334155';
        ctx.fillRect(sensorX - 5, centerY - 80, 10, 160);
      }
      
      // Draw Lens
      ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Lens curvature based on pEyeActual
      const lensFlex = (pEyeActual - 0.01) / 0.02; // 0 to 1
      const lensBulge = 10 + lensFlex * 15;
      
      ctx.moveTo(lensX, centerY - 60);
      ctx.quadraticCurveTo(lensX + lensBulge, centerY, lensX, centerY + 60);
      ctx.quadraticCurveTo(lensX - lensBulge, centerY, lensX, centerY - 60);
      ctx.fill();
      ctx.stroke();

      // Draw Corrective Lens if EYE mode and active
      if (mode === 'EYE' && pCorr !== 0) {
        const corrX = lensX - 30;
        ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        if (pCorr > 0) {
          // Convex
          ctx.moveTo(corrX, centerY - 50);
          ctx.quadraticCurveTo(corrX + 10, centerY, corrX, centerY + 50);
          ctx.quadraticCurveTo(corrX - 10, centerY, corrX, centerY - 50);
        } else {
          // Concave
          ctx.moveTo(corrX - 5, centerY - 50);
          ctx.lineTo(corrX + 5, centerY - 50);
          ctx.quadraticCurveTo(corrX, centerY, corrX + 5, centerY + 50);
          ctx.lineTo(corrX - 5, centerY + 50);
          ctx.quadraticCurveTo(corrX - 10, centerY, corrX - 5, centerY - 50);
        }
        ctx.fill();
        ctx.stroke();
      }

      // Object
      const objX = lensX - u;
      const objYTop = centerY - 50;
      
      // Draw Object Arrow
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(objX, centerY);
      ctx.lineTo(objX, objYTop);
      
      // Arrow Head
      ctx.moveTo(objX - 10, objYTop + 10);
      ctx.lineTo(objX, objYTop);
      ctx.lineTo(objX + 10, objYTop + 10);
      ctx.stroke();

      // Text Label for Object
      ctx.fillStyle = '#38bdf8';
      ctx.font = '14px monospace';
      ctx.fillText('TARGET', objX - 25, objYTop - 15);

      // Labels
      ctx.fillStyle = '#60a5fa';
      ctx.font = '10px monospace';
      ctx.fillText('CRYSTALLINE LENS', lensX - 45, centerY + 80);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(mode === 'EYE' ? 'RETINA PLANE' : 'SENSOR PLANE', sensorX - 35, centerY + 100);

      // Ray Tracing Base
      const drawRaySingleColor = (lensStrikeY: number, color: string, vDist: number) => {
        const iTipX = lensX + vDist;
        const iTipY = centerY + 50 * (vDist / u); 

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(objX, objYTop); // from Tip
        
        ctx.lineTo(lensX, lensStrikeY); 
        
        const slope = (iTipY - lensStrikeY) / (parseFloat(iTipX.toString()) - lensX || 0.001);
        
        const endX = sensorX + 50;
        const endY = lensStrikeY + slope * (endX - lensX);
        
        ctx.lineTo(endX, endY);
        ctx.stroke();
      };

      const isCorrected = mode === 'EYE' && pCorr !== 0;
      const baseColor = isCorrected ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';

      ctx.lineWidth = 1.5;
      
      const offsets = [0, 50, -50]; // rays through center, top, bottom focus
      
      offsets.forEach((offsetY) => {
        const strikeY = centerY + offsetY;
        if (Math.abs(offsetY) > gap + 1) return; // blocked by aperture
        
        if (chromaticAberration) {
           // Simulate dispersion by shifting vActual slightly per color channel
           drawRaySingleColor(strikeY, 'rgba(239, 68, 68, 0.6)', vActual * 1.02); // Red (longer focus)
           drawRaySingleColor(strikeY, 'rgba(34, 197, 94, 0.6)', vActual);        // Green (target)
           drawRaySingleColor(strikeY, 'rgba(59, 130, 246, 0.6)', vActual * 0.98); // Blue (shorter focus)
        } else {
           drawRaySingleColor(strikeY, baseColor, vActual);
        }
      });
      
      // Draw Focal Point Dot (Green peak target)
      const imgTipX = lensX + vActual;
      const imgTipY = centerY + 50 * (vActual / u); 
      
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(imgTipX, imgTipY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillText("FOCAL POINT", imgTipX + 15, imgTipY + 5);
    };

    // Listen to spring changes
    const unsubscribe = animatedL.on('change', draw);
    
    // Also draw on window resize
    window.addEventListener('resize', draw);
    
    // Initial draw
    draw();

    return () => {
      unsubscribe();
      window.removeEventListener('resize', draw);
    };
  }, [state, animatedL]);

  return (
    <div className="flex-1 h-full w-full relative bg-black/40 rounded-2xl border border-slate-800 shadow-inner overflow-hidden">
      <div className="absolute top-4 left-4 p-3 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700 text-[10px] font-mono leading-relaxed pointer-events-none z-10 shadow-lg">
        <div className="text-blue-400 mb-1 font-bold">GAUSSIAN OPTICS DATA</div>
        <div className="text-slate-300">u (Object): {state.u}</div>
        <div className="text-slate-300">v (Image): {state.L}</div>
        <div className="text-slate-300">Correction: {state.pCorr}D</div>
      </div>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
