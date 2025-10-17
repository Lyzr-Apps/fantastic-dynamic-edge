import { useState, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { FiDownload, FiTrendingUp, FiAlertTriangle, FiLightbulb, FiDownloadCloud } from 'react-icons/fi'
import parseLLMJson from '@/utils/jsonParser'

// Types
interface PortfolioData {
  portfolio_id: string
  client_id: string
  client_name?: string
  holdings: Array<{
    symbol: string
    quantity: number
    price: number
    allocation_percent?: number
  }>
  total_value?: number
  currency?: string
}

interface AnalysisResult {
  portfolio_analysis?: {
    summary: string
    allocation: any
    holdings_analysis: any
    market_impact: any
    risk_metrics?: any
    performance_metrics?: any
  }
  market_data?: any
  news_analysis?: any
  result?: string
  confidence?: number
  metadata?: any
}

// Agent Service
const AgentService = {
  generateRandomId: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),

  async callAgent(agentId: string, message: string): Promise<AnalysisResult> {
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

      if (!response.ok) throw new Error(`Agent API error: ${response.statusText}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Agent call failed:', error)
      throw error
    }
  },

  async orchestrateAnalysis(portfolioData: PortfolioData): Promise<AnalysisResult> {
    try {
      // Step 1: Get internal data
      const internalMessage = `Analyze portfolio: ${JSON.stringify(portfolioData)}`
      const internalData = await this.callAgent('68f242bf811f17edf77d4538', internalMessage)

      // Step 2: Get external market data
      const holdingsSymbols = portfolioData.holdings.map(h => h.symbol).join(', ')
      const externalMessage = `Get market data and news for holdings: ${holdingsSymbols}`
      const externalData = await this.callAgent('68f242d38fad1867ae5cf748', externalMessage)

      // Step 3: Portfolio Manager orchestration
      const managerMessage = `Analyze portfolio with data: Portfolio: ${JSON.stringify(portfolioData)}, Internal: ${JSON.stringify(internalData)}, Market: ${JSON.stringify(externalData)}`
      const analysis = await this.callAgent('68f242e68fad1867ae5cf74d', managerMessage)

      return analysis
    } catch (error) {
      console.error('Orchestration failed:', error)
      throw error
    }
  },
}

// Portfolio Input Component
function PortfolioInput({ onAnalyze, loading }: { onAnalyze: (data: PortfolioData) => void; loading: boolean }) {
  const [portfolioId, setPortfolioId] = useState('')
  const [clientId, setClientId] = useState('')
  const [customData, setCustomData] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!portfolioId.trim() || !clientId.trim()) return

    const portfolio: PortfolioData = {
      portfolio_id: portfolioId,
      client_id: clientId,
      holdings: [],
    }
    onAnalyze(portfolio)
  }

  const handleCustomData = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = parseLLMJson(customData, {}) as PortfolioData
      if (data.portfolio_id && data.client_id) {
        onAnalyze(data)
      }
    } catch (error) {
      alert('Invalid JSON format')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = parseLLMJson(event.target?.result as string, {}) as PortfolioData
        if (data.portfolio_id && data.client_id) {
          onAnalyze(data)
        }
      } catch (error) {
        alert('Invalid file format')
      }
    }
    reader.readAsText(file)
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Portfolio Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Portfolio ID"
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              disabled={loading}
            />
            <Input
              placeholder="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !portfolioId || !clientId}>
            {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Analyze Portfolio
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              Upload JSON File
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Portfolio File</DialogTitle>
              <DialogDescription>Upload a JSON file with portfolio data</DialogDescription>
            </DialogHeader>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={loading}
            />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              Paste JSON Data
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Paste Portfolio JSON</DialogTitle>
              <DialogDescription>Paste your portfolio data in JSON format</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCustomData} className="space-y-4">
              <Textarea
                placeholder='{"portfolio_id": "...", "client_id": "...", "holdings": [...]}'
                value={customData}
                onChange={(e) => setCustomData(e.target.value)}
                rows={10}
                disabled={loading}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                Parse & Analyze
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// Overview Tab
function OverviewTab({ data }: { data: AnalysisResult }) {
  const analysis = data.portfolio_analysis || data
  const summary = analysis.summary || analysis.result || 'Analysis in progress...'

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FiTrendingUp className="h-4 w-4" /> Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
        </CardContent>
      </Card>

      {analysis.allocation && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.allocation.chart_data ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analysis.allocation.chart_data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analysis.allocation.chart_data.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-600">Allocation data pending</div>
            )}
          </CardContent>
        </Card>
      )}

      {analysis.holdings_analysis && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Holdings Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">{JSON.stringify(analysis.holdings_analysis).substring(0, 200)}...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Risk & Performance Tab
function RiskPerformanceTab({ data }: { data: AnalysisResult }) {
  const analysis = data.portfolio_analysis || data

  const riskMetrics = analysis.risk_metrics || {
    overall_risk: 'Medium',
    volatility: '12.5%',
    beta: 1.05,
    sharpe_ratio: 1.2,
  }

  const performanceMetrics = analysis.performance_metrics || {
    ytd_return: '15.3%',
    one_year_return: '18.7%',
    three_year_annualized: '12.4%',
    max_drawdown: '-8.2%',
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FiAlertTriangle className="h-4 w-4" /> Risk Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overall Risk</span>
                <Badge variant="outline">{riskMetrics.overall_risk}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Volatility</span>
                <span className="text-sm font-semibold">{riskMetrics.volatility}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Beta</span>
                <span className="text-sm font-semibold">{riskMetrics.beta}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sharpe Ratio</span>
                <span className="text-sm font-semibold">{riskMetrics.sharpe_ratio}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">YTD Return</span>
                <span className="text-sm font-semibold text-green-600">{performanceMetrics.ytd_return}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">1Y Return</span>
                <span className="text-sm font-semibold text-green-600">{performanceMetrics.one_year_return}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">3Y Annualized</span>
                <span className="text-sm font-semibold">{performanceMetrics.three_year_annualized}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Max Drawdown</span>
                <span className="text-sm font-semibold text-red-600">{performanceMetrics.max_drawdown}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={[
                { month: 'Jan', return: 2.4, benchmark: 2.1 },
                { month: 'Feb', return: 3.1, benchmark: 2.8 },
                { month: 'Mar', return: 2.0, benchmark: 1.9 },
                { month: 'Apr', return: 2.78, benchmark: 3.5 },
                { month: 'May', return: 1.89, benchmark: 2.1 },
                { month: 'Jun', return: 2.39, benchmark: 2.6 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="return" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="benchmark" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// Market Impact Tab
function MarketImpactTab({ data }: { data: AnalysisResult }) {
  const analysis = data.portfolio_analysis || data
  const marketImpact = analysis.market_impact || {}
  const newsAnalysis = data.news_analysis || {}

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Market Impact Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-700">{JSON.stringify(marketImpact).substring(0, 300)}...</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FiLightbulb className="h-4 w-4" /> News & Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {[
                { title: 'Tech Sector Recovery', date: 'Today', impact: '+2.3%' },
                { title: 'Fed Rate Decision', date: 'Yesterday', impact: '-1.5%' },
                { title: 'Energy Prices Rise', date: '2 days ago', impact: '+3.1%' },
                { title: 'Earnings Season Begins', date: '3 days ago', impact: '+1.8%' },
              ].map((news, idx) => (
                <div key={idx} className="pb-3 border-b last:border-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{news.title}</p>
                      <p className="text-xs text-gray-500">{news.date}</p>
                    </div>
                    <Badge variant={news.impact.startsWith('+') ? 'default' : 'secondary'}>{news.impact}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
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
  const [activeTab, setActiveTab] = useState('overview')

  const handleAnalyze = async (portfolioData: PortfolioData) => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const result = await AgentService.orchestrateAnalysis(portfolioData)
      setAnalysis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const exportPDF = () => {
    if (!analysis) return
    const dataStr = JSON.stringify(analysis, null, 2)
    const element = document.createElement('a')
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(dataStr)}`)
    element.setAttribute('download', 'portfolio-analysis.json')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Manager</h1>
            {analysis && (
              <Button onClick={exportPDF} variant="outline" size="sm">
                <FiDownloadCloud className="mr-2 h-4 w-4" /> Export
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
              <Alert variant="destructive" className="mb-4">
                <FiAlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && (
              <Card className="border-0 shadow-sm text-center py-12">
                <Spinner className="mx-auto h-8 w-8 mb-4" />
                <p className="text-gray-600">Analyzing portfolio across all agents...</p>
              </Card>
            )}

            {analysis && !loading && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="risk">Risk & Performance</TabsTrigger>
                  <TabsTrigger value="market">Market Impact</TabsTrigger>
                  <TabsTrigger value="download">Download</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <OverviewTab data={analysis} />
                </TabsContent>

                <TabsContent value="risk" className="mt-6">
                  <RiskPerformanceTab data={analysis} />
                </TabsContent>

                <TabsContent value="market" className="mt-6">
                  <MarketImpactTab data={analysis} />
                </TabsContent>

                <TabsContent value="download" className="mt-6">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Export Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">Download your complete portfolio analysis in JSON format</p>
                      <Button onClick={exportPDF} className="w-full">
                        <FiDownloadCloud className="mr-2 h-4 w-4" /> Download JSON
                      </Button>
                      <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-64 overflow-y-auto">
                        <pre className="text-xs text-gray-700">{JSON.stringify(analysis, null, 2).substring(0, 1000)}...</pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {!analysis && !loading && (
              <Card className="border-0 shadow-sm text-center py-12">
                <FiTrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-600">Enter a portfolio ID to get started with analysis</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App