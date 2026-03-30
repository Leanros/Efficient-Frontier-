import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { BookOpen, TrendingUp, ShieldAlert, Target, Activity, BarChart3, ArrowDownToLine } from 'lucide-react';

export function Learn() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-blue-400 flex items-center">
            <BookOpen className="w-6 h-6 mr-3" />
            Mengenal Efficient Frontier & Metrik Risiko
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Panduan lengkap memahami Teori Portofolio Modern dan Manajemen Risiko
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 text-slate-300">
          <section className="space-y-3">
            <h3 className="text-xl font-semibold text-slate-200 border-b border-slate-800 pb-2">Apa itu Efficient Frontier?</h3>
            <p className="leading-relaxed">
              Efficient Frontier (Garis Batas Efisien) adalah konsep dasar dalam <strong>Modern Portfolio Theory (MPT)</strong> yang diperkenalkan oleh <strong>Harry Markowitz</strong> pada tahun 1952 (yang membuatnya memenangkan Hadiah Nobel Ekonomi).
            </p>
            <p className="leading-relaxed">
              Konsep ini menunjukkan serangkaian portofolio optimal yang menawarkan tingkat pengembalian (return) yang diharapkan tertinggi untuk tingkat risiko tertentu, atau risiko terendah untuk tingkat pengembalian tertentu. Portofolio yang berada di bawah garis Efficient Frontier dianggap sub-optimal karena tidak memberikan return yang cukup untuk tingkat risiko yang diambil.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-200 border-b border-slate-800 pb-2">Aspek-Aspek Utama & Rumus</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <div className="p-5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-emerald-500/50 transition-colors">
                <div className="flex items-center mb-3">
                  <TrendingUp className="w-6 h-6 text-emerald-400 mr-3" />
                  <h4 className="text-lg font-medium text-slate-200">Expected Return</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">Perkiraan keuntungan yang akan didapatkan dari sebuah investasi di masa depan. Dihitung berdasarkan rata-rata return historis berbobot dari aset-aset dalam portofolio.</p>
                <div className="bg-slate-900 p-3 rounded-md border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                  E(R_p) = Σ (w_i × E(R_i))
                  <br/><br/>
                  <span className="text-slate-500">
                  Dimana:<br/>
                  w_i = bobot aset i dalam portofolio<br/>
                  E(R_i) = expected return aset i
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-amber-500/50 transition-colors">
                <div className="flex items-center mb-3">
                  <ShieldAlert className="w-6 h-6 text-amber-400 mr-3" />
                  <h4 className="text-lg font-medium text-slate-200">Risk (Volatility / Standard Deviation)</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">Ukuran ketidakpastian atau fluktuasi harga aset yang direpresentasikan dengan standar deviasi. Semakin tinggi volatilitas, semakin tinggi risiko investasi tersebut.</p>
                <div className="bg-slate-900 p-3 rounded-md border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto">
                  σ_p = √[ ΣΣ (w_i × w_j × Cov(i,j)) ]
                  <br/><br/>
                  <span className="text-slate-500">
                  Dimana:<br/>
                  w_i, w_j = bobot aset i dan j<br/>
                  Cov(i,j) = kovarians antara return aset i dan j
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center mb-3">
                  <Target className="w-6 h-6 text-cyan-400 mr-3" />
                  <h4 className="text-lg font-medium text-slate-200">Sharpe Ratio</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">Rasio yang mengukur kinerja investasi disesuaikan dengan risikonya. Dihitung dengan mengurangi risk-free rate dari return portofolio, lalu dibagi dengan volatilitas.</p>
                <div className="bg-slate-900 p-3 rounded-md border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
                  Sharpe = (R_p - R_f) / σ_p
                  <br/><br/>
                  <span className="text-slate-500">
                  Dimana:<br/>
                  R_p = return portofolio<br/>
                  R_f = risk-free rate (misal: Yield SUN 10 Tahun)<br/>
                  σ_p = standar deviasi portofolio
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-indigo-500/50 transition-colors">
                <div className="flex items-center mb-3">
                  <Activity className="w-6 h-6 text-indigo-400 mr-3" />
                  <h4 className="text-lg font-medium text-slate-200">Beta (β) terhadap IHSG</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">Mengukur sensitivitas pergerakan suatu aset atau portofolio terhadap pergerakan pasar secara keseluruhan (IHSG). Beta &gt; 1 berarti lebih volatil dari pasar.</p>
                <div className="bg-slate-900 p-3 rounded-md border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
                  β_i = Cov(R_i, R_m) / Var(R_m)
                  <br/><br/>
                  <span className="text-slate-500">
                  Dimana:<br/>
                  R_i = return aset/portofolio<br/>
                  R_m = return pasar (IHSG)
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-red-500/50 transition-colors">
                <div className="flex items-center mb-3">
                  <BarChart3 className="w-6 h-6 text-red-400 mr-3" />
                  <h4 className="text-lg font-medium text-slate-200">Value at Risk (VaR) & CVaR</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-3"><strong>VaR:</strong> Estimasi kerugian maksimum yang mungkin terjadi pada tingkat kepercayaan tertentu (misal 95%).<br/><strong>CVaR:</strong> Rata-rata kerugian yang melebihi VaR (kerugian di ekor distribusi).</p>
                <div className="bg-slate-900 p-3 rounded-md border border-slate-800 font-mono text-xs text-red-300 overflow-x-auto">
                  VaR_α = Persentil ke-α dari distribusi return
                  <br/>
                  CVaR_α = E[R | R ≤ VaR_α]
                  <br/><br/>
                  <span className="text-slate-500">
                  Dimana α = tingkat signifikansi (misal 5% untuk confidence 95%)
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-orange-500/50 transition-colors">
                <div className="flex items-center mb-3">
                  <ArrowDownToLine className="w-6 h-6 text-orange-400 mr-3" />
                  <h4 className="text-lg font-medium text-slate-200">Maximum Drawdown (Max DD)</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">Penurunan maksimum dari titik puncak (peak) ke titik terendah (trough) selama periode tertentu. Mengukur risiko kerugian terbesar yang pernah dialami.</p>
                <div className="bg-slate-900 p-3 rounded-md border border-slate-800 font-mono text-xs text-orange-300 overflow-x-auto">
                  Max DD = Max [ (Peak - Trough) / Peak ]
                  <br/><br/>
                  <span className="text-slate-500">
                  Dimana:<br/>
                  Peak = nilai tertinggi sebelum penurunan<br/>
                  Trough = nilai terendah sebelum mencapai peak baru
                  </span>
                </div>
              </div>

            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
