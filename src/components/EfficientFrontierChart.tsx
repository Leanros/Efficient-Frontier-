import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import type { FrontierData } from '../types';

interface EfficientFrontierChartProps {
  data: FrontierData;
  optimizationModel: string;
}

export function EfficientFrontierChart({ data, optimizationModel }: EfficientFrontierChartProps) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-slate-200">Efficient Frontier</CardTitle>
        <CardDescription className="text-slate-400">Risk vs Expected Return (Annualized)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="risk"
                name="Volatility (Risk)"
                unit="%"
                domain={['auto', 'auto']}
                tickFormatter={(tick) => tick.toFixed(1)}
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="return"
                name="Expected Return"
                unit="%"
                domain={['auto', 'auto']}
                tickFormatter={(tick) => tick.toFixed(1)}
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: '#3b82f6' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 p-3 border border-slate-700 rounded-lg shadow-2xl backdrop-blur-md">
                        <p className="font-semibold text-sm mb-2 text-slate-100">Portfolio</p>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-400">Return: <span className="text-emerald-400 font-medium">{point.return.toFixed(2)}%</span></p>
                          <p className="text-xs text-slate-400">Risk: <span className="text-amber-400 font-medium">{point.risk.toFixed(2)}%</span></p>
                          <p className="text-xs text-slate-400">Sharpe: <span className="text-cyan-400 font-medium">{point.sharpe.toFixed(3)}</span></p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Portfolios" data={data.scatterPoints} fill="#3b82f6" opacity={0.25} />
              <Scatter
                name={optimizationModel === 'risk-parity' ? 'Risk Parity' : 'Max Sharpe'}
                data={[{ risk: data.selectedPortfolio.risk * 100, return: data.selectedPortfolio.return * 100, sharpe: data.selectedPortfolio.sharpe }]}
                fill="#22d3ee"
                shape="star"
              />
              <Scatter
                name="Min Volatility"
                data={[{ risk: data.minVol.risk * 100, return: data.minVol.return * 100, sharpe: data.minVol.sharpe }]}
                fill="#818cf8"
                shape="triangle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-8 mt-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 opacity-50" />
            <span>Simulated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-400" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
            <span>{optimizationModel === 'risk-parity' ? 'Risk Parity' : 'Max Sharpe'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-400" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
            <span>Min Volatility</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
