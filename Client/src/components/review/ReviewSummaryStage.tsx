import React, { FC } from 'react';
import { CoachBubble } from './CoachBubble';
import { ReviewEvalGraph } from './ReviewEvalGraph';
import { ClassificationTable } from './ClassificationTable';
import { FullGameReviewReport } from '../../analyzer/types';
import { CheckCircle, Sparkle, ShieldCheck, Target, Play } from '@phosphor-icons/react';

interface ReviewSummaryStageProps {
  report: FullGameReviewReport;
  onStartReview: () => void;
  onSelectPly: (ply: number) => void;
}

export const ReviewSummaryStage: FC<ReviewSummaryStageProps> = ({
  report,
  onStartReview,
  onSelectPly,
}) => {
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-3.5 pb-8 animate-fade-in">
      {/* 1. Coach Intro Bubble */}
      <CoachBubble
        isIntro
        introTitle={report.coachIntro.title}
        introSummary={report.coachIntro.summary}
      />

      {/* 2. Eval Graph with Key Moment Pins */}
      <ReviewEvalGraph
        curve={report.evalCurve}
        nodes={report.evalCurveNodes}
        activePly={report.moves.length}
        onSelectPly={(ply) => {
          onSelectPly(ply);
          onStartReview();
        }}
      />

      {/* 3. Player Profiles & Accuracy Card */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* White Player */}
        <div className="bg-[#102419] border border-white/10 rounded-2xl p-3 flex flex-col items-center text-center shadow-md">
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl mb-1.5">
            ♔
          </div>
          <span className="text-xs font-bold text-white/70 truncate max-w-[120px]">
            {report.whiteName}
          </span>
          <div className="bg-white text-gray-900 font-batangas text-2xl font-black px-4 py-1.5 rounded-xl shadow my-1.5">
            %{report.whiteAccuracy}
          </div>
          <span className="text-[11px] font-bold text-emerald-400">
            Reyting: ~{report.whiteRatingEstimate}
          </span>
        </div>

        {/* Black Player */}
        <div className="bg-[#102419] border border-white/10 rounded-2xl p-3 flex flex-col items-center text-center shadow-md">
          <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-xl mb-1.5">
            ♚
          </div>
          <span className="text-xs font-bold text-white/70 truncate max-w-[120px]">
            {report.blackName}
          </span>
          <div className="bg-[#262626] text-white font-batangas text-2xl font-black px-4 py-1.5 rounded-xl shadow my-1.5 border border-white/10">
            %{report.blackAccuracy}
          </div>
          <span className="text-[11px] font-bold text-cyan-400">
            Reyting: ~{report.blackRatingEstimate}
          </span>
        </div>
      </div>

      {/* 4. Classification Breakdown Table */}
      <ClassificationTable
        counts={report.counts}
        whiteName={report.whiteName}
        blackName={report.blackName}
      />

      {/* 5. Advanced Stats (Açılış, Taktik, Strateji, Hisar) */}
      <div className="bg-[#102419] border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2 shadow-md">
        <span className="text-xs font-extrabold text-white/60 uppercase tracking-wider mb-1">
          Gelişmiş Alan Değerlendirmesi
        </span>
        <div className="grid grid-cols-2 gap-2">
          {/* Açılış */}
          <div className="bg-white/[0.04] rounded-xl p-2.5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle size={18} weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/90">Açılış</p>
              <p className="text-[10px] text-white/50 truncate">%{report.areas.opening.score} başarı</p>
            </div>
          </div>

          {/* Taktik */}
          <div className="bg-white/[0.04] rounded-xl p-2.5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
              <Sparkle size={18} weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/90">Taktik</p>
              <p className="text-[10px] text-white/50 truncate">%{report.areas.tactics.score} başarı</p>
            </div>
          </div>

          {/* Strateji */}
          <div className="bg-white/[0.04] rounded-xl p-2.5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Target size={18} weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/90">Strateji</p>
              <p className="text-[10px] text-white/50 truncate">%{report.areas.strategy.score} başarı</p>
            </div>
          </div>

          {/* Hisar */}
          <div className="bg-white/[0.04] rounded-xl p-2.5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/90">Hisarlar</p>
              <p className="text-[10px] text-white/50 truncate">%{report.areas.citadels.score} başarı</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Big Action Button: Start Review */}
      <button
        onClick={onStartReview}
        className="w-full bg-[#81b64c] hover:bg-[#92c959] active:scale-[0.98] text-white font-batangas text-xl font-extrabold py-4 rounded-2xl shadow-[0_8px_20px_rgba(129,182,76,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer mt-1"
      >
        <Play size={22} weight="fill" />
        <span>İncelemeye Başla</span>
      </button>
    </div>
  );
};
