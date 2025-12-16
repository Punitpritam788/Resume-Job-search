import React from 'react';
import { JobCardData } from '../types';

interface OverviewChartProps {
  cards: JobCardData[];
}

export const OverviewChart: React.FC<OverviewChartProps> = ({ cards }) => {
  const demandCounts = cards.reduce((acc, card) => {
    acc[card.demand_level] = (acc[card.demand_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = cards.length;
  // Prevent division by zero
  const highPct = total > 0 ? ((demandCounts['High'] || 0) / total) * 100 : 0;
  const medPct = total > 0 ? ((demandCounts['Medium'] || 0) / total) * 100 : 0;
  const lowPct = total > 0 ? ((demandCounts['Low'] || 0) / total) * 100 : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
        Opportunity Mix
      </h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-green-700 dark:text-green-400">High Demand</span>
            <span className="text-slate-600 dark:text-slate-300">{demandCounts['High'] || 0} roles</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${highPct}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-yellow-700 dark:text-yellow-400">Medium Demand</span>
            <span className="text-slate-600 dark:text-slate-300">{demandCounts['Medium'] || 0} roles</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${medPct}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-rose-700 dark:text-rose-400">Low Demand</span>
            <span className="text-slate-600 dark:text-slate-300">{demandCounts['Low'] || 0} roles</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${lowPct}%` }}></div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
         <p className="text-xs text-slate-400 dark:text-slate-500 italic">
           Based on current market trends in India (2024-25).
         </p>
      </div>
    </div>
  );
};