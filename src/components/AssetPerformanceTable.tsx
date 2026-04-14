import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import type { Asset } from '../types';
import { formatPercent } from '../types';

interface AssetPerformanceTableProps {
  assets: Asset[];
}

export function AssetPerformanceTable({ assets }: AssetPerformanceTableProps) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-slate-200">Asset Performance</CardTitle>
        <CardDescription className="text-slate-400">Individual asset metrics (annualized)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-slate-800/50">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-400 uppercase tracking-wider bg-slate-950/70">
              <tr>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3">Return</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Sharpe</th>
                <th className="px-4 py-3">VaR (95%)</th>
                <th className="px-4 py-3">CVaR (95%)</th>
                <th className="px-4 py-3">Max DD</th>
                <th className="px-4 py-3">Beta</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.ticker} className="border-t border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-semibold text-blue-400">{asset.ticker}</td>
                  <td className={`px-4 py-3 font-medium ${asset.meanReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(asset.meanReturn)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatPercent(asset.volatility)}</td>
                  <td className={`px-4 py-3 font-medium ${asset.sharpe >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                    {asset.sharpe.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-red-400/80">{asset.var95 ? formatPercent(asset.var95) : '-'}</td>
                  <td className="px-4 py-3 text-red-400/80">{asset.cvar95 ? formatPercent(asset.cvar95) : '-'}</td>
                  <td className="px-4 py-3 text-orange-400/80">{asset.maxDrawdown ? formatPercent(asset.maxDrawdown) : '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{asset.beta ? asset.beta.toFixed(3) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
