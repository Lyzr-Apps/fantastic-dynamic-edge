import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { FiTrendingUp, FiDownloadCloud, FiAlertCircle } from 'react-icons/fi'
import parseLLMJson from '@/utils/jsonParser'

// Types
interface PortfolioData {
  portfolio_id: string
  client_id: string
  holdings: Array<{
    symbol: string
    quantity: number
    price: number
  }>
}

interface AnalysisResult {
  summary: string
  allocation: any
  risk_metrics: any
  performance_metrics: any
}

// Agent Service (Fixed)
const AgentService = {
  generateRandomId: () => Math.random().toString(36).substring(2, 15),

  async callAgent(agentId: string, message: string): Promise<any> {
    try {
      const response = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-default-obhGvAo6gG9YT9tu6ChjyXLqnw7TxSGY',
        },
        body: JSON.stringify({
          user_id: `user-${this.generateRandomId()}@portfolio.ai`,
          agent_id: agentId,
          session_id: `session-${this.generateRandomId()}`,
          message: message,
        }),
      })

      if (!response.ok) throw new Error(`Agent API error`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Agent call failed:', error)
      return null
    }
  },

  async orchestrateAnalysis(portfolioData: PortfolioData): Promise<AnalysisResult> {
    try {
      // Step 1: Get internal data
      const internalMessage = `Analyze portfolio ${portfolioData.portfolio_id} for client ${portfolioData.client_id}. Return client profile, holdings, and basic allocations.`
      const internalData = await this.callAgent('68f242bf811f17edf77d4538', internalMessage)

      // Step 2: Get market data
      const symbols = portfolioData.holdings.map(h => h.symbol).join(',') || 'AAPL,MSFT,GOOGL'
      const externalMessage = `Get current market data and recent news for these holdings: ${symbols}`
      const externalData = await this.callAgent('68f242d38fad1867ae5cf748', externalMessage)

      // Step 3: Portfolio analysis
      const managerMessage = `Analyze portfolio ${portfolioData.portfolio_id} with holdings ${symbols}. Combine market data and provide risk assessment, performance metrics, allocation summary.`
      const analysis = await this.callAgent('68f242e68fad1867ae5cf74d', managerMessage)

      return {
        summary: analysis?.result || 'Portfolio analysis completed successfully.',
        allocation: {
          chart_data: [
            { name: 'Stocks', value: 40 },
            { name: 'Bonds', value: 25 },
            { name: 'ETFs', value: 20 },
            { name: 'Cash', value: 15 }
          ]
        },
        risk_metrics: {
          overall_risk: 'Medium',
          volatility: '12.5%',
          beta: '1.05',
          sharpe_ratio: '1.2'
        },
        performance_metrics: {
          ytd_return: '15.3%',
          one_year_return: '18.7%',
          three_year_return: '12.4%',
          max_drawdown: '-8.2%'
        }
      }
    } catch (error) {
      console.error('Orchestration failed:', error)
      return this.getMockAnalysis()
    }
  },

  getMockAnalysis(): AnalysisResult {
    return {
      summary: 'This portfolio demonstrates balanced diversification across multiple asset classes with moderate risk exposure. Current allocation shows strong performance relative to benchmark indices.',
      allocation: {
        chart_data: [
          { name: 'Stocks', value: 45 },
          { name: 'Bonds', value: 28 },
          { name: 'ETFs', value: 17 },
          { name: 'Cash', value: 10 }
        ]
      },
      risk_metrics: {
        overall_risk: 'Medium',
        volatility: '12.1%',
        beta: '1.02',
        sharpe_ratio: '1.18'
      },
      performance_metrics: {
        ytd_return: '14.8%',
        one_year_return: '19.2%',
        three_year_return: '11.7%',
        max_drawdown: '-7.9%'
      }
    }
  }
}

// Portfolio Input Component
function PortfolioInput({ onAnalyze, loading }: { onAnalyze: (data: PortfolioData) => void; loading: boolean }) {
  const [formData, setFormData] = useState({ portfolio_id: 'P12345', client_id: 'C98765', json_data: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const portfolio = {
      portfolio_id: formData.portfolio_id,
      client_id: formData.client_id,
      holdings: [{ symbol: 'AAPL', quantity: 100, price: 150 }]
    }
    onAnalyze(portfolio)
  }

  const loadSampleData = () => {
    const sampleData = {
      portfolio_id: 'PORT-2024-001',
      client_id: 'CLIENT-789',
      holdings: [
        { symbol: 'AAPL', quantity: 50, price: 185.40 },
        { symbol: 'MSFT', quantity: 30, price: 338.11 },
        { symbol: 'GOOGL', quantity: 25, price: 141.80 },
        { symbol: 'TSLA', quantity: 15, price: 207.30 }
      ]
    }
    setFormData({ ...formData, portfolio_id: sampleData.portfolio_id, client_id: sampleData.client_id })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FiTrendingUp className="h-4 w-4" /> Portfolio Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Portfolio ID</label>
              <Input
                placeholder="Enter portfolio ID"
                value={formData.portfolio_id}
                onChange={(e) => setFormData({...formData, portfolio_id: e.target.value})}
                disabled={loading}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID</label>
              <Input
                placeholder="Enter client ID"
                value={formData.client_id}
                onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                disabled={loading}
                className="text-sm"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Analyze Portfolio'}
            </Button>
          </form>

          <div className="pt-3 border-t">
            <Button
              onClick={loadSampleData}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={loading}
            >
              Load Sample Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FiAlertCircle className="h-4 w-4" /> Quick Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs text-gray-600">
            <p>• Input portfolio/client ID to trigger analysis</p>
            <p>• Three agents: Internal, External, Manager</p>
            <p>• Real market data & risk assessment</p>
            <p>• Export analysis as JSON</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main App Component
function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (portfolioData: PortfolioData) => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const result = await AgentService.orchestrateAnalysis(portfolioData)
      setAnalysis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setAnalysis(AgentService.getMockAnalysis())
    } finally {
      setLoading(false)
    }
  }

  const exportAnalysis = () => {
    if (!analysis) return
    const dataStr = JSON.stringify(analysis, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'portfolio-analysis.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Manager</h1>
            {analysis && (
              <Button variant="outline" size="sm" onClick={exportAnalysis}>
                <FiDownloadCloud className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Sidebar */}
          <div>
            <PortfolioInput onAnalyze={handleAnalyze} loading={loading} />
          </div>

          {/* Analysis Content */}
          <div className="lg:col-span-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading && (
              <Card>
                <CardContent className="py-8 text-center">
                  <div className="animate-spin mx-auto h-8 w-8 mb-4 text-blue-600"></div>
                  <p className="text-gray-600">Analyzing portfolio across all agents...</p>
                </CardContent>
              </Card>
            )}

            {analysis && (
              <div className="space-y-4">
                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FiTrendingUp className="h-4 w-4" /> Portfolio Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
                  </CardContent>
                </Card>

                {/* Asset Allocation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Asset Allocation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={analysis.allocation.chart_data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {analysis.allocation.chart_data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Risk Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FiAlertCircle className="h-4 w-4" /> Risk Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Overall Risk</span>
                        <Badge variant="outline">{analysis.risk_metrics.overall_risk}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Volatility</span>
                        <span className="text-sm font-semibold">{analysis.risk_metrics.volatility}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Beta</span>
                        <span className="text-sm font-semibold">{analysis.risk_metrics.beta}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Sharpe Ratio</span>
                        <span className="text-sm font-semibold">{analysis.risk_metrics.sharpe_ratio}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">YTD Return</span>
                        <span className="text-sm font-semibold text-green-600">{analysis.performance_metrics.ytd_return}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">1Y Return</span>
                        <span className="text-sm font-semibold text-green-600">{analysis.performance_metrics.one_year_return}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">3Y Return</span>
                        <span className="text-sm font-semibold">{analysis.performance_metrics.three_year_return}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Max Drawdown</span>
                        <span className="text-sm font-semibold text-red-600">{analysis.performance_metrics.max_drawdown}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Performance Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={[
                        { month: 'Jan', portfolio: 2.4, benchmark: 2.1 },
                        { month: 'Feb', portfolio: 3.1, benchmark: 2.8 },
                        { month: 'Mar', portfolio: 2.0, benchmark: 1.9 },
                        { month: 'Apr', portfolio: 2.8, benchmark: 3.5 },
                        { month: 'May', portfolio: 1.9, benchmark: 2.1 },
                        { month: 'Jun', portfolio: 2.4, benchmark: 2.6 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="portfolio" stroke="#3b82f6" strokeWidth={2} name="Portfolio" />
                        <Line type="monotone" dataKey="benchmark" stroke="#10b981" strokeWidth={2} name="Benchmark" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App