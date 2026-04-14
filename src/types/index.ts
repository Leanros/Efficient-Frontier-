export interface Portfolio {
  weights: Record<string, number>;
  return: number;
  risk: number;
  sharpe: number;
  var95?: number;
  cvar95?: number;
  maxDrawdown?: number;
  beta?: number;
}

export interface Asset {
  ticker: string;
  meanReturn: number;
  volatility: number;
  sharpe: number;
  var95?: number;
  cvar95?: number;
  maxDrawdown?: number;
  beta?: number;
}

export interface FrontierData {
  maxSharpe: Portfolio;
  minVol: Portfolio;
  riskParity: Portfolio;
  selectedPortfolio: Portfolio;
  scatterPoints: { risk: number; return: number; sharpe: number }[];
  top100Portfolios: Portfolio[];
  cumulativeReturns: { date: string; portfolio: number; ihsg: number }[];
  drawdownSeries: { date: string; drawdown: number }[];
  rollingMetrics: { date: string; sharpe: number; volatility: number }[];
  stressTests: {
    covid: { return: number; maxDrawdown: number };
    gfc: { return: number; maxDrawdown: number };
  };
  assets: Asset[];
  correlationMatrix: number[][];
}

export const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;
