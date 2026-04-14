import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

interface CumulativeReturnsChartProps {
  cumulativeReturns: { date: string; portfolio: number; ihsg: number }[];
  optimizationModel: string;
}

export function CumulativeReturnsChart({ cumulativeReturns, optimizationModel }: CumulativeReturnsChartProps) {
  const portfolioLabel = optimizationModel === 'risk-parity' ? 'Risk Parity' : 'Max Sharpe';

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-slate-200">Cumulative Returns: {portfolioLabel} vs IHSG</CardTitle>
        <CardDescription className="text-slate-400">Performance comparison over the selected period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeReturns} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(val) => val.substring(0, 7)}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(val) => `${val.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line type="monotone" dataKey="portfolio" name={`${portfolioLabel} Portfolio`} stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ihsg" name="IHSG (^JKSE)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
