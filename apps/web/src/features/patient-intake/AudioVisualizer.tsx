import React from 'react';
import { Volume2, AlertCircle, Pause } from 'lucide-react';

export type VisualizerState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'paused'
  | 'error';

interface AudioVisualizerProps {
  state: VisualizerState;
  volume?: number; // 0 to 1
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  state,
  volume = 0.5,
  className = '',
}) => {
  // Wave bar count
  const bars = [0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.6, 0.3];

  return (
    <div
      data-testid="audio-visualizer"
      className={`flex items-center justify-center space-x-1.5 h-16 ${className}`}
      aria-label={`Audio visualizer state: ${state}`}
    >
      {state === 'idle' && (
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-pulse" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-pulse delay-100" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-pulse delay-200" />
        </div>
      )}

      {state === 'listening' && (
        <div className="flex items-center space-x-1.5">
          {bars.map((scale, i) => {
            const height = Math.max(12, Math.round(scale * volume * 48));
            return (
              <span
                key={i}
                className="w-1.5 rounded-full bg-teal-500 transition-all duration-150 ease-out animate-pulse"
                style={{
                  height: `${height}px`,
                  animationDuration: `${0.6 + i * 0.1}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {state === 'speaking' && (
        <div className="flex items-center space-x-2 text-cyan-300 text-sm font-medium">
          <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
          <div className="flex items-center space-x-1">
            {[0.5, 0.9, 0.6, 1.0, 0.4].map((scale, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-cyan-400 animate-bounce"
                style={{
                  height: `${Math.max(10, Math.round(scale * 28))}px`,
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-cyan-200">Assistant speaking...</span>
        </div>
      )}

      {state === 'interrupted' && (
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Interrupted by patient</span>
        </div>
      )}

      {state === 'paused' && (
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-300 text-xs font-mono">
          <Pause className="w-3.5 h-3.5 text-slate-400" />
          <span>Intake paused</span>
        </div>
      )}

      {state === 'transcribing' && (
        <div className="flex items-center space-x-2 text-teal-700 text-sm font-medium animate-pulse">
          <span className="w-3 h-3 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
          <span>Transcribing voice response...</span>
        </div>
      )}

      {state === 'thinking' && (
        <div className="flex items-center space-x-2 text-indigo-700 text-sm font-medium animate-pulse">
          <span className="w-3 h-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span>Processing clinical facts...</span>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Audio service offline • Text fallback active</span>
        </div>
      )}
    </div>
  );
};
