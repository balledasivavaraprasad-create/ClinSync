import React, { useEffect, useRef, useState } from 'react';
import { Activity, Radio, Cpu, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../../lib/theme';

interface BiometricPulseViewerProps {
  className?: string;
  patientName?: string;
  statusText?: string;
}

type VisualizerMode = 'voice' | 'vitals' | 'neural';

export const BiometricPulseViewer: React.FC<BiometricPulseViewerProps> = ({
  className = '',
  patientName = 'Eleanor Vance',
  statusText = 'Active Speech Cadence Stream',
}) => {
  const { isLight } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<VisualizerMode>('voice');
  const [heartRate, setHeartRate] = useState<number>(72);
  const [spo2, setSpo2] = useState<number>(98.5);
  const [hrv, setHrv] = useState<number>(64);
  const [voiceStability, setVoiceStability] = useState<number>(99.2);
  const [mousePos, setMousePos] = useState<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  // Minor realistic biometric telemetry jitter
  useEffect(() => {
    const timer = setInterval(() => {
      setHeartRate(prev => Math.min(82, Math.max(70, prev + (Math.random() * 1.8 - 0.9))));
      setSpo2(prev => Math.min(99.4, Math.max(98.1, prev + (Math.random() * 0.2 - 0.1))));
      setHrv(prev => Math.min(72, Math.max(60, prev + (Math.random() * 1.5 - 0.7))));
      setVoiceStability(prev => Math.min(99.8, Math.max(98.4, prev + (Math.random() * 0.3 - 0.15))));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Multi-harmonic real-time canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    // Handle high-DPI retina display
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle nodes for neural mesh mode (restrained electric cyan & sapphire)
    const particles = Array.from({ length: 42 }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 240,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      radius: Math.random() * 2 + 1.2,
      glow: Math.random() * 0.4 + 0.6,
    }));

    const render = () => {
      const width = canvas.clientWidth || 320;
      const height = canvas.clientHeight || 220;

      // Deep obsidian persistence trail or frosted porcelain trail
      ctx.fillStyle = isLight ? 'rgba(244, 247, 252, 0.42)' : 'rgba(7, 10, 19, 0.42)';
      ctx.fillRect(0, 0, width, height);

      phase += 0.038;

      const mouse = mouseRef.current;
      const mouseInfluence = mouse.active ? 1.5 : 1.0;

      if (mode === 'voice') {
        // Curated electric cyan and frost harmonics
        const layers = [
          {
            color: isLight ? 'rgba(2, 132, 199, 0.95)' : 'rgba(56, 189, 248, 0.95)',
            glow: isLight ? 'rgba(2, 132, 199, 0.4)' : 'rgba(56, 189, 248, 0.6)',
            freq: 0.022,
            amp: 28 * mouseInfluence,
            speed: 1.0,
            lineWidth: 2.2,
          },
          {
            color: isLight ? 'rgba(14, 165, 233, 0.75)' : 'rgba(125, 211, 252, 0.70)',
            glow: isLight ? 'rgba(14, 165, 233, 0.3)' : 'rgba(125, 211, 252, 0.35)',
            freq: 0.034,
            amp: 20 * mouseInfluence,
            speed: 1.35,
            lineWidth: 1.6,
          },
          {
            color: isLight ? 'rgba(8, 145, 178, 0.65)' : 'rgba(14, 165, 233, 0.55)',
            glow: isLight ? 'rgba(8, 145, 178, 0.25)' : 'rgba(14, 165, 233, 0.25)',
            freq: 0.015,
            amp: 32 * mouseInfluence,
            speed: 0.75,
            lineWidth: 1.8,
          },
          {
            color: isLight ? 'rgba(234, 88, 12, 0.75)' : 'rgba(251, 146, 60, 0.65)',
            glow: isLight ? 'rgba(234, 88, 12, 0.3)' : 'rgba(251, 146, 60, 0.3)',
            freq: 0.046,
            amp: 12 * mouseInfluence,
            speed: 1.7,
            lineWidth: 1.3,
          },
        ];

        const centerY = height / 2;

        layers.forEach((layer) => {
          ctx.save();
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = layer.lineWidth;
          ctx.shadowColor = layer.glow;
          ctx.shadowBlur = 16;
          ctx.beginPath();

          for (let x = 0; x <= width; x += 3) {
            const envelope = Math.sin((x / width) * Math.PI);
            const distToMouse = Math.hypot(x - mouse.x, centerY - mouse.y);
            const mouseBoost = mouse.active && distToMouse < 90 ? (1 - distToMouse / 90) * 22 : 0;

            const y =
              centerY +
              Math.sin(x * layer.freq + phase * layer.speed) *
                Math.cos(x * 0.01 - phase * 0.4) *
                layer.amp *
                envelope +
              mouseBoost * Math.sin(phase * 4);

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.stroke();
          ctx.restore();
        });

        // Luminous breathing pulse core
        const pulseSize = Math.sin(phase * 2.8) * 8 + 22;
        const radialGrad = ctx.createRadialGradient(width / 2, centerY, 0, width / 2, centerY, pulseSize * 2.2);
        radialGrad.addColorStop(0, isLight ? 'rgba(2, 132, 199, 0.22)' : 'rgba(56, 189, 248, 0.32)');
        radialGrad.addColorStop(0.6, isLight ? 'rgba(14, 165, 233, 0.06)' : 'rgba(14, 165, 233, 0.08)');
        radialGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = radialGrad;
        ctx.beginPath();
        ctx.arc(width / 2, centerY, pulseSize * 2.2, 0, Math.PI * 2);
        ctx.fill();

      } else if (mode === 'vitals') {
        // High-precision Electric Cyan ECG Line
        const centerY = height / 2;
        ctx.save();
        ctx.strokeStyle = isLight ? '#0284c7' : '#38bdf8';
        ctx.shadowColor = isLight ? 'rgba(2, 132, 199, 0.6)' : 'rgba(56, 189, 248, 0.85)';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2.4;
        ctx.beginPath();

        for (let x = 0; x <= width; x += 2) {
          const cycle = ((x + phase * 85) % 200) / 200;
          let yOffset = 0;

          if (cycle > 0.38 && cycle < 0.42) {
            yOffset = -Math.sin(((cycle - 0.38) / 0.04) * Math.PI) * 9;
          } else if (cycle >= 0.42 && cycle < 0.44) {
            yOffset = 5;
          } else if (cycle >= 0.44 && cycle < 0.49) {
            const rNorm = (cycle - 0.44) / 0.05;
            yOffset = -Math.sin(rNorm * Math.PI) * 56;
          } else if (cycle >= 0.49 && cycle < 0.52) {
            yOffset = 12;
          } else if (cycle >= 0.56 && cycle < 0.65) {
            yOffset = -Math.sin(((cycle - 0.56) / 0.09) * Math.PI) * 15;
          }

          const y = centerY + yOffset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
        ctx.restore();

        // Secondary subtle echo wave
        ctx.save();
        ctx.strokeStyle = isLight ? 'rgba(2, 132, 199, 0.25)' : 'rgba(56, 189, 248, 0.28)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 3) {
          const cycle = ((x + phase * 85 - 40) % 200) / 200;
          let yOffset = 0;
          if (cycle >= 0.44 && cycle < 0.49) {
            yOffset = -Math.sin(((cycle - 0.44) / 0.05) * Math.PI) * 32;
          }
          const y = centerY + 16 + yOffset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

      } else {
        // Neural Constellation Nodes in Electric Cyan
        particles.forEach((p, i) => {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 10 || p.x > width - 10) p.vx *= -1;
          if (p.y < 10 || p.y > height - 10) p.vy *= -1;

          ctx.save();
          ctx.fillStyle = isLight ? `rgba(2, 132, 199, ${p.glow})` : `rgba(56, 189, 248, ${p.glow})`;
          ctx.shadowColor = isLight ? '#0284c7' : '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 70) {
              ctx.save();
              ctx.strokeStyle = isLight
                ? `rgba(2, 132, 199, ${0.4 * (1 - dist / 70)})`
                : `rgba(56, 189, 248, ${0.35 * (1 - dist / 70)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
              ctx.restore();
            }
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [mode, isLight]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseRef.current = { x, y, active: true };
    setMousePos({ x, y, active: true });
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
    setMousePos(prev => ({ ...prev, active: false }));
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full rounded-[30px] border p-5 sm:p-6 overflow-hidden transition-all duration-300 ${
        isLight
          ? 'border-[#d4e0ed] shadow-[0_12px_36px_-10px_rgba(18,38,72,0.07),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-2px_6px_rgba(212,225,240,0.4)] hover:border-cyan-500/40'
          : 'border-white/[0.1] shadow-[0_30px_70px_-20px_rgba(2,6,18,0.85),inset_0_1px_1px_rgba(148,197,255,0.14),inset_0_-2px_8px_rgba(0,0,0,0.45)] hover:border-cyan-500/30'
      } ${className}`}
      style={{
        background: isLight
          ? (mousePos.active
              ? `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, rgba(6, 182, 212, 0.08), rgba(244, 248, 253, 0.96) 70%)`
              : 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 248, 253, 0.94) 50%, rgba(235, 242, 251, 0.92) 100%)')
          : (mousePos.active
              ? `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, rgba(56, 189, 248, 0.08), rgba(10, 16, 32, 0.9) 70%)`
              : 'linear-gradient(180deg, rgba(16, 24, 46, 0.88) 0%, rgba(10, 16, 32, 0.84) 50%, rgba(7, 11, 22, 0.88) 100%)'),
      }}
    >
      {/* Background ambient glow matching landing */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Top Header: Title, Telemetry Pulse & Mode Switcher */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLight ? 'bg-cyan-600 opacity-75' : 'bg-cyan-400 opacity-75'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLight ? 'bg-cyan-600' : 'bg-cyan-400'}`} />
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
              Live Biometric Spectrum
            </span>
          </div>
          <h3 className={`text-sm font-bold tracking-tight mt-0.5 flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <span>{patientName}</span>
            <span className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>• {statusText}</span>
          </h3>
        </div>

        {/* Visualizer Mode Switcher */}
        <div className={`flex items-center backdrop-blur-md p-1 rounded-xl border transition-all ${
          isLight ? 'bg-slate-100/90 border-slate-200/90 shadow-inner' : 'bg-black/50 border-white/[0.08]'
        }`}>
          <button
            type="button"
            onClick={() => setMode('voice')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer relative ${
              mode === 'voice'
                ? isLight
                  ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/25'
                  : 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice Wave</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('vitals')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer relative ${
              mode === 'vitals'
                ? isLight
                  ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/25'
                  : 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Vital Pulse</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('neural')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer relative ${
              mode === 'neural'
                ? isLight
                  ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/25'
                  : 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Claim Mesh</span>
          </button>
        </div>
      </div>

      {/* Interactive Glowing Waveform Canvas with specular rim */}
      <div className={`relative w-full h-[180px] sm:h-[210px] rounded-2xl overflow-hidden group shadow-inner ${
        isLight ? 'bg-gradient-to-b from-sky-50/70 via-slate-50/50 to-white border border-sky-200/80' : 'bg-[#060912]/90 border border-white/[0.06]'
      }`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Subtle HUD Watermark */}
        <div className={`absolute bottom-2.5 left-3.5 flex items-center space-x-3 pointer-events-none text-[10px] font-mono ${
          isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'
        }`}>
          <span className="flex items-center space-x-1">
            <Radio className={`w-2.5 h-2.5 animate-pulse ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>SNR: +28.4 dB</span>
          </span>
          <span>•</span>
          <span>48 kHz Float32</span>
          <span>•</span>
          <span className={mousePos.active ? (isLight ? 'text-cyan-700 font-bold' : 'text-cyan-300 font-bold') : (isLight ? 'text-slate-600' : 'text-slate-400')}>
            {mousePos.active ? 'MODULATING INTERACTION' : 'SYNCHRONIZED'}
          </span>
        </div>

        <div className={`absolute top-2.5 right-3.5 pointer-events-none text-[10px] font-mono ${
          isLight ? 'text-slate-600 font-semibold' : 'text-slate-500'
        }`}>
          LATENCY: 14ms
        </div>
      </div>

      {/* Bottom Telemetry Strip in Restrained Electric Cyan */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <motion.div
          whileHover={{ y: -2 }}
          className={`p-3 rounded-xl border transition-all backdrop-blur-sm ${
            isLight
              ? 'bg-gradient-to-br from-white via-slate-50/60 to-white border-slate-200/90 shadow-sm hover:border-cyan-400 hover:shadow-md'
              : 'bg-white/[0.025] hover:bg-white/[0.04] border-white/[0.06] hover:border-cyan-500/30'
          }`}
        >
          <div className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>Resting Heart Rate</div>
          <div className={`text-base sm:text-lg font-bold flex items-baseline space-x-1 mt-0.5 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <span className={isLight ? 'text-cyan-700 font-extrabold' : 'text-cyan-400'}>{heartRate.toFixed(0)}</span>
            <span className={`text-[11px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>BPM</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className={`p-3 rounded-xl border transition-all backdrop-blur-sm ${
            isLight
              ? 'bg-gradient-to-br from-white via-slate-50/60 to-white border-slate-200/90 shadow-sm hover:border-cyan-400 hover:shadow-md'
              : 'bg-white/[0.025] hover:bg-white/[0.04] border-white/[0.06] hover:border-cyan-500/30'
          }`}
        >
          <div className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>Blood Oxygen (SpO2)</div>
          <div className={`text-base sm:text-lg font-bold flex items-baseline space-x-1 mt-0.5 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <span className={isLight ? 'text-cyan-700 font-extrabold' : 'text-cyan-400'}>{spo2.toFixed(1)}%</span>
            <span className={`text-[11px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>PulseOx</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className={`p-3 rounded-xl border transition-all backdrop-blur-sm ${
            isLight
              ? 'bg-gradient-to-br from-white via-slate-50/60 to-white border-slate-200/90 shadow-sm hover:border-cyan-400 hover:shadow-md'
              : 'bg-white/[0.025] hover:bg-white/[0.04] border-white/[0.06] hover:border-cyan-500/30'
          }`}
        >
          <div className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>Heart Rate Var.</div>
          <div className={`text-base sm:text-lg font-bold flex items-baseline space-x-1 mt-0.5 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <span className={isLight ? 'text-cyan-700 font-extrabold' : 'text-cyan-400'}>{hrv.toFixed(0)}</span>
            <span className={`text-[11px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>ms rMSSD</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className={`p-3 rounded-xl border transition-all backdrop-blur-sm ${
            isLight
              ? 'bg-gradient-to-br from-white via-slate-50/60 to-white border-slate-200/90 shadow-sm hover:border-cyan-400 hover:shadow-md'
              : 'bg-white/[0.025] hover:bg-white/[0.04] border-white/[0.06] hover:border-cyan-500/30'
          }`}
        >
          <div className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>Vocal Stability</div>
          <div className={`text-base sm:text-lg font-bold flex items-baseline space-x-1 mt-0.5 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <span className={isLight ? 'text-cyan-700 font-extrabold' : 'text-cyan-400'}>{voiceStability.toFixed(1)}%</span>
            <span className={`text-[11px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Cadence</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
