import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';
import { Activity, TrendingUp, ShieldAlert, Loader2, Plus, X as XIcon, Download, FileText, Table, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { AIAssistant } from './components/AIAssistant';
import { Learn } from './components/Learn';
import { Simulation } from './components/Simulation';
import { Screener } from './components/Screener';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Portfolio {
  weights: Record<string, number>;
  return: number;
  risk: number;
  sharpe: number;
  var95?: number;
  cvar95?: number;
  maxDrawdown?: number;
  beta?: number;
}

interface Asset {
  ticker: string;
  meanReturn: number;
  volatility: number;
  sharpe: number;
  var95?: number;
  cvar95?: number;
  maxDrawdown?: number;
  beta?: number;
}

interface FrontierData {
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'optimizer' | 'simulation' | 'learn' | 'screener'>('optimizer');
  const [tickers, setTickers] = useState<string[]>(['BBCA', 'BBRI', 'BMRI', 'TLKM']);
  const [startYear, setStartYear] = useState('2015');
  const [endYear, setEndYear] = useState('2023');
  const [period, setPeriod] = useState('MoM');
  const [riskFreeRate, setRiskFreeRate] = useState('6.25');
  const [optimizationModel, setOptimizationModel] = useState('mean-variance');
  const [rebalanceFreq, setRebalanceFreq] = useState('none');
  const [transactionCost, setTransactionCost] = useState('0.15');
  const [weightConstraints, setWeightConstraints] = useState<Record<string, { min: string; max: string }>>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FrontierData | null>(null);

  const handleTickerChange = (index: number, value: string) => {
    const newTickers = [...tickers];
    newTickers[index] = value.toUpperCase();
    setTickers(newTickers);
  };

  const addTicker = () => {
    setTickers([...tickers, '']);
  };

  const removeTicker = (index: number) => {
    if (tickers.length > 2) {
      const newTickers = tickers.filter((_, i) => i !== index);
      setTickers(newTickers);
    }
  };

  const handleConstraintChange = (ticker: string, type: 'min' | 'max', value: string) => {
    setWeightConstraints(prev => ({
      ...prev,
      [ticker]: {
        ...prev[ticker],
        [type]: value
      }
    }));
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const tickerArray = tickers.map(t => t.trim()).filter(t => t);
      if (tickerArray.length < 2) {
        throw new Error('Please enter at least 2 valid tickers.');
      }

      const parsedConstraints: Record<string, { min?: number; max?: number }> = {};
      Object.keys(weightConstraints).forEach(t => {
        if (tickerArray.includes(t)) {
          const min = parseFloat(weightConstraints[t]?.min);
          const max = parseFloat(weightConstraints[t]?.max);
          if (!isNaN(min) || !isNaN(max)) {
            parsedConstraints[t] = {};
            if (!isNaN(min)) parsedConstraints[t].min = min;
            if (!isNaN(max)) parsedConstraints[t].max = max;
          }
        }
      });

      const response = await fetch('/api/efficient-frontier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: tickerArray,
          startYear: parseInt(startYear),
          endYear: parseInt(endYear),
          period,
          riskFreeRate: parseFloat(riskFreeRate) / 100,
          optimizationModel,
          rebalanceFreq,
          transactionCost: parseFloat(transactionCost) / 100,
          weightConstraints: parsedConstraints
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to calculate efficient frontier');
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;

  const downloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Nusantara Quant - Efficient Frontier Report', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Period: ${startYear} - ${endYear} (${period})`, 14, 30);
    doc.text(`Risk-Free Rate: ${riskFreeRate}%`, 14, 36);

    // Selected Portfolio
    doc.setFontSize(14);
    doc.text(`Selected Portfolio (${optimizationModel === 'risk-parity' ? 'Risk Parity' : 'Max Sharpe'})`, 14, 48);
    autoTable(doc, {
      startY: 52,
      head: [['Metric', 'Value']],
      body: [
        ['Expected Return', formatPercent(data.selectedPortfolio.return)],
        ['Volatility (Risk)', formatPercent(data.selectedPortfolio.risk)],
        ['Sharpe Ratio', data.selectedPortfolio.sharpe.toFixed(4)],
        ['VaR (95%)', data.selectedPortfolio.var95 ? formatPercent(data.selectedPortfolio.var95) : '-'],
        ['CVaR (95%)', data.selectedPortfolio.cvar95 ? formatPercent(data.selectedPortfolio.cvar95) : '-'],
        ['Max Drawdown', data.selectedPortfolio.maxDrawdown ? formatPercent(data.selectedPortfolio.maxDrawdown) : '-'],
        ['Beta to IHSG', data.selectedPortfolio.beta ? data.selectedPortfolio.beta.toFixed(4) : '-'],
      ],
    });

    // Selected Portfolio Weights
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Asset', 'Weight']],
      body: Object.entries(data.selectedPortfolio.weights).map(([ticker, weight]) => [ticker, formatPercent(weight as number)]),
    });

    // Min Volatility Portfolio
    doc.text('Minimum Volatility Portfolio', 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Metric', 'Value']],
      body: [
        ['Expected Return', formatPercent(data.minVol.return)],
        ['Volatility (Risk)', formatPercent(data.minVol.risk)],
        ['Sharpe Ratio', data.minVol.sharpe.toFixed(4)],
        ['VaR (95%)', data.minVol.var95 ? formatPercent(data.minVol.var95) : '-'],
        ['CVaR (95%)', data.minVol.cvar95 ? formatPercent(data.minVol.cvar95) : '-'],
        ['Max Drawdown', data.minVol.maxDrawdown ? formatPercent(data.minVol.maxDrawdown) : '-'],
        ['Beta to IHSG', data.minVol.beta ? data.minVol.beta.toFixed(4) : '-'],
      ],
    });

    // Min Volatility Weights
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Asset', 'Weight']],
      body: Object.entries(data.minVol.weights).map(([ticker, weight]) => [ticker, formatPercent(weight as number)]),
    });

    // Individual Assets
    doc.addPage();
    doc.text('Individual Asset Performance', 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [['Ticker', 'Return', 'Risk', 'Sharpe', 'VaR', 'CVaR', 'Max DD', 'Beta']],
      body: data.assets.map(a => [
        a.ticker, 
        formatPercent(a.meanReturn), 
        formatPercent(a.volatility), 
        a.sharpe.toFixed(4),
        a.var95 ? formatPercent(a.var95) : '-',
        a.cvar95 ? formatPercent(a.cvar95) : '-',
        a.maxDrawdown ? formatPercent(a.maxDrawdown) : '-',
        a.beta ? a.beta.toFixed(4) : '-'
      ]),
    });

    // Correlation Matrix
    doc.text('Asset Correlation Matrix', 14, (doc as any).lastAutoTable.finalY + 15);
    const corrHead = ['Asset', ...data.assets.map(a => a.ticker)];
    const corrBody = data.correlationMatrix.map((row, i) => [
      data.assets[i].ticker,
      ...row.map(val => val.toFixed(4))
    ]);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [corrHead],
      body: corrBody,
    });

    // Top 10 Portfolios (to save space in PDF)
    doc.addPage();
    doc.text('Top 10 Efficient Portfolios', 14, 20);
    const top10Head = ['Rank', 'Return', 'Risk', 'Sharpe', ...data.assets.map(a => a.ticker)];
    const top10Body = data.top100Portfolios.slice(0, 10).map((p, i) => [
      `#${i + 1}`,
      formatPercent(p.return),
      formatPercent(p.risk),
      p.sharpe.toFixed(4),
      ...data.assets.map(a => formatPercent(p.weights[a.ticker] || 0))
    ]);
    autoTable(doc, {
      startY: 25,
      head: [top10Head],
      body: top10Body,
    });

    // Stress Tests
    doc.text('Stress Tests (Historical Crises)', 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Scenario', 'Return', 'Max Drawdown']],
      body: [
        ['COVID-19 (Mar 2020)', formatPercent(data.stressTests.covid.return), formatPercent(data.stressTests.covid.maxDrawdown)],
        ['Global Financial Crisis (2008)', formatPercent(data.stressTests.gfc.return), formatPercent(data.stressTests.gfc.maxDrawdown)],
      ],
    });

    doc.save('nusantara-quant-report.pdf');
  };

  const downloadExcel = () => {
    if (!data) return;
    
    const wb = XLSX.utils.book_new();

    // Portfolios Sheet
    const portfoliosData = [
      ['Portfolio', 'Expected Return', 'Volatility', 'Sharpe Ratio', 'VaR (95%)', 'CVaR (95%)', 'Max Drawdown', 'Beta'],
      ['Selected Portfolio', data.selectedPortfolio.return, data.selectedPortfolio.risk, data.selectedPortfolio.sharpe, data.selectedPortfolio.var95, data.selectedPortfolio.cvar95, data.selectedPortfolio.maxDrawdown, data.selectedPortfolio.beta],
      ['Max Sharpe', data.maxSharpe.return, data.maxSharpe.risk, data.maxSharpe.sharpe, data.maxSharpe.var95, data.maxSharpe.cvar95, data.maxSharpe.maxDrawdown, data.maxSharpe.beta],
      ['Min Volatility', data.minVol.return, data.minVol.risk, data.minVol.sharpe, data.minVol.var95, data.minVol.cvar95, data.minVol.maxDrawdown, data.minVol.beta],
      ['Risk Parity', data.riskParity.return, data.riskParity.risk, data.riskParity.sharpe, data.riskParity.var95, data.riskParity.cvar95, data.riskParity.maxDrawdown, data.riskParity.beta],
      [],
      ['Selected Portfolio Weights'],
      ...Object.entries(data.selectedPortfolio.weights).map(([t, w]) => [t, w]),
      [],
      ['Max Sharpe Weights'],
      ...Object.entries(data.maxSharpe.weights).map(([t, w]) => [t, w]),
      [],
      ['Min Volatility Weights'],
      ...Object.entries(data.minVol.weights).map(([t, w]) => [t, w]),
      [],
      ['Risk Parity Weights'],
      ...Object.entries(data.riskParity.weights).map(([t, w]) => [t, w])
    ];
    const wsPortfolios = XLSX.utils.aoa_to_sheet(portfoliosData);
    XLSX.utils.book_append_sheet(wb, wsPortfolios, 'Key Portfolios');

    // Assets Sheet
    const assetsData = [
      ['Ticker', 'Expected Return', 'Volatility', 'Sharpe Ratio', 'VaR (95%)', 'CVaR (95%)', 'Max Drawdown', 'Beta'],
      ...data.assets.map(a => [a.ticker, a.meanReturn, a.volatility, a.sharpe, a.var95, a.cvar95, a.maxDrawdown, a.beta])
    ];
    const wsAssets = XLSX.utils.aoa_to_sheet(assetsData);
    XLSX.utils.book_append_sheet(wb, wsAssets, 'Assets');

    // Correlation Sheet
    const corrData = [
      ['Asset', ...data.assets.map(a => a.ticker)],
      ...data.correlationMatrix.map((row, i) => [data.assets[i].ticker, ...row])
    ];
    const wsCorr = XLSX.utils.aoa_to_sheet(corrData);
    XLSX.utils.book_append_sheet(wb, wsCorr, 'Correlation');

    // Top 100 Portfolios Sheet
    const top100Data = [
      ['Rank', 'Return', 'Risk', 'Sharpe', 'VaR (95%)', 'CVaR (95%)', 'Max Drawdown', 'Beta', ...data.assets.map(a => a.ticker)],
      ...data.top100Portfolios.map((p, i) => [
        i + 1, p.return, p.risk, p.sharpe, p.var95, p.cvar95, p.maxDrawdown, p.beta,
        ...data.assets.map(a => p.weights[a.ticker] || 0)
      ])
    ];
    const wsTop100 = XLSX.utils.aoa_to_sheet(top100Data);
    XLSX.utils.book_append_sheet(wb, wsTop100, 'Top 100 Portfolios');

    // Cumulative Returns Sheet
    const cumRetsData = [
      ['Date', 'Selected Portfolio (%)', 'IHSG (%)'],
      ...data.cumulativeReturns.map(r => [r.date, r.portfolio, r.ihsg])
    ];
    const wsCumRets = XLSX.utils.aoa_to_sheet(cumRetsData);
    XLSX.utils.book_append_sheet(wb, wsCumRets, 'Cumulative Returns');

    // Drawdown Sheet
    const drawdownData = [
      ['Date', 'Drawdown (%)'],
      ...data.drawdownSeries.map(r => [r.date, r.drawdown])
    ];
    const wsDrawdown = XLSX.utils.aoa_to_sheet(drawdownData);
    XLSX.utils.book_append_sheet(wb, wsDrawdown, 'Drawdown Series');

    // Rolling Metrics Sheet
    const rollingMetricsData = [
      ['Date', 'Rolling Sharpe', 'Rolling Volatility (%)'],
      ...data.rollingMetrics.map(r => [r.date, r.sharpe, r.volatility])
    ];
    const wsRollingMetrics = XLSX.utils.aoa_to_sheet(rollingMetricsData);
    XLSX.utils.book_append_sheet(wb, wsRollingMetrics, 'Rolling Metrics');

    // Stress Tests Sheet
    const stressTestsData = [
      ['Scenario', 'Return', 'Max Drawdown'],
      ['COVID-19 (Mar 2020)', data.stressTests.covid.return, data.stressTests.covid.maxDrawdown],
      ['Global Financial Crisis (2008)', data.stressTests.gfc.return, data.stressTests.gfc.maxDrawdown]
    ];
    const wsStressTests = XLSX.utils.aoa_to_sheet(stressTestsData);
    XLSX.utils.book_append_sheet(wb, wsStressTests, 'Stress Tests');

    XLSX.writeFile(wb, 'nusantara-quant-report.xlsx');
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-50 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Nusantara Quant</h1>
              <p className="text-sm text-slate-400">Advanced Portfolio Optimization</p>
            </div>
          </div>
          
          <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800 shadow-inner">
            <button 
              onClick={() => setActiveTab('optimizer')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'optimizer' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              Optimizer
            </button>
            <button 
              onClick={() => setActiveTab('screener')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'screener' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              Screener
            </button>
            <button 
              onClick={() => setActiveTab('simulation')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'simulation' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              Simulasi
            </button>
            <button 
              onClick={() => setActiveTab('learn')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'learn' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              Belajar
            </button>
          </div>

          {activeTab === 'optimizer' && data && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={downloadPDF} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 bg-slate-900">
                <FileText className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={downloadExcel} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 bg-slate-900">
                <Table className="w-4 h-4 mr-2" /> Excel
              </Button>
            </div>
          )}
        </header>

        {activeTab === 'screener' && <Screener />}
        {activeTab === 'simulation' && <Simulation />}
        {activeTab === 'learn' && <Learn />}

        {activeTab === 'optimizer' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-500">
            {/* Sidebar Controls */}
            <Card className="lg:col-span-1 h-fit bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-slate-200">Parameters</CardTitle>
              <CardDescription className="text-slate-400">Configure your portfolio constraints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-slate-300">Tickers (IDX)</Label>
                <div className="space-y-2">
                  {tickers.map((ticker, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Input 
                          value={ticker} 
                          onChange={(e) => handleTickerChange(idx, e.target.value)} 
                          placeholder="e.g. BBCA"
                          className="bg-slate-950 border-slate-800 text-slate-200 focus-visible:ring-blue-500"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeTicker(idx)}
                          disabled={tickers.length <= 2}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                        >
                          <XIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex space-x-2 pl-2">
                        <div className="w-1/2">
                          <Label className="text-xs text-slate-500">Min %</Label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="h-7 text-xs bg-slate-950 border-slate-800 text-slate-300"
                            value={weightConstraints[ticker]?.min || ''}
                            onChange={(e) => handleConstraintChange(ticker, 'min', e.target.value)}
                          />
                        </div>
                        <div className="w-1/2">
                          <Label className="text-xs text-slate-500">Max %</Label>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            className="h-7 text-xs bg-slate-950 border-slate-800 text-slate-300"
                            value={weightConstraints[ticker]?.max || ''}
                            onChange={(e) => handleConstraintChange(ticker, 'max', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addTicker}
                  className="w-full border-dashed border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 bg-transparent"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Ticker
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startYear" className="text-slate-300">Start Year</Label>
                  <Input 
                    id="startYear" 
                    type="number" 
                    min="2010" 
                    max="2026" 
                    value={startYear} 
                    onChange={(e) => setStartYear(e.target.value)} 
                    className="bg-slate-950 border-slate-800 text-slate-200 focus-visible:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endYear" className="text-slate-300">End Year</Label>
                  <Input 
                    id="endYear" 
                    type="number" 
                    min="2010" 
                    max="2026" 
                    value={endYear} 
                    onChange={(e) => setEndYear(e.target.value)} 
                    className="bg-slate-950 border-slate-800 text-slate-200 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period" className="text-slate-300">Period</Label>
                <select 
                  id="period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="MoM">Monthly (MoM)</option>
                  <option value="YoY">Yearly (YoY)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="optimizationModel" className="text-slate-300">Optimization Model</Label>
                <select 
                  id="optimizationModel"
                  value={optimizationModel}
                  onChange={(e) => setOptimizationModel(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="mean-variance">Mean-Variance (Max Sharpe)</option>
                  <option value="risk-parity">Risk Parity</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rebalanceFreq" className="text-slate-300">Rebalance</Label>
                  <select 
                    id="rebalanceFreq"
                    value={rebalanceFreq}
                    onChange={(e) => setRebalanceFreq(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transactionCost" className="text-slate-300">Tx Cost (%)</Label>
                  <Input 
                    id="transactionCost" 
                    type="number" 
                    step="0.01"
                    value={transactionCost} 
                    onChange={(e) => setTransactionCost(e.target.value)} 
                    className="bg-slate-950 border-slate-800 text-slate-200 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="riskFreeRate" className="text-slate-300">Risk-Free Rate (%)</Label>
                <Input 
                  id="riskFreeRate" 
                  type="number" 
                  step="0.01"
                  value={riskFreeRate} 
                  onChange={(e) => setRiskFreeRate(e.target.value)} 
                  className="bg-slate-950 border-slate-800 text-slate-200 focus-visible:ring-blue-500"
                  placeholder="e.g. 6.25 for BI Rate"
                />
              </div>

              <Button 
                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
                onClick={handleCalculate}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? 'Calculating...' : 'Calculate Frontier'}
              </Button>

              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-950/30 rounded-md border border-red-900/50">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {data ? (
              <>
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
                          />
                          <YAxis 
                            type="number" 
                            dataKey="return" 
                            name="Expected Return" 
                            unit="%" 
                            domain={['auto', 'auto']}
                            tickFormatter={(tick) => tick.toFixed(1)}
                            stroke="#64748b"
                          />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3', stroke: '#3b82f6' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-950/90 p-3 border border-slate-800 rounded-lg shadow-xl backdrop-blur-md">
                                    <p className="font-medium text-sm mb-1 text-slate-200">Portfolio</p>
                                    <p className="text-xs text-slate-400">Return: <span className="text-blue-400">{data.return.toFixed(2)}%</span></p>
                                    <p className="text-xs text-slate-400">Risk: <span className="text-blue-400">{data.risk.toFixed(2)}%</span></p>
                                    <p className="text-xs text-slate-400">Sharpe: <span className="text-blue-400">{data.sharpe.toFixed(2)}</span></p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter name="Portfolios" data={data.scatterPoints} fill="#3b82f6" opacity={0.3} />
                          {/* Highlight Selected Portfolio */}
                          <Scatter 
                            name={optimizationModel === 'risk-parity' ? 'Risk Parity' : 'Max Sharpe'} 
                            data={[{ risk: data.selectedPortfolio.risk * 100, return: data.selectedPortfolio.return * 100, sharpe: data.selectedPortfolio.sharpe }]} 
                            fill="#22d3ee" 
                            shape="star"
                          />
                          {/* Highlight Min Volatility */}
                          <Scatter 
                            name="Min Volatility" 
                            data={[{ risk: data.minVol.risk * 100, return: data.minVol.return * 100, sharpe: data.minVol.sharpe }]} 
                            fill="#818cf8" 
                            shape="triangle"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center space-x-6 mt-4 text-sm text-slate-400">
                      <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 opacity-50 mr-2"></div> Simulated</div>
                      <div className="flex items-center"><div className="w-3 h-3 bg-cyan-400 mr-2" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div> {optimizationModel === 'risk-parity' ? 'Risk Parity' : 'Max Sharpe'}</div>
                      <div className="flex items-center"><div className="w-3 h-3 bg-indigo-400 mr-2" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div> Min Volatility</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Selected Portfolio Card */}
                  <Card className="bg-slate-900/50 border-cyan-900/50 backdrop-blur-sm shadow-[0_0_15px_rgba(34,211,238,0.05)]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-cyan-400">
                          {optimizationModel === 'risk-parity' ? 'Risk Parity Portfolio' : 'Maximum Sharpe'}
                        </CardTitle>
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                      </div>
                      <CardDescription className="text-slate-400">
                        {optimizationModel === 'risk-parity' ? 'Equal risk contribution' : 'Optimal risk-adjusted return'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Return</p>
                          <p className="text-lg font-semibold text-slate-200">{formatPercent(data.selectedPortfolio.return)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Risk</p>
                          <p className="text-lg font-semibold text-slate-200">{formatPercent(data.selectedPortfolio.risk)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Sharpe</p>
                          <p className="text-lg font-semibold text-slate-200">{data.selectedPortfolio.sharpe.toFixed(2)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-3 text-slate-300">Allocation</p>
                        <div className="space-y-2">
                          {Object.entries(data.selectedPortfolio.weights).map(([ticker, weight]) => (
                            <div key={ticker} className="flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-300">{ticker}</span>
                              <div className="flex-1 mx-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
                                  style={{ width: `${(weight as number) * 100}%` }}
                                />
                              </div>
                              <span className="w-12 text-right text-slate-400">{formatPercent(weight as number)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Min Volatility Card */}
                  <Card className="bg-slate-900/50 border-indigo-900/50 backdrop-blur-sm shadow-[0_0_15px_rgba(129,140,248,0.05)]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-indigo-400">Minimum Volatility</CardTitle>
                        <ShieldAlert className="w-5 h-5 text-indigo-400" />
                      </div>
                      <CardDescription className="text-slate-400">Lowest possible risk</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Return</p>
                          <p className="text-lg font-semibold text-slate-200">{formatPercent(data.minVol.return)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Risk</p>
                          <p className="text-lg font-semibold text-slate-200">{formatPercent(data.minVol.risk)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Sharpe</p>
                          <p className="text-lg font-semibold text-slate-200">{data.minVol.sharpe.toFixed(2)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-3 text-slate-300">Allocation</p>
                        <div className="space-y-2">
                          {Object.entries(data.minVol.weights).map(([ticker, weight]) => (
                            <div key={ticker} className="flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-300">{ticker}</span>
                              <div className="flex-1 mx-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(129,140,248,0.5)]" 
                                  style={{ width: `${(weight as number) * 100}%` }}
                                />
                              </div>
                              <span className="w-12 text-right text-slate-400">{formatPercent(weight as number)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Individual Assets & Correlation */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-200">Asset Performance</CardTitle>
                      <CardDescription className="text-slate-400">Individual metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                            <tr>
                              <th className="px-4 py-3 rounded-tl-lg">Ticker</th>
                              <th className="px-4 py-3">Return</th>
                              <th className="px-4 py-3">Risk</th>
                              <th className="px-4 py-3">Sharpe</th>
                              <th className="px-4 py-3">VaR (95%)</th>
                              <th className="px-4 py-3">CVaR (95%)</th>
                              <th className="px-4 py-3">Max DD</th>
                              <th className="px-4 py-3 rounded-tr-lg">Beta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.assets.map((asset) => (
                              <tr key={asset.ticker} className="border-b border-slate-800/50 last:border-0">
                                <td className="px-4 py-3 font-medium text-blue-400">{asset.ticker}</td>
                                <td className="px-4 py-3 text-slate-300">{formatPercent(asset.meanReturn)}</td>
                                <td className="px-4 py-3 text-slate-300">{formatPercent(asset.volatility)}</td>
                                <td className="px-4 py-3 text-slate-300">{asset.sharpe.toFixed(2)}</td>
                                <td className="px-4 py-3 text-slate-300">{asset.var95 ? formatPercent(asset.var95) : '-'}</td>
                                <td className="px-4 py-3 text-slate-300">{asset.cvar95 ? formatPercent(asset.cvar95) : '-'}</td>
                                <td className="px-4 py-3 text-slate-300">{asset.maxDrawdown ? formatPercent(asset.maxDrawdown) : '-'}</td>
                                <td className="px-4 py-3 text-slate-300">{asset.beta ? asset.beta.toFixed(2) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-200">Correlation Matrix</CardTitle>
                      <CardDescription className="text-slate-400">Asset price relationships</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-center">
                          <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                            <tr>
                              <th className="px-2 py-2 rounded-tl-lg"></th>
                              {data.assets.map(a => <th key={a.ticker} className="px-2 py-2 font-medium">{a.ticker}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {data.correlationMatrix.map((row, i) => (
                              <tr key={i} className="border-b border-slate-800/50 last:border-0">
                                <td className="px-2 py-2 font-medium text-slate-400 bg-slate-950/30">{data.assets[i].ticker}</td>
                                {row.map((val, j) => {
                                  // Color coding based on correlation
                                  let colorClass = "text-slate-300";
                                  if (i !== j) {
                                    if (val > 0.7) colorClass = "text-red-400";
                                    else if (val < 0.3) colorClass = "text-emerald-400";
                                    else colorClass = "text-amber-400";
                                  }
                                  return (
                                    <td key={j} className={`px-2 py-2 ${colorClass}`}>
                                      {val.toFixed(2)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cumulative Returns Chart */}
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Cumulative Returns: {optimizationModel === 'risk-parity' ? 'Risk Parity' : 'Max Sharpe'} vs IHSG</CardTitle>
                    <CardDescription className="text-slate-400">Performance comparison over the selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.cumulativeReturns} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#64748b" 
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(val) => val.substring(0, 4)}
                          />
                          <YAxis 
                            stroke="#64748b" 
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(val) => `${val.toFixed(0)}%`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            itemStyle={{ color: '#e2e8f0' }}
                            formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="portfolio" name={`${optimizationModel === 'risk-parity' ? 'Risk Parity' : 'Max Sharpe'} Portfolio`} stroke="#3b82f6" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="ihsg" name="IHSG (^JKSE)" stroke="#10b981" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Drawdown Chart */}
                  <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-200">Drawdown Series</CardTitle>
                      <CardDescription className="text-slate-400">Portfolio drawdown over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data.drawdownSeries} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#64748b" 
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              tickFormatter={(val) => val.substring(0, 4)}
                            />
                            <YAxis 
                              stroke="#64748b" 
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              tickFormatter={(val) => `${val.toFixed(0)}%`}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                              itemStyle={{ color: '#e2e8f0' }}
                              formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                              labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Line type="monotone" dataKey="drawdown" name="Drawdown" stroke="#ef4444" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rolling Metrics Chart */}
                  <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-200">Rolling Metrics (1Y)</CardTitle>
                      <CardDescription className="text-slate-400">Rolling Sharpe and Volatility</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data.rollingMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#64748b" 
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              tickFormatter={(val) => val.substring(0, 4)}
                            />
                            <YAxis 
                              yAxisId="left"
                              stroke="#64748b" 
                              tick={{ fill: '#64748b', fontSize: 12 }}
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              stroke="#64748b" 
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              tickFormatter={(val) => `${val.toFixed(0)}%`}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                              itemStyle={{ color: '#e2e8f0' }}
                              labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="sharpe" name="Sharpe Ratio" stroke="#f59e0b" strokeWidth={2} dot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="volatility" name="Volatility" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top 100 Portfolios */}
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Top 100 Efficient Portfolios</CardTitle>
                    <CardDescription className="text-slate-400">Ranked by Sharpe Ratio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Rank</th>
                            <th className="px-4 py-3">Return</th>
                            <th className="px-4 py-3">Risk</th>
                            <th className="px-4 py-3">Sharpe</th>
                            {data.assets.map(a => <th key={a.ticker} className="px-4 py-3">{a.ticker}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {data.top100Portfolios.map((port, idx) => (
                            <tr key={idx} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-400">#{idx + 1}</td>
                              <td className="px-4 py-3 text-emerald-400">{formatPercent(port.return)}</td>
                              <td className="px-4 py-3 text-amber-400">{formatPercent(port.risk)}</td>
                              <td className="px-4 py-3 text-cyan-400">{port.sharpe.toFixed(2)}</td>
                              {data.assets.map(a => (
                                <td key={a.ticker} className="px-4 py-3 text-slate-300">
                                  {formatPercent(port.weights[a.ticker] || 0)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20 backdrop-blur-sm">
                <Activity className="w-12 h-12 mb-4 opacity-20 text-blue-500" />
                <p>Enter parameters and calculate to see the efficient frontier.</p>
              </div>
            )}
          </div>
        </div>
        )}

        {activeTab === 'simulation' && (
          <Simulation data={data} />
        )}

        {activeTab === 'learn' && (
          <Learn />
        )}
      </div>
      <AIAssistant contextData={data} />
    </div>
  );
}
