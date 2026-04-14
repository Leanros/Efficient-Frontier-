import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import type { Asset } from '../types';

interface CorrelationMatrixProps {
  correlationMatrix: number[][];
  assets: Asset[];
}

function getCorrelationColor(val: number, isDiagonal: boolean): string {
  if (isDiagonal) return 'bg-slate-800/50 text-slate-400';
  if (val > 0.7) return 'bg-red-500/15 text-red-400 font-medium';
  if (val > 0.5) return 'bg-orange-500/10 text-orange-400';
  if (val > 0.3) return 'bg-amber-500/10 text-amber-400';
  if (val > 0) return 'bg-emerald-500/10 text-emerald-400';
  return 'bg-blue-500/10 text-blue-400';
}

export function CorrelationMatrixTable({ correlationMatrix, assets }: CorrelationMatrixProps) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-slate-200">Correlation Matrix</CardTitle>
        <CardDescription className="text-slate-400">Asset return correlations (color-coded)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-slate-800/50">
          <table className="w-full text-sm text-center">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider bg-slate-950/70">
              <tr>
                <th className="px-3 py-3" />
                {assets.map(a => <th key={a.ticker} className="px-3 py-3 font-medium">{a.ticker}</th>)}
              </tr>
            </thead>
            <tbody>
              {correlationMatrix.map((row, i) => (
                <tr key={i} className="border-t border-slate-800/40">
                  <td className="px-3 py-2.5 font-semibold text-slate-400 bg-slate-950/30 text-left">{assets[i].ticker}</td>
                  {row.map((val, j) => (
                    <td key={j} className={`px-3 py-2.5 ${getCorrelationColor(val, i === j)} rounded-sm`}>
                      {val.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/30" />
            <span>High (&gt;0.7)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/30" />
            <span>Medium (0.3-0.7)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
            <span>Low (&lt;0.3)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
