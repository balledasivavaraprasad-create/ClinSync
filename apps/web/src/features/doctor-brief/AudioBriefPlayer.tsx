import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface AudioBriefPlayerProps {
  audioUrl?: string;
  transcriptText: string;
  durationSeconds?: number;
  isAvailable?: boolean;
  patientName?: string;
}

export const AudioBriefPlayer: React.FC<AudioBriefPlayerProps> = ({
  audioUrl = '/synthetic_audio_brief_demo.mp3',
  transcriptText,
  durationSeconds = 62,
  isAvailable = true,
  patientName = 'Eleanor Johnson',
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showFullTranscript, setShowFullTranscript] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop / cancel speech helper
  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe fallback in headless/test environments
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  // Playback & Speech Synthesis
  useEffect(() => {
    if (isPlaying) {
      // 1. Trigger Web Speech Synthesis if available
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof window.SpeechSynthesisUtterance !== 'undefined'
      ) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          } else {
            window.speechSynthesis.cancel();
            const utterance = new window.SpeechSynthesisUtterance(transcriptText);
            utterance.rate = playbackRate;
            utterance.volume = isMuted ? 0 : 1;

            const voices = window.speechSynthesis.getVoices();
            const voice =
              voices.find(
                (v) =>
                  v.lang.startsWith('en') &&
                  (v.name.includes('Natural') ||
                    v.name.includes('Neural') ||
                    v.name.includes('Google') ||
                    v.name.includes('Online'))
              ) ||
              voices.find((v) => v.lang.startsWith('en')) ||
              voices[0];
            if (voice) {
              utterance.voice = voice;
            }

            utterance.onend = () => {
              setIsPlaying(false);
              setCurrentTime(0);
            };

            utterance.onerror = (e) => {
              if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.warn('Speech synthesis playback notice:', e);
              }
            };

            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
          }
        } catch (err) {
          console.warn('Could not initiate window.speechSynthesis:', err);
        }
      }

      // 2. Scrubber progression loop
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= durationSeconds) {
            setIsPlaying(false);
            stopSpeech();
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackRate);
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
          }
        } catch {
          // ignore error
        }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackRate, durationSeconds, transcriptText, isMuted]);

  // Adjust utterance rate while playing
  useEffect(() => {
    if (utteranceRef.current) {
      utteranceRef.current.rate = playbackRate;
    }
  }, [playbackRate]);

  // Adjust volume while playing
  useEffect(() => {
    if (utteranceRef.current) {
      utteranceRef.current.volume = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  const togglePlay = () => {
    if (!isAvailable) {
      setAudioError('Synthesized audio is unavailable for this encounter. Full text brief provided below.');
      return;
    }
    setAudioError(null);
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    stopSpeech();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const cycleSpeed = () => {
    if (playbackRate === 1.0) setPlaybackRate(1.25);
    else if (playbackRate === 1.25) setPlaybackRate(1.5);
    else setPlaybackRate(1.0);
  };

  const progressPercent = Math.min(100, Math.round((currentTime / durationSeconds) * 100));

  // Visual waveform bars
  const waveformHeights = [24, 40, 56, 32, 64, 48, 80, 60, 44, 72, 88, 52, 68, 92, 48, 36, 60, 76, 40, 28];

  return (
    <div
      data-testid="audio-brief-player"
      className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#080d19]/90 backdrop-blur-2xl text-white shadow-xl space-y-4"
    >
      {/* Player Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-400/30 flex items-center justify-center shadow-inner">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                AI Synthesized Audio Brief
              </span>
              <Badge variant="neutral" size="sm" className="bg-white/[0.05] text-slate-300 border-white/10 text-[10px]">
                60s Consultation Summary
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Oral synthesis for {patientName} • Text fallback always accessible
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={cycleSpeed}
            data-testid="audio-speed-btn"
            className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 border border-white/10 text-xs font-mono font-bold transition-colors cursor-pointer"
            title="Adjust playback speed"
          >
            {playbackRate}x
          </button>
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            data-testid="audio-mute-btn"
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Waveform Visualization & Scrubber */}
      <div className="space-y-2">
        <div className="h-10 flex items-center justify-between gap-1 px-1">
          {waveformHeights.map((h, idx) => {
            const barPercent = (idx / waveformHeights.length) * 100;
            const isPassed = progressPercent >= barPercent;
            return (
              <div
                key={idx}
                className="flex-1 rounded-full transition-all duration-150"
                style={{
                  height: `${h}%`,
                  backgroundColor: isPassed
                    ? '#14b8a6'
                    : isPlaying
                    ? '#475569'
                    : '#334155',
                }}
              />
            );
          })}
        </div>

        {/* Progress Bar with Keyboard Scrubbing Accessibility */}
        <div
          role="progressbar"
          tabIndex={0}
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={durationSeconds}
          aria-label="Audio summary progress"
          data-testid="audio-progressbar"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              setCurrentTime((prev) => Math.min(durationSeconds, prev + 5));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              setCurrentTime((prev) => Math.max(0, prev - 5));
            } else if (e.key === 'Home') {
              e.preventDefault();
              setCurrentTime(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              setCurrentTime(durationSeconds);
            }
          }}
          className="w-full bg-slate-700/80 rounded-full h-2 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 focus:ring-offset-slate-900"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            setCurrentTime(Math.round(clickPos * durationSeconds));
          }}
        >
          <div
            className="bg-teal-400 h-2 rounded-full transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatTime(durationSeconds)}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={togglePlay}
            data-testid="audio-play-pause-btn"
            aria-label={isPlaying ? 'Pause audio brief' : 'Play audio brief'}
            className="w-11 h-11 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-cyan-400/25 transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            data-testid="audio-restart-btn"
            className="text-xs text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Restart
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setShowFullTranscript(!showFullTranscript)}
          data-testid="toggle-transcript-btn"
          className="text-xs text-cyan-300 hover:text-white flex items-center font-medium underline cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 mr-1" />
          {showFullTranscript ? 'Hide Transcript' : 'View Text Transcript'}
        </button>
      </div>

      {/* Error state */}
      {audioError && (
        <div
          role="alert"
          data-testid="audio-error-notice"
          className="p-3 bg-amber-950/70 border border-amber-500/50 rounded-xl text-xs text-amber-200 flex items-start space-x-2"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{audioError}</span>
        </div>
      )}

      {/* Graceful Fallback: Guaranteed Text Transcript */}
      {showFullTranscript && (
        <div
          data-testid="audio-transcript-fallback"
          className="p-3.5 rounded-xl bg-[#050811]/90 border border-white/[0.08] text-xs text-slate-200 space-y-1.5 shadow-inner"
        >
          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <span>Oral Brief Transcript:</span>
            <span className="text-[10px] text-cyan-400 font-mono">Voice: Web Speech TTS • Source: {audioUrl}</span>
          </div>
          <p className="leading-relaxed font-serif text-slate-200 italic text-sm">
            "{transcriptText}"
          </p>
        </div>
      )}
    </div>
  );
};
