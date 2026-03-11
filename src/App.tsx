import { useState, useEffect } from 'react'

interface CompanyRevenue {
  company_name: string
  'Net Revenue': string
  currency: string
}

const currencySymbols: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'CA$',
  SEK: 'kr',
}

function formatRevenue(amount: string, currency: string): string {
  const num = Number(amount).toLocaleString()
  const symbol = currencySymbols[currency] ?? currency
  if (currency === 'SEK') return `${num} ${symbol}`
  return `${symbol}${num}`
}

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024]

function App() {
  const [year, setYear] = useState(2024)
  const [companies, setCompanies] = useState<CompanyRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (companies.length > 0) {
      setFetching(true)
    } else {
      setLoading(true)
    }
    setError(null)

    const query = `
      SELECT f.company_name, f.\`Net Revenue\`, c.currency
      FROM financials f
      JOIN company_info c ON f.company_name = c.company
      WHERE f.year = ${year}
    `
    const url = `https://www.dolthub.com/api/v1alpha1/calvinw/BusMgmtBenchmarks?q=${encodeURIComponent(query)}`

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setCompanies(data.rows)
        setLoading(false)
        setFetching(false)
      })
      .catch(() => {
        setError('Failed to load data from the database.')
        setLoading(false)
        setFetching(false)
      })
  }, [year])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">BusMgmtBenchmarksApp Template</h1>

      <div className="flex items-center gap-3">
        <label htmlFor="year-select" className="text-lg font-medium">Year:</label>
        <select
          id="year-select"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded px-3 py-2 text-lg"
        >
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="w-full max-w-2xl mt-4">
        <h2 className="text-2xl font-bold mb-1 text-center">Company Revenue {year}</h2>
        <p className="text-sm text-gray-500 mb-4 text-center">All figures in thousands (local currency)</p>
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <table className={`w-full border-collapse transition-opacity duration-200 ${fetching ? 'opacity-40' : 'opacity-100'}`}>
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Company</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Net Revenue (thousands)</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-4 py-2">{company.company_name}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatRevenue(company['Net Revenue'], company.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default App
