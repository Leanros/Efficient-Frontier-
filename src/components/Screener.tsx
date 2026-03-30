import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, Search, Filter } from 'lucide-react';

interface StockData {
  ticker: string;
  name: string;
  price: number;
  roe: number;
  per: number;
  divYield: number;
}

export function Screener() {
  const [minRoe, setMinRoe] = useState('15');
  const [maxPer, setMaxPer] = useState('15');
  const [minDivYield, setMinDivYield] = useState('3');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StockData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleScreen = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/screener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minRoe: parseFloat(minRoe),
          maxPer: parseFloat(maxPer),
          minDivYield: parseFloat(minDivYield) / 100
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch screener data');
      }

      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-blue-400 flex items-center">
            <Filter className="w-6 h-6 mr-3" />
            Fundamental Stock Screener
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Filter IDX stocks based on fundamental criteria before adding them to your portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-300">Min ROE (%)</Label>
              <Input 
                type="number" 
                value={minRoe} 
                onChange={(e) => setMinRoe(e.target.value)} 
                className="bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Max PER (x)</Label>
              <Input 
                type="number" 
                value={maxPer} 
                onChange={(e) => setMaxPer(e.target.value)} 
                className="bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Min Dividend Yield (%)</Label>
              <Input 
                type="number" 
                value={minDivYield} 
                onChange={(e) => setMinDivYield(e.target.value)} 
                className="bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>
          </div>

          <Button 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white" 
            onClick={handleScreen}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {loading ? 'Screening...' : 'Run Screener'}
          </Button>

          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-950/30 rounded-md border border-red-900/50">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Ticker</th>
                    <th className="px-4 py-3">Company Name</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">ROE</th>
                    <th className="px-4 py-3">PER</th>
                    <th className="px-4 py-3 rounded-tr-lg">Div Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((stock) => (
                    <tr key={stock.ticker} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-blue-400">{stock.ticker}</td>
                      <td className="px-4 py-3 text-slate-300">{stock.name}</td>
                      <td className="px-4 py-3 text-slate-300">{stock.price.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-emerald-400">{stock.roe.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-amber-400">{stock.per.toFixed(2)}x</td>
                      <td className="px-4 py-3 text-cyan-400">{(stock.divYield * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
