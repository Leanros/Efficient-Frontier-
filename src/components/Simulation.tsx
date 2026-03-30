import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calculator, AlertCircle, TrendingUp, ShieldAlert } from 'lucide-react';

interface SimulationProps {
  data: any | null;
}

export function Simulation({ data }: SimulationProps) {
  const [amount, setAmount] = useState<string>('10000000');
  const [duration, setDuration] = useState<string>('1');
  const [durationUnit, setDurationUnit] = useState<'years' | 'months'>('years');

  if (!data) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20 backdrop-blur-sm animate-in fade-in">
        <AlertCircle className="w-12 h-12 mb-4 opacity-20 text-blue-500" />
        <p>Silakan hitung Efficient Frontier terlebih dahulu di menu Optimizer.</p>
      </div>
    );
  }

  const principal = parseFloat(amount) || 0;
  const time = parseFloat(duration) || 0;
  const years = durationUnit === 'years' ? time : time / 12;

  // Expected return is annualized.
  // Future Value = Principal * (1 + r)^t
  const calcFV = (rate: number) => principal * Math.pow(1 + rate, years);
  
  const maxSharpeFV = calcFV(data.maxSharpe.return);
  const minVolFV = calcFV(data.minVol.return);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-200 flex items-center">
            <Calculator className="w-6 h-6 mr-3 text-blue-400" />
            Simulasi Investasi
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Hitung proyeksi return dari portofolio optimal Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-950/50 rounded-xl border border-slate-800">
            <div className="space-y-2">
              <Label className="text-slate-300 font-medium">Modal Awal (Rp)</Label>
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-200 focus-visible:ring-blue-500 text-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 font-medium">Jangka Waktu</Label>
              <Input 
                type="number" 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-200 focus-visible:ring-blue-500 text-lg h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 font-medium">Satuan Waktu</Label>
              <select 
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as any)}
                className="flex h-12 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-lg text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="years">Tahun</option>
                <option value="months">Bulan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <Card className="bg-slate-950/80 border-cyan-900/50 shadow-[0_0_20px_rgba(34,211,238,0.05)] hover:border-cyan-500/50 transition-colors">
              <CardHeader className="pb-4 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-cyan-400 text-xl">Proyeksi Max Sharpe</CardTitle>
                  <TrendingUp className="w-6 h-6 text-cyan-500" />
                </div>
                <CardDescription className="text-slate-400 text-sm mt-1">Return Tahunan: {(data.maxSharpe.return * 100).toFixed(2)}%</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-1 uppercase tracking-wider font-medium">Nilai Akhir</p>
                    <p className="text-4xl font-bold text-slate-200 tracking-tight">{formatCurrency(maxSharpeFV)}</p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <p className="text-sm text-emerald-500/80 mb-1 font-medium">Total Keuntungan</p>
                    <p className="text-2xl font-semibold text-emerald-400">+{formatCurrency(maxSharpeFV - principal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/80 border-indigo-900/50 shadow-[0_0_20px_rgba(129,140,248,0.05)] hover:border-indigo-500/50 transition-colors">
              <CardHeader className="pb-4 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-indigo-400 text-xl">Proyeksi Min Volatility</CardTitle>
                  <ShieldAlert className="w-6 h-6 text-indigo-500" />
                </div>
                <CardDescription className="text-slate-400 text-sm mt-1">Return Tahunan: {(data.minVol.return * 100).toFixed(2)}%</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-1 uppercase tracking-wider font-medium">Nilai Akhir</p>
                    <p className="text-4xl font-bold text-slate-200 tracking-tight">{formatCurrency(minVolFV)}</p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <p className="text-sm text-emerald-500/80 mb-1 font-medium">Total Keuntungan</p>
                    <p className="text-2xl font-semibold text-emerald-400">+{formatCurrency(minVolFV - principal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
