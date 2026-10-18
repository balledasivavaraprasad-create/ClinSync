import React from 'react';

interface AudioVisualizerProps {
  state: 'idle' | 'listening' | 'transcribing' | 'thinking';
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
    </div>
  );
};
