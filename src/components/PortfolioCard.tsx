import React from 'react';
import { TrendingUp, ShieldAlert, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import type { Portfolio } from '../types';
import { formatPercent } from '../types';

type PortfolioVariant = 'selected' | 'minVol' | 'riskParity';

interface PortfolioCardProps {
  portfolio: Portfolio;
  variant: PortfolioVariant;
  optimizationModel?: string;
}

const variantConfig: Record<PortfolioVariant, {
  borderClass: string;
  shadowClass: string;
  accentColor: string;
  barColor: string;
  barShadow: string;
  icon: React.ElementType;
  getTitle: (model?: string) => string;
  getDescription: (model?: string) => string;
}> = {
  selected: {
    borderClass: 'border-cyan-900/50',
    shadowClass: 'shadow-[0_0_20px_rgba(34,211,238,0.07)]',
    accentColor: 'text-cyan-400',
    barColor: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    barShadow: 'shadow-[0_0_10px_rgba(34,211,238,0.5)]',
    icon: TrendingUp,
    getTitle: (model) => model === 'risk-parity' ? 'Risk Parity Portfolio' : 'Maximum Sharpe',
    getDescription: (model) => model === 'risk-parity' ? 'Equal risk contribution' : 'Optimal risk-adjusted return',
  },
  minVol: {
    borderClass: 'border-indigo-900/50',
    shadowClass: 'shadow-[0_0_20px_rgba(129,140,248,0.07)]',
    accentColor: 'text-indigo-400',
    barColor: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    barShadow: 'shadow-[0_0_10px_rgba(129,140,248,0.5)]',
    icon: ShieldAlert,
    getTitle: () => 'Minimum Volatility',
    getDescription: () => 'Lowest possible risk',
  },
  riskParity: {
    borderClass: 'border-amber-900/50',
    shadowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.07)]',
    accentColor: 'text-amber-400',
    barColor: 'bg-gradient-to-r from-amber-500 to-orange-500',
    barShadow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]',
    icon: Scale,
    getTitle: () => 'Risk Parity',
    getDescription: () => 'Equal risk contribution',
  },
};

export function PortfolioCard({ portfolio, variant, optimizationModel }: PortfolioCardProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const metrics = [
    { label: 'Return', value: formatPercent(portfolio.return), color: 'text-emerald-400' },
    { label: 'Risk', value: formatPercent(portfolio.risk), color: 'text-amber-400' },
    { label: 'Sharpe', value: portfolio.sharpe.toFixed(3), color: 'text-cyan-400' },
  ];

  const riskMetrics = [
    { label: 'VaR 95%', value: portfolio.var95 ? formatPercent(portfolio.var95) : '-' },
    { label: 'CVaR 95%', value: portfolio.cvar95 ? formatPercent(portfolio.cvar95) : '-' },
    { label: 'Max DD', value: portfolio.maxDrawdown ? formatPercent(portfolio.maxDrawdown) : '-' },
    { label: 'Beta', value: portfolio.beta ? portfolio.beta.toFixed(3) : '-' },
  ];

  return (
    <Card className={`bg-slate-900/50 ${config.borderClass} backdrop-blur-sm ${config.shadowClass} hover:border-opacity-80 transition-all duration-300`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={config.accentColor}>
            {config.getTitle(optimizationModel)}
          </CardTitle>
          <Icon className={`w-5 h-5 ${config.accentColor}`} />
        </div>
        <CardDescription className="text-slate-400">
          {config.getDescription(optimizationModel)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/50">
              <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wider font-medium">{m.label}</p>
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {riskMetrics.map((m) => (
            <div key={m.label} className="text-center p-2 rounded-md bg-slate-950/40 border border-slate-800/30">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{m.label}</p>
              <p className="text-xs font-medium text-slate-300">{m.value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold mb-3 text-slate-400 uppercase tracking-wider">Allocation</p>
          <div className="space-y-2.5">
            {Object.entries(portfolio.weights)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([ticker, weight]) => (
                <div key={ticker} className="flex items-center gap-3 text-sm">
                  <span className="w-12 font-semibold text-slate-300 text-xs">{ticker}</span>
                  <div className="flex-1 h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.barColor} rounded-full ${config.barShadow} transition-all duration-500`}
                      style={{ width: `${(weight as number) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-slate-400 text-xs font-medium tabular-nums">{formatPercent(weight as number)}</span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
