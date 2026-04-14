import React, { useState } from 'react';
import { Activity, Loader2, Plus, X as XIcon, FileText, Table } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select } from './components/ui/select';
import { AIAssistant } from './components/AIAssistant';
import { Learn } from './components/Learn';
import { Simulation } from './components/Simulation';
import { Screener } from './components/Screener';
import { EfficientFrontierChart } from './components/EfficientFrontierChart';
import { PortfolioCard } from './components/PortfolioCard';
import { AssetPerformanceTable } from './components/AssetPerformanceTable';
import { CorrelationMatrixTable } from './components/CorrelationMatrix';
import { CumulativeReturnsChart } from './components/CumulativeReturnsChart';
import { DrawdownChart } from './components/DrawdownChart';
import { RollingMetricsChart } from './components/RollingMetricsChart';
import { StressTestsPanel } from './components/StressTestsPanel';
import { Top100Table } from './components/Top100Table';
import { formatPercent } from './types';
import type { FrontierData } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type TabId = 'optimizer' | 'simulation' | 'learn' | 'screener';

const tabs: { id: TabId; label: string }[] = [
  { id: 'optimizer', label: 'Optimizer' },
  { id: 'screener', label: 'Screener' },
  { id: 'simulation', label: 'Simulasi' },
  { id: 'learn', label: 'Belajar' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('optimizer');
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
    <div className="min-h-screen bg-slate-950 font-sans text-slate-50 selection:bg-blue-500/30">
      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(30,41,59,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.15)]">
              <Activity className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300">
                Nusantara Quant
              </h1>
              <p className="text-sm text-slate-500">Advanced Portfolio Optimization</p>
            </div>
          </div>

          <nav className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 shadow-inner">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'optimizer' && data && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={downloadPDF} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 bg-slate-900/80">
                <FileText className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={downloadExcel} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 bg-slate-900/80">
                <Table className="w-4 h-4 mr-2" /> Excel
              </Button>
            </div>
          )}
        </header>

        {/* Tab Content */}
        {activeTab === 'screener' && <Screener />}
        {activeTab === 'simulation' && <Simulation data={data} />}
        {activeTab === 'learn' && <Learn />}

        {activeTab === 'optimizer' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Controls */}
            <Card className="lg:col-span-1 h-fit bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-slate-200">Parameters</CardTitle>
                <CardDescription className="text-slate-400">Configure your portfolio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Tickers */}
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
                            className="bg-slate-950 border-slate-700 text-slate-200 focus-visible:ring-blue-500"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTicker(idx)}
                            disabled={tickers.length <= 2}
                            className="text-slate-500 hover:text-red-400 hover:bg-red-400/10"
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
                              className="h-7 text-xs bg-slate-950 border-slate-700 text-slate-300"
                              value={weightConstraints[ticker]?.min || ''}
                              onChange={(e) => handleConstraintChange(ticker, 'min', e.target.value)}
                            />
                          </div>
                          <div className="w-1/2">
                            <Label className="text-xs text-slate-500">Max %</Label>
                            <Input
                              type="number"
                              placeholder="100"
                              className="h-7 text-xs bg-slate-950 border-slate-700 text-slate-300"
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
                    className="w-full border-dashed border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 bg-transparent"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Ticker
                  </Button>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="startYear" className="text-slate-300 text-xs">Start Year</Label>
                    <Input id="startYear" type="number" min="2010" max="2026" value={startYear} onChange={(e) => setStartYear(e.target.value)} className="bg-slate-950 border-slate-700 text-slate-200 focus-visible:ring-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endYear" className="text-slate-300 text-xs">End Year</Label>
                    <Input id="endYear" type="number" min="2010" max="2026" value={endYear} onChange={(e) => setEndYear(e.target.value)} className="bg-slate-950 border-slate-700 text-slate-200 focus-visible:ring-blue-500" />
                  </div>
                </div>

                {/* Period */}
                <div className="space-y-1.5">
                  <Label htmlFor="period" className="text-slate-300 text-xs">Period</Label>
                  <Select id="period" value={period} onChange={(e) => setPeriod(e.target.value)}>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="MoM">Monthly (MoM)</option>
                    <option value="YoY">Yearly (YoY)</option>
                  </Select>
                </div>

                {/* Optimization Model */}
                <div className="space-y-1.5">
                  <Label htmlFor="optimizationModel" className="text-slate-300 text-xs">Optimization Model</Label>
                  <Select id="optimizationModel" value={optimizationModel} onChange={(e) => setOptimizationModel(e.target.value)}>
                    <option value="mean-variance">Mean-Variance (Max Sharpe)</option>
                    <option value="risk-parity">Risk Parity</option>
                  </Select>
                </div>

                {/* Rebalance & Tx Cost */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rebalanceFreq" className="text-slate-300 text-xs">Rebalance</Label>
                    <Select id="rebalanceFreq" value={rebalanceFreq} onChange={(e) => setRebalanceFreq(e.target.value)}>
                      <option value="none">None</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="transactionCost" className="text-slate-300 text-xs">Tx Cost (%)</Label>
                    <Input id="transactionCost" type="number" step="0.01" value={transactionCost} onChange={(e) => setTransactionCost(e.target.value)} className="bg-slate-950 border-slate-700 text-slate-200 focus-visible:ring-blue-500" />
                  </div>
                </div>

                {/* Risk-Free Rate */}
                <div className="space-y-1.5">
                  <Label htmlFor="riskFreeRate" className="text-slate-300 text-xs">Risk-Free Rate (%)</Label>
                  <Input id="riskFreeRate" type="number" step="0.01" value={riskFreeRate} onChange={(e) => setRiskFreeRate(e.target.value)} className="bg-slate-950 border-slate-700 text-slate-200 focus-visible:ring-blue-500" placeholder="e.g. 6.25 for BI Rate" />
                </div>

                {/* Calculate Button */}
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300"
                  onClick={handleCalculate}
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {loading ? 'Calculating...' : 'Calculate Frontier'}
                </Button>

                {error && (
                  <div className="p-3 text-sm text-red-400 bg-red-950/30 rounded-lg border border-red-900/50">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-8">
              {data ? (
                <>
                  <EfficientFrontierChart data={data} optimizationModel={optimizationModel} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PortfolioCard portfolio={data.selectedPortfolio} variant="selected" optimizationModel={optimizationModel} />
                    <PortfolioCard portfolio={data.minVol} variant="minVol" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AssetPerformanceTable assets={data.assets} />
                    <CorrelationMatrixTable assets={data.assets} correlationMatrix={data.correlationMatrix} />
                  </div>

                  <CumulativeReturnsChart cumulativeReturns={data.cumulativeReturns} optimizationModel={optimizationModel} />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DrawdownChart drawdownSeries={data.drawdownSeries} />
                    <RollingMetricsChart rollingMetrics={data.rollingMetrics} />
                  </div>

                  <StressTestsPanel stressTests={data.stressTests} />

                  <Top100Table portfolios={data.top100Portfolios} assets={data.assets} />
                </>
              ) : (
                <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-900/10 backdrop-blur-sm">
                  <div className="p-4 bg-blue-500/5 rounded-full mb-6">
                    <Activity className="w-16 h-16 opacity-15 text-blue-500" />
                  </div>
                  <p className="text-lg font-medium text-slate-400 mb-2">No Data Yet</p>
                  <p className="text-sm text-slate-600 max-w-sm text-center">
                    Enter your portfolio parameters on the left and click &ldquo;Calculate Frontier&rdquo; to see optimized portfolios.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 border-t border-slate-800/50">
          <p className="text-xs text-slate-600">
            Nusantara Quant &mdash; Modern Portfolio Theory for Indonesian Markets
          </p>
        </footer>
      </div>

      <AIAssistant contextData={data} />
    </div>
  );
}
