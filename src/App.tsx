import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
}

function CompanyPanel({ id, companyNames, defaultCompany, selectedMetric, disabled, company, onCompanyChange, hideCompanySelector }: CompanyPanelProps) {
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
      SELECT f.*, c.currency
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
      })
      .catch(() => {
        setError('Failed to load data from the database.')
        setFetching(false)
      })
  }, [selectedCompany])

  const currency = yearlyData[0]?.currency ?? ''
  const isROA = selectedMetric === 'roa'
  const chartData = yearlyData.map(row => ({
    year: row.year,
    value: isROA
      ? (row._roa !== '' ? Number(row._roa) : null)
      : (row[selectedMetric] !== '' ? Number(row[selectedMetric]) : null),
  }))

  const handleCompanyChange = (val: string) => {
    if (!isControlled) setInternalCompany(val)
    onCompanyChange?.(val)
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Company menu for this panel */}
      {!hideCompanySelector && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <label htmlFor={`company-select-${id}`} className="text-lg font-medium">Company:</label>
          <select
            id={`company-select-${id}`}
            value={selectedCompany}
            onChange={e => handleCompanyChange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-lg"
            disabled={disabled}
          >
            {companyNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

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
          <BarChart data={chartData}>
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
              formatter={(v) => [
                v != null
                  ? isROA
                    ? formatPercent(String(v))
                    : formatValue(String(v), currency)
                  : '—',
                isROA ? 'ROA' : selectedMetric,
              ]}
              labelFormatter={label => `Year: ${label}`}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ---------- App ----------

function App() {
  const [companyNames, setCompanyNames] = useState<string[]>([])
  const [metrics, setMetrics] = useState<string[]>([])
  const [selectedMetric, setSelectedMetric] = useState('')
  const [secondCompany, setSecondCompany] = useState('')
  const [initLoading, setInitLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          setSecondCompany(names[1] ?? 'none')
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

      {/* Second company selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="second-company-select" className="text-lg font-medium">Compare with:</label>
        <select
          id="second-company-select"
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

      {selectedMetric === 'roa' && (
        <div className="bg-blue-50 border border-blue-200 rounded px-6 py-3 text-sm font-semibold text-center">
          <p>ROA = Net Profit Margin &times; Asset Turnover</p>
          <p>Net Profit Margin = Net Income &divide; Revenue</p>
          <p>Asset Turnover = Revenue &divide; Total Assets</p>
        </div>
      )}

      {initLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!initLoading && !error && (
        <div className={`w-full ${secondCompany !== 'none' ? 'flex flex-col lg:flex-row gap-10' : ''}`}>
          <CompanyPanel
            id="1"
            companyNames={companyNames}
            defaultCompany={companyNames[0] ?? ''}
            selectedMetric={selectedMetric}
            disabled={initLoading}
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
                hideCompanySelector={true}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App
