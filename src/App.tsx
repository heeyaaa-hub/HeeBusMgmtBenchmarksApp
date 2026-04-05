import { useState, useEffect } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type FinancialRow = Record<string, string>

const currencySymbols: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'CA$',
  SEK: 'kr',
}

function formatValue(amount: string, currency: string): string {
  const num = Number(amount).toLocaleString()
  const symbol = currencySymbols[currency] ?? currency
  if (currency === 'SEK') return `${num} ${symbol}`
  return `${symbol}${num}`
}

function formatPercent(value: string | number) {
  const num = Number(value)
  return isNaN(num) ? '—' : `${num.toFixed(2)}%`
}

const API_BASE = 'https://www.dolthub.com/api/v1alpha1/calvinw/BusMgmtBenchmarks?q='

function buildUrl(query: string) {
  return API_BASE + encodeURIComponent(query)
}

// ---------- CompanyPanel ----------
// This is a self-contained panel for one company.
// It has its own company menu, table, and chart.
// It receives the chosen metric from the parent.

interface CompanyPanelProps {
  id: string
  companyNames: string[]
  defaultCompany: string
  selectedMetric: string
  disabled: boolean
  company?: string
  onCompanyChange?: (v: string) => void
  hideCompanySelector?: boolean
  selectorLabel?: string
  includeNoneOption?: boolean
  showPlaceholder?: boolean
  afterSelectorContent?: React.ReactNode
  onDataReady?: (rows: FinancialRow[], company: string) => void
  onBenchmarkReady?: (data: Record<string, number>) => void
  showBenchmark?: boolean
}

function CompanyPanel({ id, companyNames, defaultCompany, selectedMetric, disabled, company, onCompanyChange, hideCompanySelector, selectorLabel, includeNoneOption, showPlaceholder, afterSelectorContent, onDataReady, onBenchmarkReady, showBenchmark }: CompanyPanelProps) {
  const isControlled = company !== undefined
  const [internalCompany, setInternalCompany] = useState(defaultCompany)
  const selectedCompany = isControlled ? company : internalCompany
  const [yearlyData, setYearlyData] = useState<FinancialRow[]>([])
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When defaultCompany is first set (after init load), apply it (uncontrolled only)
  useEffect(() => {
    if (!isControlled && defaultCompany) setInternalCompany(defaultCompany)
  }, [defaultCompany, isControlled])

  // Fetch all years for the selected company
  useEffect(() => {
    if (!selectedCompany) return
    setFetching(true)
    setError(null)

    const query = `
      SELECT f.*, c.currency, c.segment
      FROM financials f
      JOIN company_info c ON f.company_name = c.company
      WHERE f.company_name = '${selectedCompany}'
      ORDER BY f.year
    `
    fetch(buildUrl(query))
      .then(res => res.json())
      .then(data => {
        // After loading the raw data, compute ROA and its two DuPont components for every year.
        // Net Profit Margin = Net Income / Revenue  (how much profit from each dollar of sales)
        // Asset Turnover    = Revenue / Total Assets (how efficiently assets generate sales)
        // ROA               = Net Profit Margin × Asset Turnover = Net Income / Total Assets
        const rows = (data.rows as FinancialRow[]).map(row => {
          const netIncome   = Number(row['Net Profit'])
          const totalAssets = Number(row['Total Assets'])
          const revenue     = Number(row['Net Revenue'])
          const hasNI  = row['Net Profit']   !== '' && !isNaN(netIncome)
          const hasTA  = row['Total Assets'] !== '' && !isNaN(totalAssets) && totalAssets !== 0
          const hasRev = row['Net Revenue']  !== '' && !isNaN(revenue)
          return {
            ...row,
            _roa:               hasNI && hasTA                   ? String((netIncome / totalAssets) * 100) : '',
            _net_profit_margin: hasNI && hasRev && revenue !== 0 ? String((netIncome / revenue) * 100)     : '',
            _asset_turnover:    hasRev && hasTA                  ? String(revenue / totalAssets)            : '',
          }
        })
        setYearlyData(rows)
        setFetching(false)
        onDataReady?.(rows, selectedCompany)
      })
      .catch(() => {
        setError('Failed to load data from the database.')
        setFetching(false)
      })
  }, [selectedCompany])

  const currency = yearlyData[0]?.currency ?? ''
  const segment  = yearlyData[0]?.segment  ?? ''
  const isROA = selectedMetric === 'roa'

  // Benchmark data: maps year string → segment-average ROA %
  const [benchmarkByYear, setBenchmarkByYear] = useState<Record<string, number>>({})

  // Fetch segment benchmark data whenever segment is known (used for chart line + interpretation)
  useEffect(() => {
    if (!segment) return
    const query = `
      SELECT year, Return_on_Assets
      FROM segment_metrics
      WHERE segment = '${segment}'
      ORDER BY year
    `
    fetch(buildUrl(query))
      .then(res => res.json())
      .then(data => {
        const map: Record<string, number> = {}
        ;(data.rows as { year: string; Return_on_Assets: string }[]).forEach(r => {
          if (r.Return_on_Assets !== '' && r.Return_on_Assets != null) {
            map[String(r.year)] = Number(r.Return_on_Assets)
          }
        })
        setBenchmarkByYear(map)
        onBenchmarkReady?.(map)
      })
      .catch(() => { /* silently skip benchmark if fetch fails */ })
  }, [segment])

  const chartData = yearlyData.map(row => {
    const benchmarkVal = (showBenchmark && isROA && benchmarkByYear[row.year] != null)
      ? benchmarkByYear[row.year]
      : null
    return {
      year: row.year,
      value: isROA
        ? (row._roa !== '' ? Number(row._roa) : null)
        : (row[selectedMetric] !== '' ? Number(row[selectedMetric]) : null),
      benchmark: benchmarkVal,
    }
  })

  const handleCompanyChange = (val: string) => {
    if (!isControlled) setInternalCompany(val)
    onCompanyChange?.(val)
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Company menu for this panel */}
      {!hideCompanySelector && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <label htmlFor={`company-select-${id}`} className="text-lg font-medium">{selectorLabel ?? 'Company:'}</label>
          <select
            id={`company-select-${id}`}
            value={selectedCompany}
            onChange={e => handleCompanyChange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-lg"
            disabled={disabled}
          >
            {showPlaceholder && <option value="" disabled>Select a company</option>}
            {includeNoneOption && <option value="none">None</option>}
            {companyNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {afterSelectorContent}

      {!selectedCompany ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400 text-lg text-center">Select a metric and a company to begin your financial analysis.</p>
        </div>
      ) : (
        <>

      <h2 className="text-xl font-bold mb-1 text-center">
        {selectedCompany} — {isROA ? 'Return on Assets (ROA)' : selectedMetric}
      </h2>
      <p className="text-sm text-gray-500 mb-4 text-center">
        {isROA ? 'Figures shown as percentages (%) or ratios' : 'All figures in thousands (local currency)'}
      </p>

      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* ── ROA DuPont breakdown table ── */}
      {isROA ? (
        <>
          <div className={`transition-opacity duration-200 ${fetching ? 'opacity-40' : 'opacity-100'}`}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Year</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Net Profit Margin (%)</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">×</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Asset Turnover</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">=</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">ROA (%)</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((row, index) => (
                  <tr key={row.year} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-2">{row.year}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {row._net_profit_margin !== '' ? formatPercent(row._net_profit_margin) : '—'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-gray-400">×</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {row._asset_turnover !== '' ? Number(row._asset_turnover).toFixed(2) : '—'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-gray-400">=</td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                      {row._roa !== '' ? formatPercent(row._roa) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* ── Normal single-metric table ── */
        <table className={`w-full border-collapse transition-opacity duration-200 ${fetching ? 'opacity-40' : 'opacity-100'}`}>
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Year</th>
              <th className="border border-gray-300 px-4 py-2 text-right">{selectedMetric} (thousands)</th>
            </tr>
          </thead>
          <tbody>
            {yearlyData.map((row, index) => (
              <tr key={row.year} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-4 py-2">{row.year}</td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  {row[selectedMetric] != null && row[selectedMetric] !== ''
                    ? formatValue(row[selectedMetric], currency)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={`mt-8 transition-opacity duration-200 ${fetching ? 'opacity-40' : 'opacity-100'}`}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis
              tickFormatter={v => {
                if (isROA) return `${Number(v).toFixed(1)}%`
                const sym = currencySymbols[currency] ?? currency
                return currency === 'SEK'
                  ? `${Number(v).toLocaleString()} ${sym}`
                  : `${sym}${Number(v).toLocaleString()}`
              }}
              width={90}
            />
            <Tooltip
              formatter={(v, name) => {
                if (v == null) return ['—', name]
                if (name === 'Industry Average ROA') return [formatPercent(String(v)), name]
                return [
                  isROA ? formatPercent(String(v)) : formatValue(String(v), currency),
                  name,
                ]
              }}
              labelFormatter={label => `Year: ${label}`}
            />
            {(showBenchmark && isROA) && (
              <Legend
                verticalAlign="top"
                height={28}
                content={() => (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13, marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#3b82f6', borderRadius: 2 }} />
                      ROA
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 18, borderTop: '2px dashed #ef4444' }} />
                      Industry Average ROA
                    </span>
                  </div>
                )}
              />
            )}
            <Bar dataKey="value" name="ROA" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            {showBenchmark && isROA && (
              <Line
                type="monotone"
                dataKey="benchmark"
                name="Industry Average ROA"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

        </>
      )}
    </div>
  )
}

// ---------- ROA Interpretation (rule-based, no AI) ----------

interface PanelSnapshot {
  company: string
  rows: FinancialRow[]
  segment: string
}

interface InterpretationSection {
  title: string
  text: string
}

interface ValidRow {
  year: string
  npm: number   // net profit margin %
  at: number    // asset turnover ratio
  roa: number   // ROA %
}

function toValidRows(rows: FinancialRow[]): ValidRow[] {
  return rows
    .filter(r => r._roa !== '' && r._net_profit_margin !== '' && r._asset_turnover !== '')
    .map(r => ({
      year: r.year,
      npm: Number(r._net_profit_margin),
      at:  Number(r._asset_turnover),
      roa: Number(r._roa),
    }))
}

function classifyChange(change: number): 'improving' | 'declining' | 'stable' {
  if (change >  1) return 'improving'
  if (change < -1) return 'declining'
  return 'stable'
}

function analyzeTrend(valid: ValidRow[]) {
  if (valid.length < 2) return {
    direction: 'stable' as const, recentDirection: 'stable' as const,
    totalChange: 0, recentChange: 0,
    firstYear: valid[0]?.year ?? '', latestYear: valid[0]?.year ?? '',
    yearsCount: valid.length,
  }
  const first  = valid[0]
  const latest = valid[valid.length - 1]
  const prev   = valid[valid.length - 2]
  return {
    direction:       classifyChange(latest.roa - first.roa),
    recentDirection: classifyChange(latest.roa - prev.roa),
    totalChange:     latest.roa - first.roa,
    recentChange:    latest.roa - prev.roa,
    firstYear:       first.year,
    latestYear:      latest.year,
    yearsCount:      valid.length,
  }
}

function analyzeDriver(latest: ValidRow, prev: ValidRow | null) {
  const highNPM = latest.npm > 8
  const highAT  = latest.at  > 1.8

  let dominantFactor: 'margin' | 'turnover' | 'both' | 'neither'
  let strategy: string
  if      (highNPM && !highAT) { dominantFactor = 'margin';  strategy = 'margin-driven' }
  else if (!highNPM && highAT) { dominantFactor = 'turnover'; strategy = 'efficiency-driven' }
  else if (highNPM && highAT)  { dominantFactor = 'both';     strategy = 'strong on both margin and efficiency' }
  else                          { dominantFactor = 'neither';  strategy = 'under pressure on both margin and efficiency' }

  let driverOfChange: 'margin' | 'turnover' | null = null
  if (prev) {
    const npmRel = prev.npm !== 0 ? Math.abs((latest.npm - prev.npm) / prev.npm) : 0
    const atRel  = prev.at  !== 0 ? Math.abs((latest.at  - prev.at)  / prev.at)  : 0
    if      (npmRel > atRel  + 0.05) driverOfChange = 'margin'
    else if (atRel  > npmRel + 0.05) driverOfChange = 'turnover'
  }
  return { dominantFactor, strategy, driverOfChange }
}

function bmarkPosition(roa: number, bmarkROA: number, segment: string): string {
  const diff    = roa - bmarkROA
  const absDiff = Math.abs(diff)
  if (absDiff < 0.5) return `roughly in line with the ${segment} segment average (${formatPercent(bmarkROA)})`
  const qualifier = absDiff > 5 ? 'well ' : absDiff > 2 ? '' : 'slightly '
  const direction = diff > 0 ? 'above' : 'below'
  return `${qualifier}${direction} the ${segment} segment average of ${formatPercent(bmarkROA)} by ${formatPercent(absDiff)}`
}

function buildSingleInterpretation(
  snap: PanelSnapshot,
  benchmarkByYear: Record<string, number>
): InterpretationSection[] {
  const valid = toValidRows(snap.rows)
  if (valid.length === 0) return []

  const latest  = valid[valid.length - 1]
  const prev    = valid.length >= 2 ? valid[valid.length - 2] : null
  const trend   = analyzeTrend(valid)
  const driver  = analyzeDriver(latest, prev)
  const bmarkROA = benchmarkByYear[latest.year]
  const sections: InterpretationSection[] = []

  // ── Summary ──
  let summaryText = `In ${latest.year}, ${snap.company} achieved an ROA of ${formatPercent(latest.roa)}`
  if (bmarkROA != null) summaryText += ` — ${bmarkPosition(latest.roa, bmarkROA, snap.segment)}.`
  else                  summaryText += '.'
  sections.push({ title: 'Summary', text: summaryText })

  // ── Trend ──
  let trendText: string
  if (valid.length < 2) {
    trendText = 'Only one year of data is available — trend analysis is not yet possible.'
  } else if (trend.direction === 'stable' && trend.recentDirection === 'stable') {
    trendText = `ROA has remained relatively stable across ${trend.yearsCount} years of available data.`
  } else if (trend.direction === trend.recentDirection) {
    const word = trend.direction === 'improving' ? 'risen' : 'fallen'
    trendText = `ROA has ${word} consistently from ${formatPercent(valid[0].roa)} in ${trend.firstYear} to ${formatPercent(latest.roa)} in ${trend.latestYear}.`
  } else {
    const longWord = trend.direction === 'improving' ? 'improving' : 'declining'
    const recentWord = trend.recentDirection === 'improving'
      ? `recovered in ${trend.latestYear}` : `pulled back in ${trend.latestYear}`
    trendText = `ROA followed a ${longWord} trend overall (${formatPercent(valid[0].roa)} in ${trend.firstYear} → ${formatPercent(latest.roa)} in ${trend.latestYear}), though it ${recentWord}.`
  }
  sections.push({ title: 'Trend', text: trendText })

  // ── Driver ──
  let driverText = `${snap.company} is ${driver.strategy}, with a net profit margin of ${formatPercent(latest.npm)} and asset turnover of ${latest.at.toFixed(2)}x.`
  if (driver.driverOfChange && prev) {
    const changeWord = latest.roa > prev.roa ? 'improvement' : 'decline'
    if (driver.driverOfChange === 'margin') {
      const dir = latest.npm > prev.npm ? 'rising' : 'falling'
      driverText += ` The recent ${changeWord} was driven mainly by ${dir} margins (${formatPercent(prev.npm)} → ${formatPercent(latest.npm)}).`
    } else {
      const dir = latest.at > prev.at ? 'improved' : 'weakened'
      driverText += ` The recent ${changeWord} was driven mainly by ${dir} asset utilisation (${prev.at.toFixed(2)}x → ${latest.at.toFixed(2)}x).`
    }
  }
  sections.push({ title: 'Driver', text: driverText })

  // ── Strategy ──
  let strategyText: string
  if      (driver.dominantFactor === 'margin')   strategyText = `${snap.company} operates a high-margin strategy, prioritising profitability per sale over volume. This is sustainable as long as pricing power and brand strength are maintained.`
  else if (driver.dominantFactor === 'turnover') strategyText = `${snap.company} operates a high-volume, efficiency-led model — generating returns through rapid asset utilisation rather than wide margins. This is typical of discounters and high-turnover retailers.`
  else if (driver.dominantFactor === 'both')     strategyText = `${snap.company} benefits from both strong margins and high asset efficiency — a competitive combination that suggests a well-positioned and well-executed business model.`
  else                                            strategyText = `${snap.company} faces pressure on both margin and asset utilisation, which constrains ROA. Strengthening either dimension would meaningfully improve returns.`
  sections.push({ title: 'Strategy', text: strategyText })

  return sections
}

function buildComparisonInterpretation(
  snap1: PanelSnapshot, snap2: PanelSnapshot,
  bench1: Record<string, number>, bench2: Record<string, number>
): InterpretationSection[] {
  const v1 = toValidRows(snap1.rows)
  const v2 = toValidRows(snap2.rows)
  if (v1.length === 0 || v2.length === 0) return []

  const l1    = v1[v1.length - 1]
  const l2    = v2[v2.length - 1]
  const prev1 = v1.length >= 2 ? v1[v1.length - 2] : null
  const prev2 = v2.length >= 2 ? v2[v2.length - 2] : null
  const trend1  = analyzeTrend(v1)
  const trend2  = analyzeTrend(v2)
  const driver1 = analyzeDriver(l1, prev1)
  const driver2 = analyzeDriver(l2, prev2)
  const sections: InterpretationSection[] = []

  // ── Summary ──
  const roaDiff = Math.abs(l1.roa - l2.roa)
  const [better, worse, betterROA, worseROA] = l1.roa >= l2.roa
    ? [snap1.company, snap2.company, l1.roa, l2.roa]
    : [snap2.company, snap1.company, l2.roa, l1.roa]
  let summaryText: string
  if (roaDiff < 0.5) {
    summaryText = `In ${l1.year}, ${snap1.company} and ${snap2.company} show similar ROA performance (${formatPercent(l1.roa)} vs ${formatPercent(l2.roa)}).`
  } else {
    const strength = roaDiff > 5 ? 'significantly outperforms' : roaDiff > 2 ? 'outperforms' : 'edges ahead of'
    summaryText = `In ${l1.year}, ${better} ${strength} ${worse} in ROA — ${formatPercent(betterROA)} vs ${formatPercent(worseROA)}, a gap of ${formatPercent(roaDiff)}.`
  }
  sections.push({ title: 'Summary', text: summaryText })

  // ── vs Benchmark ──
  const b1 = bench1[l1.year]
  const b2 = bench2[l2.year]
  if (b1 != null || b2 != null) {
    const parts: string[] = []
    if (b1 != null) parts.push(`${snap1.company} is ${bmarkPosition(l1.roa, b1, snap1.segment)}`)
    if (b2 != null) parts.push(`${snap2.company} is ${bmarkPosition(l2.roa, b2, snap2.segment)}`)
    sections.push({ title: 'vs Benchmark', text: parts.join('; ') + '.' })
  }

  // ── Trend ──
  const trendDesc = (t: ReturnType<typeof analyzeTrend>, name: string, valid: ValidRow[]) => {
    if (t.direction === 'stable') return `${name}'s ROA has been stable`
    const word = t.direction === 'improving' ? 'improving' : 'declining'
    return `${name}'s ROA has been ${word} (${formatPercent(valid[0].roa)} in ${t.firstYear} → ${formatPercent(valid[valid.length - 1].roa)} in ${t.latestYear})`
  }
  let trendText: string
  if (trend1.direction === trend2.direction) {
    const shared = trend1.direction === 'improving' ? 'Both companies show improving ROA trends'
      : trend1.direction === 'declining' ? 'Both companies show declining ROA trends'
      : 'Both companies show stable ROA'
    trendText = `${shared}, though ${better} maintains the stronger level.`
  } else {
    trendText = `${trendDesc(trend1, snap1.company, v1)}, while ${trendDesc(trend2, snap2.company, v2)}.`
  }
  sections.push({ title: 'Trend', text: trendText })

  // ── Driver ──
  let driverText: string
  if (driver1.strategy === driver2.strategy) {
    driverText = `Both companies are ${driver1.strategy}, though ${better} converts this approach into stronger returns.`
  } else {
    driverText = `${snap1.company} is ${driver1.strategy} (margin: ${formatPercent(l1.npm)}, turnover: ${l1.at.toFixed(2)}x), while ${snap2.company} is ${driver2.strategy} (margin: ${formatPercent(l2.npm)}, turnover: ${l2.at.toFixed(2)}x).`
  }
  sections.push({ title: 'Driver', text: driverText })

  // ── Strategy ──
  const factorLabel = (f: 'margin' | 'turnover' | 'both' | 'neither') =>
    f === 'margin'   ? 'pricing power and brand strength' :
    f === 'turnover' ? 'volume and asset efficiency' :
    f === 'both'     ? 'a dual advantage in margin and efficiency' :
                       'challenges on both margin and efficiency'
  let strategyText: string
  if (driver1.dominantFactor !== driver2.dominantFactor) {
    strategyText = `The two companies represent different business models: ${snap1.company} relies on ${factorLabel(driver1.dominantFactor)}, while ${snap2.company} competes through ${factorLabel(driver2.dominantFactor)}.`
  } else if (driver1.dominantFactor === 'neither') {
    strategyText = `Both companies face similar challenges on margin and efficiency. Improving either dimension would strengthen returns for both.`
  } else {
    strategyText = `Both companies compete with a similar strategy (${driver1.strategy}). The performance gap likely reflects execution differences — ${better} is currently more effective at this approach.`
  }
  sections.push({ title: 'Strategy', text: strategyText })

  return sections
}

// ---------- App ----------

function App() {
  const [companyNames, setCompanyNames] = useState<string[]>([])
  const [metrics, setMetrics] = useState<string[]>([])
  const [selectedMetric, setSelectedMetric] = useState('')
  const [secondCompany, setSecondCompany] = useState('')
  const [initLoading, setInitLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panel1Snap, setPanel1Snap] = useState<PanelSnapshot | null>(null)
  const [panel2Snap, setPanel2Snap] = useState<PanelSnapshot | null>(null)
  const [panel1Benchmark, setPanel1Benchmark] = useState<Record<string, number>>({})
  const [panel2Benchmark, setPanel2Benchmark] = useState<Record<string, number>>({})
  const [showBenchmark, setShowBenchmark] = useState(false)
  const [roaExpanded, setRoaExpanded] = useState(false)

  // On first load: fetch one year to learn company names and metric names
  useEffect(() => {
    const query = `
      SELECT f.*, c.currency
      FROM financials f
      JOIN company_info c ON f.company_name = c.company
      WHERE f.year = 2024
    `
    fetch(buildUrl(query))
      .then(res => res.json())
      .then(data => {
        const rows: FinancialRow[] = data.rows
        if (rows.length > 0) {
          const names = rows.map(r => r.company_name)
          const allKeys = Object.keys(rows[0])
          const metricCols = allKeys.filter(k => k !== 'company_name' && k !== 'year' && k !== 'currency')
          setCompanyNames(names)
          setMetrics([...metricCols, 'roa'])
          setSelectedMetric(metricCols[0])
          setSecondCompany('none')
        }
        setInitLoading(false)
      })
      .catch(() => {
        setError('Failed to load data from the database.')
        setInitLoading(false)
      })
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 p-8">
      <h1 className="text-4xl font-bold">BusMgmtBenchmarksApp Template</h1>

      {/* Shared metric menu */}
      <div className="flex items-center gap-3">
        <label htmlFor="metric-select" className="text-lg font-medium">Metric:</label>
        <select
          id="metric-select"
          value={selectedMetric}
          onChange={e => setSelectedMetric(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-lg"
          disabled={initLoading}
        >
          {metrics.map(m => (
            <option key={m} value={m}>{m === 'roa' ? 'Return on Assets (ROA)' : m}</option>
          ))}
        </select>
      </div>

      {selectedMetric === 'roa' && (
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
          <button
            onClick={() => setRoaExpanded(prev => !prev)}
            className={`relative flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-all duration-300 ${
              roaExpanded ? 'w-full rounded-t' : 'rounded'
            }`}
          >
            <span>How is ROA calculated?</span>
            <span className={`transition-transform duration-300 ${roaExpanded ? 'rotate-180 absolute right-4' : ''}`}>▼</span>
          </button>
          <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${roaExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="bg-blue-50 border border-blue-200 border-t-0 rounded-b px-6 py-4 text-sm text-center space-y-3">
              <div className="text-gray-700 leading-relaxed space-y-1">
                <p className="whitespace-normal lg:whitespace-nowrap">Return on Assets (ROA) measures how efficiently a company uses its assets to generate profit.</p>
                <p className="whitespace-normal lg:whitespace-nowrap">It combines profitability (margin) and efficiency (asset turnover) into a single performance metric.</p>
              </div>
              <div className="border-t border-blue-200 pt-3 space-y-1">
                <p className="whitespace-normal lg:whitespace-nowrap"><span className="font-semibold">ROA</span> = Net Profit Margin &times; Asset Turnover</p>
                <p className="whitespace-normal lg:whitespace-nowrap"><span className="font-semibold">Net Profit Margin</span> = Net Income &divide; Revenue</p>
                <p className="whitespace-normal lg:whitespace-nowrap"><span className="font-semibold">Asset Turnover</span> = Revenue &divide; Total Assets</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {initLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!initLoading && !error && selectedMetric === 'roa' && (panel1Snap || secondCompany !== 'none') && (
        <div className="w-full flex justify-end">
          <button
            onClick={() => setShowBenchmark(prev => !prev)}
            className={`text-sm px-3 py-1.5 rounded border transition-colors ${
              showBenchmark
                ? 'bg-red-50 text-red-700 border-red-400 font-medium'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {showBenchmark ? '● ' : '○ '}Show Industry Benchmark
          </button>
        </div>
      )}

      {!initLoading && !error && (
        <div className={`w-full ${secondCompany !== 'none' ? 'flex flex-col lg:flex-row gap-10' : ''}`}>
          <CompanyPanel
            id="1"
            companyNames={companyNames}
            defaultCompany=""
            selectedMetric={selectedMetric}
            disabled={initLoading}
            showPlaceholder={true}
            afterSelectorContent={secondCompany === 'none' ? (
              <div className="flex items-center justify-center gap-3 mb-4">
                <label htmlFor="compare-with-select" className="text-lg font-medium">Compare with:</label>
                <select
                  id="compare-with-select"
                  value={secondCompany}
                  onChange={e => setSecondCompany(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-lg"
                  disabled={initLoading}
                >
                  <option value="none">None</option>
                  {companyNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            ) : undefined}
            onDataReady={(rows, company) => setPanel1Snap({ rows, company, segment: rows[0]?.segment ?? '' })}
            onBenchmarkReady={setPanel1Benchmark}
            showBenchmark={showBenchmark}
          />
          {secondCompany !== 'none' && (
            <>
              <div className="hidden lg:block w-px bg-gray-200" />
              <CompanyPanel
                id="2"
                companyNames={companyNames}
                defaultCompany={secondCompany}
                selectedMetric={selectedMetric}
                disabled={initLoading}
                company={secondCompany}
                onCompanyChange={setSecondCompany}
                selectorLabel="Compare with:"
                includeNoneOption={true}
                onDataReady={(rows, company) => setPanel2Snap({ rows, company, segment: rows[0]?.segment ?? '' })}
                onBenchmarkReady={setPanel2Benchmark}
                showBenchmark={showBenchmark}
              />
            </>
          )}
        </div>
      )}

      {/* ── Interpretation section (only for ROA metric) ── */}
      {!initLoading && !error && selectedMetric === 'roa' && (() => {
        const isComparison = secondCompany !== 'none'
        const sections = isComparison && panel1Snap && panel2Snap
          ? buildComparisonInterpretation(panel1Snap, panel2Snap, panel1Benchmark, panel2Benchmark)
          : panel1Snap
            ? buildSingleInterpretation(panel1Snap, panel1Benchmark)
            : []
        if (sections.length === 0) return null
        return (
          <div className="w-full mt-2 bg-amber-50 border border-amber-200 rounded-lg px-6 py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Analysis</p>
            {sections.map((section, i) => (
              <div key={i} className={i > 0 ? 'pt-3 border-t border-amber-100' : ''}>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-500 mb-1">{section.title}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

export default App
