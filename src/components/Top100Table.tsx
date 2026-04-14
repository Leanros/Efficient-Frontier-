import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import type { Portfolio, Asset } from '../types';
import { formatPercent } from '../types';

interface Top100TableProps {
  portfolios: Portfolio[];
  assets: Asset[];
}

export function Top100Table({ portfolios, assets }: Top100TableProps) {
  const [visibleCount, setVisibleCount] = useState(20);
  const visiblePortfolios = portfolios.slice(0, visibleCount);

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-200">Top 100 Efficient Portfolios</CardTitle>
            <CardDescription className="text-slate-400">Ranked by Sharpe Ratio (showing {Math.min(visibleCount, portfolios.length)} of {portfolios.length})</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-slate-800/50">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider bg-slate-950/70 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Return</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Sharpe</th>
                  {assets.map(a => <th key={a.ticker} className="px-4 py-3">{a.ticker}</th>)}
                </tr>
              </thead>
              <tbody>
                {visiblePortfolios.map((port, idx) => (
                  <tr key={idx} className="border-t border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-500 text-xs">{idx + 1}</td>
                    <td className={`px-4 py-2.5 font-medium ${port.return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPercent(port.return)}</td>
                    <td className="px-4 py-2.5 text-amber-400">{formatPercent(port.risk)}</td>
                    <td className="px-4 py-2.5 text-cyan-400 font-medium">{port.sharpe.toFixed(3)}</td>
                    {assets.map(a => (
                      <td key={a.ticker} className="px-4 py-2.5 text-slate-400 tabular-nums text-xs">
                        {formatPercent(port.weights[a.ticker] || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {visibleCount < portfolios.length && (
          <button
            onClick={() => setVisibleCount(prev => Math.min(prev + 30, portfolios.length))}
            className="mt-4 w-full py-2.5 text-sm font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
          >
            Show More ({portfolios.length - visibleCount} remaining)
          </button>
        )}
      </CardContent>
    </Card>
  );
}
