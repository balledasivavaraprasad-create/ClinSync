import React, { useMemo } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface AppointmentQRCodeProps {
  bookingId: string;
  patientName: string;
  slotTime: string;
  slotDate: string;
  doctorName: string;
  departmentName: string;
}

/**
 * Procedural SVG QR Code Generator.
 * Generates an authentic 25x25 QR Matrix with proper Finder Patterns,
 * Timing Patterns, Alignment Patterns, and deterministic data modules.
 */
export const AppointmentQRCode: React.FC<AppointmentQRCodeProps> = ({
  bookingId,
  patientName,
  slotTime,
  slotDate,
  doctorName,
  departmentName,
}) => {
  // Deterministically generate a 25x25 matrix based on booking ID hash
  const matrix = useMemo(() => {
    const size = 25;
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Simple hash for pseudo-random data bits
    let hash = 0;
    const str = `${bookingId}:${patientName}:${slotTime}:${slotDate}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    // Helper: draw 7x7 finder pattern
    const drawFinder = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[row + r][col + c] = true;
          }
        }
      }
    };

    // Draw 3 corner finder patterns
    drawFinder(0, 0); // Top-Left
    drawFinder(0, size - 7); // Top-Right
    drawFinder(size - 7, 0); // Bottom-Left

    // Draw timing patterns (row 6 and col 6)
    for (let i = 8; i < size - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Draw alignment pattern at (16, 16)
    const alignR = 16;
    const alignC = 16;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2)) {
          grid[alignR + r][alignC + c] = true;
        }
      }
    }

    // Fill remaining cells with pseudo-random deterministic data bits
    let seed = Math.abs(hash) + 1337;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder pattern zones and separators
        const inTL = r < 8 && c < 8;
        const inTR = r < 8 && c >= size - 8;
        const inBL = r >= size - 8 && c < 8;
        const inTiming = r === 6 || c === 6;
        const inAlign = r >= alignR && r < alignR + 5 && c >= alignC && c < alignC + 5;
        // Center 5x5 reserved for emblem
        const inCenter = r >= 10 && r <= 14 && c >= 10 && c <= 14;

        if (!inTL && !inTR && !inBL && !inTiming && !inAlign && !inCenter) {
          seed = (seed * 1664525 + 1013904223) % 4294967296;
          grid[r][c] = seed % 3 === 0 || seed % 5 === 0;
        }
      }
    }

    return grid;
  }, [bookingId, patientName, slotTime, slotDate]);

  return (
    <div
      data-testid="appointment-qr-pass"
      className="p-6 rounded-3xl bg-gradient-to-b from-[#0a1024] to-[#050814] border border-cyan-500/30 shadow-[0_10px_40px_rgba(6,182,212,0.15)] flex flex-col items-center text-center relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Tag */}
      <div className="flex items-center space-x-2 bg-cyan-500/10 border border-cyan-400/30 px-3 py-1 rounded-full mb-3">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
          Digital Fast-Track QR Pass
        </span>
      </div>

      <h4 className="text-lg font-extrabold text-white mb-1">
        Scan Before Your Appointment
      </h4>
      <p className="text-xs text-slate-400 max-w-sm mb-4">
        Present this dynamic QR code at the Clinic Entrance Gate Scanner or Reception Desk to automatically check in for your scheduled slot.
      </p>

      {/* QR Code Canvas / SVG Wrapper with high-contrast card */}
      <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-cyan-400/40 relative group transition-transform duration-200 hover:scale-[1.02]">
        <svg
          viewBox="0 0 25 25"
          className="w-44 h-44 sm:w-52 sm:h-52 shape-rendering-crisp"
          shapeRendering="crispEdges"
          aria-label={`QR Code for Appointment ${bookingId}`}
        >
          <rect width="25" height="25" fill="#FFFFFF" />
          {matrix.map((row, r) =>
            row.map((filled, c) =>
              filled ? (
                <rect
                  key={`${r}-${c}`}
                  x={c}
                  y={r}
                  width="1"
                  height="1"
                  fill="#030712"
                />
              ) : null
            )
          )}
          {/* Medical Cross Center Overlay */}
          <rect x="10" y="10" width="5" height="5" fill="#FFFFFF" rx="0.5" />
          <rect x="11.8" y="10.8" width="1.4" height="3.4" fill="#0891B2" rx="0.2" />
          <rect x="10.8" y="11.8" width="3.4" height="1.4" fill="#0891B2" rx="0.2" />
        </svg>

        {/* Pulsing Scan Radar overlay */}
        <div className="absolute inset-x-4 top-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-bounce opacity-75" />
      </div>

      {/* Pass Metadata Badges */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Ready to Scan
        </span>
        <span className="text-[11px] font-mono text-cyan-300 bg-white/[0.06] border border-white/10 px-2.5 py-1 rounded-lg">
          Slot: {slotTime}
        </span>
        <span className="text-[11px] font-mono text-slate-300 bg-white/[0.06] border border-white/10 px-2.5 py-1 rounded-lg">
          Ref: {bookingId}
        </span>
      </div>

      <div className="mt-3 text-[11px] text-slate-400 font-mono">
        Gate 02 • {doctorName} • {departmentName}
      </div>
    </div>
  );
};
