import React, { FC } from 'react';
import { CLASSIFICATION_METAS, MoveClassificationType } from '../../analyzer/types';

interface EvalNode {
  ply: number;
  evalCp: number;
  classification: MoveClassificationType;
  isKeyMoment: boolean;
}

interface ReviewEvalGraphProps {
  curve: number[];
  nodes?: EvalNode[];
  activePly?: number;
  onSelectPly?: (ply: number) => void;
}

function nodeColor(classification: MoveClassificationType): string {
  switch (classification) {
    case 'brilliant':
      return '#06b6d4'; // cyan-500
    case 'great':
      return '#3b82f6'; // blue-500
    case 'best':
      return '#10b981'; // emerald-500
    case 'inaccuracy':
      return '#f59e0b'; // amber-500
    case 'mistake':
      return '#f97316'; // orange-500
    case 'miss':
      return '#ef4444'; // red-500
    case 'blunder':
      return '#dc2626'; // red-600
    default:
      return '#94a3b8';
  }
}

export const ReviewEvalGraph: FC<ReviewEvalGraphProps> = ({
  curve,
  nodes = [],
  activePly = 0,
  onSelectPly,
}) => {
  const W = 360;
  const H = 90;
  const count = curve.length;

  // Max clamp at 800 cp (8 pawns)
  const maxAbs = Math.max(300, ...curve.map((v) => Math.min(800, Math.abs(v))));

  const pts = curve.map((v, i) => {
    const clamped = Math.max(-maxAbs, Math.min(maxAbs, v));
    const x = count <= 1 ? W / 2 : (i / (count - 1)) * W;
    const y = H / 2 - (clamped / maxAbs) * (H / 2 - 8);
    return { x, y, ply: i };
  });

  const polylineStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPolygon = `0,${H / 2} ${polylineStr} ${W},${H / 2}`;

  const currentCp = curve[activePly] ?? curve[curve.length - 1] ?? 0;
  const currentPawn = (currentCp / 100).toFixed(1);

  return (
    <div className="w-full bg-[#102419] border border-white/10 rounded-2xl p-3 flex flex-col gap-1.5 shadow-md">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
          Üstünlük Grafiği
        </span>
        <span
          className={`text-xs font-black px-2 py-0.5 rounded-md ${
            currentCp > 50
              ? 'bg-emerald-500/20 text-emerald-300'
              : currentCp < -50
                ? 'bg-red-500/20 text-red-300'
                : 'bg-white/10 text-white/70'
          }`}
        >
          {currentCp > 0 ? `+${currentPawn}` : currentPawn}
        </span>
      </div>

      <div className="relative w-full h-20">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible">
          {/* Baseline (0.0 balance) */}
          <line
            x1="0"
            y1={H / 2}
            x2={W}
            y2={H / 2}
            stroke="rgba(255,255,255,0.25)"
            strokeDasharray="4 3"
            strokeWidth="1"
          />

          {/* Evaluation Area */}
          <polygon points={areaPolygon} fill="rgba(0, 229, 204, 0.18)" />

          {/* Eval Curve Line */}
          <polyline
            points={polylineStr}
            fill="none"
            stroke="#00e5cc"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Key moment dots */}
          {nodes.map((node) => {
            if (!node.isKeyMoment || node.ply === 0) return null;
            const pt = pts[node.ply];
            if (!pt) return null;
            const col = nodeColor(node.classification);
            const isActive = activePly === node.ply;

            return (
              <g
                key={node.ply}
                className="cursor-pointer transition-transform hover:scale-125"
                onClick={() => onSelectPly?.(node.ply)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isActive ? 5.5 : 4}
                  fill={col}
                  stroke="#ffffff"
                  strokeWidth={isActive ? 2 : 1.2}
                />
              </g>
            );
          })}

          {/* Active pointer vertical indicator */}
          {pts[activePly] && (
            <line
              x1={pts[activePly].x}
              y1={0}
              x2={pts[activePly].x}
              y2={H}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="2 2"
              opacity="0.8"
            />
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-white/40 font-semibold px-1">
        <span>Başlangıç</span>
        <span>{Math.max(1, count - 1)} Hamle</span>
      </div>
    </div>
  );
};
