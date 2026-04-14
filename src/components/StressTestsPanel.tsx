import React from 'react';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { formatPercent } from '../types';

interface StressTestsPanelProps {
  stressTests: {
    covid: { return: number; maxDrawdown: number };
    gfc: { return: number; maxDrawdown: number };
  };
}

const scenarios = [
  {
    key: 'covid' as const,
    title: 'COVID-19 Crash',
    period: 'Feb 2020 - Apr 2020',
    description: 'Global pandemic triggered a sharp market selloff across all asset classes.',
  },
  {
    key: 'gfc' as const,
    title: 'Global Financial Crisis',
    period: 'Sep 2008 - Mar 2009',
    description: 'Subprime mortgage crisis led to a worldwide financial meltdown.',
  },
];

export function StressTestsPanel({ stressTests }: StressTestsPanelProps) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <CardTitle className="text-slate-200">Stress Tests</CardTitle>
            <CardDescription className="text-slate-400">How your portfolio would have performed during historical crises</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((scenario) => {
            const data = stressTests[scenario.key];
            const hasData = data.return !== 0 || data.maxDrawdown !== 0;

            return (
              <div
                key={scenario.key}
                className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/50 hover:border-red-900/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm">{scenario.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{scenario.period}</p>
                  </div>
                  <TrendingDown className="w-4 h-4 text-red-400/60" />
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">{scenario.description}</p>

                {hasData ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/30">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Return</p>
                      <p className={`text-lg font-bold ${data.return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {data.return >= 0 ? '+' : ''}{data.return.toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/30">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Max Drawdown</p>
                      <p className="text-lg font-bold text-orange-400">
                        -{data.maxDrawdown.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 text-center">
                    <p className="text-xs text-slate-500">No data available for this period</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
