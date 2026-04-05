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
  showBenchmark?: boolean
}

function CompanyPanel({ id, companyNames, defaultCompany, selectedMetric, disabled, company, onCompanyChange, hideCompanySelector, selectorLabel, includeNoneOption, showPlaceholder, afterSelectorContent, onDataReady, showBenchmark }: CompanyPanelProps) {
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

  // Fetch segment benchmark data when toggle is on and segment is known
  useEffect(() => {
    if (!showBenchmark || !segment) return
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
      })
      .catch(() => { /* silently skip benchmark if fetch fails */ })
  }, [showBenchmark, segment])

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
          <p className="text-gray-400 text-lg text-center">Please select a company to view ROA analysis</p>
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

// Determine what drives a company's ROA based on its latest NPM and AT values
function driverLabel(npm: number, at: number): string {
  const highNPM = npm > 8
  const highAT  = at > 1.8
  if (highNPM && !highAT) return 'margin-driven'
  if (!highNPM && highAT) return 'efficiency-driven'
  if (highNPM && highAT)  return 'strong on both margin and asset turnover'
  return 'balanced between margin and asset turnover'
}

// Compare latest ROA vs previous year and classify direction
function trendLabel(valid: ValidRow[]): { label: string; diff: number } {
  if (valid.length < 2) return { label: 'stable', diff: 0 }
  const diff = valid[valid.length - 1].roa - valid[valid.length - 2].roa
  if (diff >  2) return { label: 'improving strongly', diff }
  if (diff >  0.5) return { label: 'improving',        diff }
  if (diff < -2) return { label: 'declining sharply',  diff }
  if (diff < -0.5) return { label: 'declining',        diff }
  return { label: 'stable', diff }
}

// When ROA is declining, figure out which factor weakened more (relative change)
function declineDriver(valid: ValidRow[]): string {
  if (valid.length < 2) return ''
  const prev = valid[valid.length - 2]
  const curr = valid[valid.length - 1]
  const npmRelDrop = prev.npm !== 0 ? (prev.npm - curr.npm) / Math.abs(prev.npm) : 0
  const atRelDrop  = prev.at  !== 0 ? (prev.at  - curr.at)  / Math.abs(prev.at)  : 0
  if (npmRelDrop > atRelDrop + 0.05) return 'net profit margin'
  if (atRelDrop  > npmRelDrop + 0.05) return 'asset turnover'
  return ''
}

function buildSingleInterpretation(snap: PanelSnapshot): string[] {
  const valid = toValidRows(snap.rows)
  if (valid.length === 0) return []
  const latest = valid[valid.length - 1]
  const sentences: string[] = []

  // Sentence 1: what drives this company's ROA
  sentences.push(
    `${snap.company} appears to be ${driverLabel(latest.npm, latest.at)}, ` +
    `with a net profit margin of ${formatPercent(latest.npm)} and asset turnover of ${latest.at.toFixed(2)}x as of ${latest.year}.`
  )

  // Sentence 2: trend
  const trend = trendLabel(valid)
  if (trend.label === 'stable') {
    sentences.push(`ROA has remained relatively stable, most recently at ${formatPercent(latest.roa)}.`)
  } else if (trend.label.startsWith('improving')) {
    sentences.push(`ROA is ${trend.label}, reaching ${formatPercent(latest.roa)} in ${latest.year}.`)
  } else {
    const driver = declineDriver(valid)
    const note = driver ? `, driven mainly by a weaker ${driver}` : ''
    sentences.push(`ROA is ${trend.label}${note}, falling to ${formatPercent(latest.roa)} in ${latest.year}.`)
  }

  return sentences
}

function buildComparisonInterpretation(snap1: PanelSnapshot, snap2: PanelSnapshot): string[] {
  const v1 = toValidRows(snap1.rows)
  const v2 = toValidRows(snap2.rows)
  if (v1.length === 0 || v2.length === 0) return []
  const l1 = v1[v1.length - 1]
  const l2 = v2[v2.length - 1]
  const sentences: string[] = []

  // Sentence 1: which company has higher ROA right now
  const diff = Math.abs(l1.roa - l2.roa)
  if (diff < 0.5) {
    sentences.push(
      `${snap1.company} and ${snap2.company} show similar ROA in ${l1.year} ` +
      `(${formatPercent(l1.roa)} vs ${formatPercent(l2.roa)}).`
    )
  } else {
    const [better, worse, betterROA, worseROA] = l1.roa > l2.roa
      ? [snap1.company, snap2.company, l1.roa, l2.roa]
      : [snap2.company, snap1.company, l2.roa, l1.roa]
    const strength = diff > 3 ? 'significantly outperforms' : 'outperforms'
    sentences.push(
      `${better} ${strength} ${worse} in recent ROA ` +
      `(${formatPercent(betterROA)} vs ${formatPercent(worseROA)} in ${l1.year}).`
    )
  }

  // Sentence 2: compare what drives each company (only if different)
  const d1 = driverLabel(l1.npm, l1.at)
  const d2 = driverLabel(l2.npm, l2.at)
  if (d1 !== d2) {
    sentences.push(`${snap1.company} is ${d1}, while ${snap2.company} is ${d2}.`)
  }

  // Sentence 3: compare trends (only if they differ or one is notable)
  const t1 = trendLabel(v1)
  const t2 = trendLabel(v2)
  const t1Notable = t1.label !== 'stable'
  const t2Notable = t2.label !== 'stable'
  if (t1Notable && t2Notable && t1.label !== t2.label) {
    sentences.push(`${snap1.company}'s ROA is ${t1.label}, while ${snap2.company}'s is ${t2.label}.`)
  } else if (t1Notable && !t2Notable) {
    sentences.push(`${snap1.company}'s ROA is ${t1.label}, while ${snap2.company}'s has remained stable.`)
  } else if (!t1Notable && t2Notable) {
    sentences.push(`${snap2.company}'s ROA is ${t2.label}, while ${snap1.company}'s has remained stable.`)
  }

  return sentences
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
            onDataReady={(rows, company) => setPanel1Snap({ rows, company })}
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
                onDataReady={(rows, company) => setPanel2Snap({ rows, company })}
                showBenchmark={showBenchmark}
              />
            </>
          )}
        </div>
      )}

      {/* ── Interpretation section (only for ROA metric) ── */}
      {!initLoading && !error && selectedMetric === 'roa' && (() => {
        const isComparison = secondCompany !== 'none'
        const sentences = isComparison && panel1Snap && panel2Snap
          ? buildComparisonInterpretation(panel1Snap, panel2Snap)
          : panel1Snap
            ? buildSingleInterpretation(panel1Snap)
            : []
        if (sentences.length === 0) return null
        return (
          <div className="w-full mt-2 bg-amber-50 border border-amber-200 rounded-lg px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">Analysis</p>
            {sentences.map((s, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed">{s}</p>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

export default App
