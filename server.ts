import express from 'express';
import { createServer as createViteServer } from 'vite';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/efficient-frontier', async (req, res) => {
    try {
      const { 
        tickers, 
        startYear, 
        endYear, 
        period = 'MoM', 
        riskFreeRate = 0.0625,
        weightConstraints = {},
        optimizationModel = 'mean-variance',
        rebalanceFreq = 'none',
        transactionCost = 0
      } = req.body;

      if (!tickers || !Array.isArray(tickers) || tickers.length < 2) {
        return res.status(400).json({ error: 'At least 2 tickers are required.' });
      }

      const startDate = `${startYear}-01-01`;
      const endDate = `${endYear}-12-31`;

      let interval: '1d' | '1wk' | '1mo' = '1mo';
      let periodsPerYear = 12;

      if (period === 'Daily') {
        interval = '1d';
        periodsPerYear = 252;
      } else if (period === 'Weekly') {
        interval = '1wk';
        periodsPerYear = 52;
      } else if (period === 'MoM') {
        interval = '1mo';
        periodsPerYear = 12;
      } else if (period === 'YoY') {
        interval = '1mo';
        periodsPerYear = 1;
      }

      const fetchTickers = [...tickers.map((t: string) => `${t.trim().toUpperCase()}.JK`), '^JKSE'];
      const historicalData: Record<string, any[]> = {};

      for (const ticker of fetchTickers) {
        try {
          const data = await yahooFinance.historical(ticker, {
            period1: startDate,
            period2: endDate,
            interval: interval === '1mo' && period === 'YoY' ? '1mo' : interval,
          });
          historicalData[ticker] = data;
        } catch (e) {
          console.error(`Failed to fetch data for ${ticker}`, e);
          historicalData[ticker] = [];
        }
      }

      const ihsgData = historicalData['^JKSE'];
      if (!ihsgData || ihsgData.length === 0) {
        return res.status(400).json({ error: 'Could not fetch IHSG data (^JKSE)' });
      }

      let commonDates = ihsgData.map(d => d.date.toISOString().split('T')[0]);

      for (const ticker of fetchTickers) {
        if (!historicalData[ticker] || historicalData[ticker].length === 0) {
          return res.status(400).json({ error: `No data found for ${ticker.replace('.JK', '')}` });
        }
        const tickerDates = historicalData[ticker].map(d => d.date.toISOString().split('T')[0]);
        commonDates = commonDates.filter(d => tickerDates.includes(d));
      }

      if (commonDates.length < 2) {
        return res.status(400).json({ error: 'Not enough overlapping historical data for these tickers.' });
      }

      if (period === 'YoY') {
        const yearMap = new Map<string, string>();
        for (const d of commonDates) {
          const year = d.substring(0, 4);
          yearMap.set(year, d);
        }
        commonDates = Array.from(yearMap.values()).sort();
      }

      const prices: Record<string, number[]> = {};
      for (const ticker of fetchTickers) {
        prices[ticker] = [];
        const dataMap = new Map(historicalData[ticker].map(d => [d.date.toISOString().split('T')[0], d.adjClose || d.close]));
        for (const d of commonDates) {
          prices[ticker].push(dataMap.get(d) as number);
        }
      }

      const returns: Record<string, number[]> = {};
      for (const ticker of fetchTickers) {
        returns[ticker] = [];
        for (let i = 1; i < prices[ticker].length; i++) {
          const prev = prices[ticker][i - 1];
          const curr = prices[ticker][i];
          returns[ticker].push((curr - prev) / prev);
        }
      }
      
      const returnDates = commonDates.slice(1);

      const calculateVaR = (rets: number[], percentile: number = 0.05) => {
        const sorted = [...rets].sort((a, b) => a - b);
        const index = Math.floor(percentile * sorted.length);
        return sorted[index];
      };

      const calculateCVaR = (rets: number[], percentile: number = 0.05) => {
        const sorted = [...rets].sort((a, b) => a - b);
        const index = Math.floor(percentile * sorted.length);
        const tail = sorted.slice(0, index);
        if (tail.length === 0) return sorted[0] || 0;
        return tail.reduce((a, b) => a + b, 0) / tail.length;
      };

      const calculateMaxDrawdown = (rets: number[]) => {
        let peak = 1;
        let maxDrawdown = 0;
        let current = 1;
        for (const r of rets) {
          current *= (1 + r);
          if (current > peak) peak = current;
          const drawdown = (peak - current) / peak;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
        return maxDrawdown;
      };

      const calculateBeta = (assetRets: number[], marketRets: number[]) => {
        const meanAsset = assetRets.reduce((a, b) => a + b, 0) / assetRets.length;
        const meanMarket = marketRets.reduce((a, b) => a + b, 0) / marketRets.length;
        let cov = 0;
        let varMarket = 0;
        for (let i = 0; i < assetRets.length; i++) {
          cov += (assetRets[i] - meanAsset) * (marketRets[i] - meanMarket);
          varMarket += Math.pow(marketRets[i] - meanMarket, 2);
        }
        return varMarket === 0 ? 0 : cov / varMarket;
      };

      const numAssets = tickers.length;
      const meanReturns = [];
      const assetMetrics = [];
      const ihsgReturns = returns['^JKSE'];

      for (let i = 0; i < numAssets; i++) {
        const ticker = `${tickers[i].trim().toUpperCase()}.JK`;
        const rets = returns[ticker];
        const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
        meanReturns.push(mean * periodsPerYear);

        const var95 = calculateVaR(rets);
        const cvar95 = calculateCVaR(rets);
        const maxDrawdown = calculateMaxDrawdown(rets);
        const beta = calculateBeta(rets, ihsgReturns);

        assetMetrics.push({
          ticker: tickers[i],
          meanReturn: mean * periodsPerYear,
          var95,
          cvar95,
          maxDrawdown,
          beta
        });
      }

      const covMatrix: number[][] = [];
      for (let i = 0; i < numAssets; i++) {
        covMatrix[i] = [];
        for (let j = 0; j < numAssets; j++) {
          let cov = 0;
          const tickerI = `${tickers[i].trim().toUpperCase()}.JK`;
          const tickerJ = `${tickers[j].trim().toUpperCase()}.JK`;
          const meanI = returns[tickerI].reduce((a, b) => a + b, 0) / returns[tickerI].length;
          const meanJ = returns[tickerJ].reduce((a, b) => a + b, 0) / returns[tickerJ].length;
          for (let t = 0; t < returns[tickerI].length; t++) {
            cov += (returns[tickerI][t] - meanI) * (returns[tickerJ][t] - meanJ);
          }
          cov /= (returns[tickerI].length - 1);
          covMatrix[i][j] = cov * periodsPerYear;
        }
      }

      const corrMatrix: number[][] = [];
      for (let i = 0; i < numAssets; i++) {
        corrMatrix[i] = [];
        for (let j = 0; j < numAssets; j++) {
          const stdI = Math.sqrt(covMatrix[i][i]);
          const stdJ = Math.sqrt(covMatrix[j][j]);
          corrMatrix[i][j] = (stdI === 0 || stdJ === 0) ? 0 : covMatrix[i][j] / (stdI * stdJ);
        }
      }

      const numPortfolios = 10000;
      const portfolios = [];

      for (let i = 0; i < numPortfolios; i++) {
        let weights = new Array(numAssets).fill(0);
        let remaining = 1;
        
        // Apply min constraints
        for (let j = 0; j < numAssets; j++) {
          const ticker = tickers[j];
          const min = weightConstraints[ticker]?.min !== undefined ? weightConstraints[ticker].min / 100 : 0;
          weights[j] = min;
          remaining -= min;
        }
        
        if (remaining > 0) {
          let rands = new Array(numAssets).fill(0).map(() => Math.random());
          let randSum = rands.reduce((a,b)=>a+b,0);
          rands = rands.map(r => r/randSum);
          
          for (let j = 0; j < numAssets; j++) {
            const ticker = tickers[j];
            const max = weightConstraints[ticker]?.max !== undefined ? weightConstraints[ticker].max / 100 : 1;
            let add = rands[j] * remaining;
            if (weights[j] + add > max) {
              add = max - weights[j];
            }
            weights[j] += add;
          }
          
          // Normalize again to ensure sum is exactly 1
          let finalSum = weights.reduce((a,b)=>a+b,0);
          weights = weights.map(w => w/finalSum);
        }

        let portReturn = 0;
        for (let j = 0; j < numAssets; j++) {
          portReturn += weights[j] * meanReturns[j];
        }

        let portVar = 0;
        const riskContributions = [];
        for (let j = 0; j < numAssets; j++) {
          let covSum = 0;
          for (let k = 0; k < numAssets; k++) {
            covSum += weights[k] * covMatrix[j][k];
            portVar += weights[j] * weights[k] * covMatrix[j][k];
          }
          riskContributions.push(weights[j] * covSum);
        }
        const portRisk = Math.sqrt(portVar);
        const sharpe = (portReturn - riskFreeRate) / portRisk;
        
        // Calculate variance of risk contributions for Risk Parity
        const rcMean = riskContributions.reduce((a,b)=>a+b,0) / numAssets;
        const rcVar = riskContributions.reduce((a,b)=>a+Math.pow(b-rcMean,2),0);

        const weightObj: Record<string, number> = {};
        tickers.forEach((t: string, idx: number) => {
          weightObj[t] = weights[idx];
        });

        const portRets = [];
        const firstTicker = `${tickers[0].trim().toUpperCase()}.JK`;
        for (let t = 0; t < returns[firstTicker].length; t++) {
          let r = 0;
          for (let j = 0; j < numAssets; j++) {
            const tickerJ = `${tickers[j].trim().toUpperCase()}.JK`;
            r += weights[j] * returns[tickerJ][t];
          }
          portRets.push(r);
        }

        portfolios.push({
          weights: weightObj,
          weightsArray: weights,
          return: portReturn,
          risk: portRisk,
          sharpe,
          rcVar,
          var95: calculateVaR(portRets),
          cvar95: calculateCVaR(portRets),
          maxDrawdown: calculateMaxDrawdown(portRets),
          beta: calculateBeta(portRets, ihsgReturns),
          portRets
        });
      }

      let maxSharpe = portfolios[0];
      let minVol = portfolios[0];
      let riskParity = portfolios[0];

      for (const p of portfolios) {
        if (p.sharpe > maxSharpe.sharpe) maxSharpe = p;
        if (p.risk < minVol.risk) minVol = p;
        if (p.rcVar < riskParity.rcVar) riskParity = p;
      }
      
      let selectedPortfolio = maxSharpe;
      if (optimizationModel === 'risk-parity') {
        selectedPortfolio = riskParity;
      }

      portfolios.sort((a, b) => b.sharpe - a.sharpe);
      const top100Portfolios = portfolios.slice(0, 100).map(p => {
        const { portRets, weightsArray, rcVar, ...rest } = p;
        return rest;
      });

      const scatterPoints = portfolios.slice(0, 500).map(p => ({
        risk: p.risk * 100,
        return: p.return * 100,
        sharpe: p.sharpe
      }));

      const selectedRets = selectedPortfolio.portRets;
      const cumulativeReturns = [];
      let cumPort = 1;
      let cumIHSG = 1;
      
      let currentWeights = [...selectedPortfolio.weightsArray];
      const targetWeights = [...selectedPortfolio.weightsArray];
      
      let daysSinceRebalance = 0;
      let rebalanceInterval = Infinity;
      if (period === 'Daily') {
          if (rebalanceFreq === 'monthly') rebalanceInterval = 21;
          if (rebalanceFreq === 'quarterly') rebalanceInterval = 63;
          if (rebalanceFreq === 'yearly') rebalanceInterval = 252;
      } else if (period === 'Weekly') {
          if (rebalanceFreq === 'monthly') rebalanceInterval = 4;
          if (rebalanceFreq === 'quarterly') rebalanceInterval = 13;
          if (rebalanceFreq === 'yearly') rebalanceInterval = 52;
      } else if (period === 'MoM') {
          if (rebalanceFreq === 'monthly') rebalanceInterval = 1;
          if (rebalanceFreq === 'quarterly') rebalanceInterval = 3;
          if (rebalanceFreq === 'yearly') rebalanceInterval = 12;
      } else if (period === 'YoY') {
          rebalanceInterval = 1;
      }

      const drawdownSeries = [];
      let peak = 1;

      for (let i = 0; i < returnDates.length; i++) {
        let periodRet = 0;
        for (let j = 0; j < numAssets; j++) {
            const tickerJ = `${tickers[j].trim().toUpperCase()}.JK`;
            periodRet += currentWeights[j] * returns[tickerJ][i];
        }
        
        cumPort *= (1 + periodRet);
        cumIHSG *= (1 + ihsgReturns[i]);
        
        let newWeightsSum = 0;
        for (let j = 0; j < numAssets; j++) {
            const tickerJ = `${tickers[j].trim().toUpperCase()}.JK`;
            currentWeights[j] = currentWeights[j] * (1 + returns[tickerJ][i]);
            newWeightsSum += currentWeights[j];
        }
        currentWeights = currentWeights.map(w => w / newWeightsSum);
        
        daysSinceRebalance++;
        if (daysSinceRebalance >= rebalanceInterval) {
            let turnover = 0;
            for (let j = 0; j < numAssets; j++) {
                turnover += Math.abs(currentWeights[j] - targetWeights[j]);
            }
            cumPort *= (1 - (turnover * transactionCost));
            currentWeights = [...targetWeights];
            daysSinceRebalance = 0;
        }

        cumulativeReturns.push({
          date: returnDates[i],
          portfolio: (cumPort - 1) * 100,
          ihsg: (cumIHSG - 1) * 100
        });
        
        if (cumPort > peak) peak = cumPort;
        drawdownSeries.push({
            date: returnDates[i],
            drawdown: ((cumPort - peak) / peak) * 100
        });
      }
      
      const rollingMetrics = [];
      const windowSize = periodsPerYear;
      if (returnDates.length > windowSize) {
          for (let i = windowSize; i < returnDates.length; i++) {
              const windowRets = selectedRets.slice(i - windowSize, i);
              const mean = windowRets.reduce((a,b)=>a+b,0) / windowSize;
              const vol = Math.sqrt(windowRets.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(windowSize-1)) * Math.sqrt(periodsPerYear);
              const sharpe = (mean * periodsPerYear - riskFreeRate) / vol;
              rollingMetrics.push({
                  date: returnDates[i],
                  sharpe,
                  volatility: vol * 100
              });
          }
      }
      
      const stressTests = {
          covid: { return: 0, maxDrawdown: 0 },
          gfc: { return: 0, maxDrawdown: 0 }
      };
      
      const calculateStress = (startDateStr: string, endDateStr: string) => {
          let startIdx = returnDates.findIndex(d => d >= startDateStr);
          let endIdx = returnDates.findIndex(d => d > endDateStr);
          if (endIdx === -1) endIdx = returnDates.length;
          
          if (startIdx !== -1 && startIdx < endIdx) {
              const rets = selectedRets.slice(startIdx, endIdx);
              let cum = 1;
              let p = 1;
              let md = 0;
              for (const r of rets) {
                  cum *= (1+r);
                  if (cum > p) p = cum;
                  const d = (p - cum)/p;
                  if (d > md) md = d;
              }
              return { return: (cum - 1) * 100, maxDrawdown: md * 100 };
          }
          return null;
      };
      
      const covidStress = calculateStress('2020-02-01', '2020-04-30');
      if (covidStress) stressTests.covid = covidStress;
      
      const gfcStress = calculateStress('2008-09-01', '2009-03-31');
      if (gfcStress) stressTests.gfc = gfcStress;

      delete (maxSharpe as any).portRets;
      delete (maxSharpe as any).weightsArray;
      delete (maxSharpe as any).rcVar;
      delete (minVol as any).portRets;
      delete (minVol as any).weightsArray;
      delete (minVol as any).rcVar;
      delete (riskParity as any).portRets;
      delete (riskParity as any).weightsArray;
      delete (riskParity as any).rcVar;

      res.json({
        maxSharpe,
        minVol,
        riskParity,
        selectedPortfolio: optimizationModel === 'risk-parity' ? riskParity : maxSharpe,
        scatterPoints,
        top100Portfolios,
        cumulativeReturns,
        drawdownSeries,
        rollingMetrics,
        stressTests,
        assets: tickers.map((ticker, i) => {
          const vol = Math.sqrt(covMatrix[i][i]);
          return {
            ...assetMetrics[i],
            volatility: vol,
            sharpe: (meanReturns[i] - riskFreeRate) / vol
          };
        }),
        correlationMatrix: corrMatrix
      });
    } catch (error: any) {
      console.error('Error calculating efficient frontier:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  app.post('/api/screener', async (req, res) => {
    try {
      const { minRoe = 0, maxPer = 100, minDivYield = 0 } = req.body;
      const popularTickers = ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'UNVR', 'ICBP', 'INDF', 'KLBF', 'PGAS', 'PTBA', 'ADRO', 'UNTR', 'ITMG', 'CPIN', 'INTP', 'SMGR', 'ANTM', 'TPIA', 'BRPT', 'INKP', 'TKIM', 'EXCL', 'ISAT', 'MDKA', 'AMRT', 'GOTO', 'ARTO', 'HRUM'];
      
      const results = [];
      for (const ticker of popularTickers) {
        try {
          const quote = await yahooFinance.quote(`${ticker}.JK`);
          const roe = quote.trailingPE ? (quote.priceToBook / quote.trailingPE) * 100 : 0; // Approximation if ROE is missing
          const per = quote.trailingPE || 0;
          const divYield = quote.dividendYield || 0;
          
          if (roe >= minRoe && per <= maxPer && divYield >= minDivYield) {
            results.push({
              ticker,
              name: quote.shortName || ticker,
              price: quote.regularMarketPrice,
              roe: roe,
              per: per,
              divYield: divYield
            });
          }
        } catch (e) {
          // ignore
        }
      }
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
