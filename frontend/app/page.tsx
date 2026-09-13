"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { API_BASE_URL } from "@/lib/api"


// ============================================================
// TYPES
// ============================================================

type DashboardStats = {
  total_transactions: number
  high_risk: number
  active_alerts: number
  average_risk: number
}

type RiskDistribution = {
  low: number
  medium: number
  high: number
}





// ============================================================
// LIVE TRANSACTIONS
// ============================================================

type DashboardTransaction = {
  id: string
  user: string
  amount: string
  score: number
  level: "HIGH" | "MEDIUM" | "LOW"
  reason: string
  time: string
}

type ApiTransaction = {
  transaction_id: string
  user_id: string
  amount: number
  timestamp: string
  risk_results?:
    | {
        risk_score: number
        risk_level: string
        alert: boolean
        reasons: string[]
      }
    | {
        risk_score: number
        risk_level: string
        alert: boolean
        reasons: string[]
      }[]
    | null
}

function getRiskResult(transaction: ApiTransaction) {
  if (!transaction.risk_results) return null
  return Array.isArray(transaction.risk_results)
    ? transaction.risk_results[0] ?? null
    : transaction.risk_results
}

// ============================================================
// LIVE CHART DATA
// ============================================================

type RiskActivityPoint = {
  time: string
  transactions: number
  risk: number
}

function buildRiskActivityData(
  transactions: ApiTransaction[]
): RiskActivityPoint[] {
  const now = Date.now()
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const end = now - (6 - index) * 4 * 60 * 60 * 1000
    return {
      start: end - 4 * 60 * 60 * 1000,
      end,
      time: new Date(end).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      transactions: 0,
      riskTotal: 0,
      riskCount: 0,
    }
  })

  for (const transaction of transactions) {
    const timestamp = new Date(transaction.timestamp).getTime()
    const risk = getRiskResult(transaction)

    if (!risk || Number.isNaN(timestamp)) continue

    const bucket = buckets.find(
      (item) =>
        timestamp >= item.start &&
        timestamp < item.end
    )

    if (!bucket) continue

    bucket.transactions += 1
    bucket.riskTotal += Number(risk.risk_score) || 0
    bucket.riskCount += 1
  }

  return buckets.map((bucket) => ({
    time: bucket.time,
    transactions: bucket.transactions,
    risk:
      bucket.riskCount > 0
        ? Math.round(
            (bucket.riskTotal / bucket.riskCount) * 10
          ) / 10
        : 0,
  }))
}


function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}


// ============================================================
// RISK BADGE
// ============================================================

const riskBadge = {
  HIGH: "border-red-500/30 bg-red-500/10 text-red-400",
  MEDIUM: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  LOW: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
}


// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [stats, setStats] = useState<DashboardStats>({
    total_transactions: 0,
    high_risk: 0,
    active_alerts: 0,
    average_risk: 0,
  })

  const [riskDistribution, setRiskDistribution] =
    useState<RiskDistribution>({
      low: 0,
      medium: 0,
      high: 0,
    })

  const [loading, setLoading] = useState(true)

  const [apiError, setApiError] = useState(false)

  const [transactions, setTransactions] = useState<DashboardTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [riskData, setRiskData] = useState<RiskActivityPoint[]>([])


  // ==========================================================
  // FETCH REAL DASHBOARD DATA
  // ==========================================================

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        setApiError(false)

        const [
          statsResponse,
          distributionResponse,
          transactionsResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE_URL}/api/v1/dashboard/stats`
          ),

          fetch(
            `${API_BASE_URL}/api/v1/dashboard/risk-distribution`
          ),

          fetch(
            `${API_BASE_URL}/api/v1/transactions`
          ),
        ])

        if (
          !statsResponse.ok ||
          !distributionResponse.ok ||
          !transactionsResponse.ok
        ) {
          throw new Error(
            "Failed to fetch dashboard data"
          )
        }

        const statsData =
          await statsResponse.json()

        const distributionData =
          await distributionResponse.json()

        const transactionsData: ApiTransaction[] =
          await transactionsResponse.json()

        const liveTransactions: DashboardTransaction[] =
          transactionsData
            .map((transaction) => {
              const risk = getRiskResult(transaction)

              if (!risk) return null

              const level =
                risk.risk_level.toUpperCase()

              if (
                level !== "HIGH" &&
                level !== "MEDIUM" &&
                level !== "LOW"
              ) {
                return null
              }

              const reasons =
                Array.isArray(risk.reasons)
                  ? risk.reasons
                  : []

              return {
                id: transaction.transaction_id,
                user: transaction.user_id,
                amount: `₹${Number(transaction.amount).toLocaleString("en-IN")}`,
                score: Number(risk.risk_score),
                level,
                reason:
                  reasons.length > 0
                    ? reasons.slice(0, 2).join(" + ")
                    : "No anomaly reason recorded",
                time: formatRelativeTime(
                  transaction.timestamp
                ),
              }
            })
            .filter(
              (
                transaction
              ): transaction is DashboardTransaction =>
                transaction !== null
            )
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)

        setStats(statsData)
        setRiskDistribution(
          distributionData && typeof distributionData === "object"
            ? {
                low: Number(distributionData.low) || 0,
                medium: Number(distributionData.medium) || 0,
                high: Number(distributionData.high) || 0,
              }
            : { low: 0, medium: 0, high: 0 }
        )
        setTransactions(liveTransactions)
        setRiskData(
          buildRiskActivityData(transactionsData)
        )

      } catch (error) {
        console.error(
          "Dashboard API error:",
          error
        )

        setApiError(true)

      } finally {
        setLoading(false)
        setTransactionsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])


  // ==========================================================
  // RISK DISTRIBUTION PERCENTAGES
  // ==========================================================

  const safeDistribution = {
    low: Number(riskDistribution?.low) || 0,
    medium: Number(riskDistribution?.medium) || 0,
    high: Number(riskDistribution?.high) || 0,
  }

  const totalRiskTransactions =
    safeDistribution.low +
    safeDistribution.medium +
    safeDistribution.high

  const lowPercentage =
    totalRiskTransactions > 0
      ? Math.round(
          (safeDistribution.low /
            totalRiskTransactions) *
            100
        )
      : 0

  const mediumPercentage =
    totalRiskTransactions > 0
      ? Math.round(
          (safeDistribution.medium /
            totalRiskTransactions) *
            100
        )
      : 0

  const highPercentage =
    totalRiskTransactions > 0
      ? Math.round(
          (safeDistribution.high /
            totalRiskTransactions) *
            100
        )
      : 0


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#07090d] text-slate-100">

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0b0e13] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* Logo */}

        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">

              <Shield className="h-5 w-5 text-cyan-400" />

            </div>

            <div>

              <h1 className="text-sm font-bold tracking-[0.2em] text-white">
                UPI SENTINEL
              </h1>

              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                Fraud Intelligence
              </p>

            </div>

          </div>


          <button
            className="lg:hidden"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>

        </div>


        {/* Navigation */}

        <nav className="flex-1 space-y-2 px-4 py-6">

          <SidebarItem
            icon={
              <LayoutDashboard className="h-4 w-4" />
            }
            label="Dashboard"
            active
            href="/"
            onClick={() =>
              setSidebarOpen(false)
            }
          />

          <SidebarItem
            icon={
              <CreditCard className="h-4 w-4" />
            }
            label="Transactions"
            href="/transactions"
            onClick={() =>
              setSidebarOpen(false)
            }
          />

          <SidebarItem
            icon={
              <ShieldAlert className="h-4 w-4" />
            }
            label="Alerts"
            badge={
              loading
                ? "..."
                : String(stats.active_alerts)
            }
            href="/alerts"
            onClick={() =>
              setSidebarOpen(false)
            }
          />

          <SidebarItem
            icon={
              <TrendingUp className="h-4 w-4" />
            }
            label="Analytics"
            href="/analytics"
            onClick={() =>
              setSidebarOpen(false)
            }
          />

          <SidebarItem
            icon={
              <Zap className="h-4 w-4" />
            }
            label="Risk Simulator"
            href="/test"
            onClick={() =>
              setSidebarOpen(false)
            }
          />


          <div className="my-6 border-t border-white/10" />


          <SidebarItem
            icon={
              <Users className="h-4 w-4" />
            }
            label="Users"
            href="#"
          />

          <SidebarItem
            icon={
              <Settings className="h-4 w-4" />
            }
            label="Settings"
            href="#"
          />

        </nav>


        {/* System Status */}

        <div className="m-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

          <div className="mb-2 flex items-center gap-2">

            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-xs font-medium text-emerald-400">
              SYSTEM OPERATIONAL
            </span>

          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            ML detection engine is actively monitoring transaction behavior.
          </p>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <section className="lg:ml-64">

        {/* Header */}

        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#07090d]/90 px-5 backdrop-blur-xl lg:px-8">

          <div className="flex items-center gap-4">

            <button
              className="lg:hidden"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              <Menu className="h-6 w-6 text-slate-300" />
            </button>

            <div>

              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Security Operations
              </p>

              <h2 className="text-lg font-semibold text-white">
                Risk Overview
              </h2>

            </div>

          </div>


          <div className="flex items-center gap-3">

            <button className="hidden rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-white sm:block">
              <Search className="h-4 w-4" />
            </button>

            <button className="relative rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-white">

              <Bell className="h-4 w-4" />

              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-400" />

            </button>

            <div className="hidden h-8 w-px bg-white/10 sm:block" />

            <div className="hidden items-center gap-3 sm:flex">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-400">
                LS
              </div>

              <div>

                <p className="text-xs font-medium text-white">
                  Security Admin
                </p>

                <p className="text-[10px] text-slate-500">
                  Administrator
                </p>

              </div>

            </div>

          </div>

        </header>


        {/* ===================================================
            PAGE CONTENT
        =================================================== */}

        <div className="p-5 lg:p-8">


          {/* Heading */}

          <div className="mb-8">

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

              <div>

                <div className="mb-2 flex items-center gap-2">

                  <Activity className="h-4 w-4 text-cyan-400" />

                  <span className="text-xs font-medium uppercase tracking-widest text-cyan-400">
                    Live Monitoring
                  </span>

                </div>

                <h3 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
                  Transaction Security
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Real-time anomaly detection and fraud-risk intelligence.
                </p>

              </div>


              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">

                <CheckCircle2 className="h-4 w-4 text-emerald-400" />

                <span className="text-xs text-emerald-400">
                  {apiError
                    ? "API CONNECTION ERROR"
                    : loading
                      ? "CONNECTING TO API"
                      : "LIVE API CONNECTED"}
                </span>

              </div>

            </div>

          </div>


          {/* =================================================
              KPI CARDS
          ================================================= */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              title="Total Transactions"
              value={
                loading
                  ? "..."
                  : stats.total_transactions.toLocaleString()
              }
              change="LIVE"
              positive
              icon={
                <CreditCard className="h-5 w-5" />
              }
              description="from Supabase"
            />


            <StatCard
              title="High Risk"
              value={
                loading
                  ? "..."
                  : stats.high_risk.toLocaleString()
              }
              change="LIVE"
              icon={
                <ShieldAlert className="h-5 w-5" />
              }
              description="transactions flagged"
              danger
            />


            <StatCard
              title="Active Alerts"
              value={
                loading
                  ? "..."
                  : stats.active_alerts.toLocaleString()
              }
              change="LIVE"
              positive
              icon={
                <AlertTriangle className="h-5 w-5" />
              }
              description="requiring review"
            />


            <StatCard
              title="Average Risk"
              value={
                loading
                  ? "..."
                  : stats.average_risk.toFixed(1)
              }
              change="LIVE"
              positive
              icon={
                <TrendingUp className="h-5 w-5" />
              }
              description="risk score / 100"
            />

          </div>


          {/* =================================================
              CHARTS
          ================================================= */}

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">


            {/* Activity Chart */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:p-6">

              <div className="mb-6 flex items-start justify-between">

                <div>

                  <h4 className="font-semibold text-white">
                    Transaction Risk Activity
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    Live transaction volume and average risk score
                  </p>

                </div>

                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.04]">
                  Last 24h
                </button>

              </div>


              <div className="h-[300px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <AreaChart data={riskData}>

                    <defs>

                      <linearGradient
                        id="riskGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >

                        <stop
                          offset="0%"
                          stopColor="#22d3ee"
                          stopOpacity={0.25}
                        />

                        <stop
                          offset="100%"
                          stopColor="#22d3ee"
                          stopOpacity={0}
                        />

                      </linearGradient>

                    </defs>


                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff10"
                      vertical={false}
                    />


                    <XAxis
                      dataKey="time"
                      tick={{
                        fill: "#64748b",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />


                    <YAxis
                      tick={{
                        fill: "#64748b",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />


                    <Tooltip
                      contentStyle={{
                        background: "#0b0e13",
                        border:
                          "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        color: "#fff",
                      }}
                      formatter={(value, name) => [
                        value,
                        name === "transactions"
                          ? "Transactions"
                          : "Average Risk",
                      ]}
                      
                    />


                    <Area
                      type="monotone"
                      dataKey="transactions"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      fill="url(#riskGradient)"
                    />

                    <Area
                      type="monotone"
                      dataKey="risk"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      fill="none"
                    />

                  </AreaChart>

                </ResponsiveContainer>

              </div>

            </div>


            {/* =================================================
                REAL RISK DISTRIBUTION
            ================================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:p-6">

              <h4 className="font-semibold text-white">
                Risk Distribution
              </h4>

              <p className="mt-1 text-xs text-slate-500">
                Current transaction classification
              </p>


              <div className="my-8 flex justify-center">

                <div className="relative flex h-44 w-44 items-center justify-center rounded-full border-[18px] border-emerald-400/20">

                  <div className="absolute inset-[-18px] rounded-full border-[18px] border-transparent border-t-yellow-400/70 border-r-red-400/70 -rotate-12" />


                  <div className="text-center">

                    <p className="text-3xl font-bold text-white">

                      {loading
                        ? "..."
                        : totalRiskTransactions.toLocaleString()}

                    </p>

                    <p className="text-[10px] uppercase tracking-widest text-slate-500">
                      Transactions
                    </p>

                  </div>

                </div>

              </div>


              <div className="space-y-4">

                <RiskRow
                  label="Low Risk"
                  value={`${lowPercentage}%`}
                  count={
                    loading
                      ? "..."
                      : safeDistribution.low.toLocaleString()
                  }
                  dot="bg-emerald-400"
                />


                <RiskRow
                  label="Medium Risk"
                  value={`${mediumPercentage}%`}
                  count={
                    loading
                      ? "..."
                      : safeDistribution.medium.toLocaleString()
                  }
                  dot="bg-yellow-400"
                />


                <RiskRow
                  label="High Risk"
                  value={`${highPercentage}%`}
                  count={
                    loading
                      ? "..."
                      : safeDistribution.high.toLocaleString()
                  }
                  dot="bg-red-400"
                />

              </div>

            </div>

          </div>


          {/* =================================================
              RECENT TRANSACTIONS
          ================================================= */}

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02]">

            <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center lg:p-6">

              <div>

                <h4 className="font-semibold text-white">
                  Recent Suspicious Transactions
                </h4>

                <p className="mt-1 text-xs text-slate-500">
                  Transactions requiring security attention
                </p>

              </div>


              <Link
                href="/transactions"
                className="flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
              >
                View all transactions

                <ChevronRight className="h-3.5 w-3.5" />

              </Link>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full min-w-[800px] text-left">

                <thead>

                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-slate-600">

                    <th className="px-6 py-4 font-medium">
                      Transaction
                    </th>

                    <th className="px-6 py-4 font-medium">
                      User
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Amount
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Risk Score
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Risk Level
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Reason
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Time
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {transactionsLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-xs text-slate-500"
                      >
                        Loading recent transactions...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-xs text-slate-500"
                      >
                        No scored transactions available.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(
                      (transaction) => (

                        <tr
                        key={transaction.id}
                        className="border-b border-white/5 transition hover:bg-white/[0.025]"
                      >

                        <td className="px-6 py-4">

                          <span className="font-mono text-xs text-slate-300">
                            {transaction.id}
                          </span>

                        </td>


                        <td className="px-6 py-4 text-xs text-slate-400">
                          {transaction.user}
                        </td>


                        <td className="px-6 py-4 text-sm font-medium text-white">
                          {transaction.amount}
                        </td>


                        <td className="px-6 py-4">

                          <RiskScore
                            score={
                              transaction.score
                            }
                          />

                        </td>


                        <td className="px-6 py-4">

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wider ${
                              riskBadge[
                                transaction.level as keyof typeof riskBadge
                              ]
                            }`}
                          >
                            {transaction.level}
                          </span>

                        </td>


                        <td className="max-w-[220px] px-6 py-4 text-xs text-slate-500">
                          {transaction.reason}
                        </td>


                        <td className="px-6 py-4 text-xs text-slate-600">
                          {transaction.time}
                        </td>

                        </tr>

                      )
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="mt-6 flex flex-col justify-between gap-2 border-t border-white/5 pt-5 text-[10px] text-slate-600 sm:flex-row">

            <span>
              UPI SENTINEL • Anomaly-Based Risk Detection
            </span>

            <span>
              ML Engine v1.0 • Supabase Connected
            </span>

          </div>

        </div>

      </section>

    </main>
  )
}


// ============================================================
// SIDEBAR ITEM
// ============================================================

function SidebarItem({
  icon,
  label,
  active = false,
  badge,
  href = "#",
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: string
  href?: string
  onClick?: () => void
}) {

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
        active
          ? "border border-cyan-400/10 bg-cyan-400/10 text-cyan-400"
          : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"
      }`}
    >

      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>


      {badge && (
        <span className="rounded-md bg-red-400/10 px-1.5 py-0.5 text-[9px] text-red-400">
          {badge}
        </span>
      )}

    </Link>
  )
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  change,
  positive,
  icon,
  description,
  danger = false,
}: {
  title: string
  value: string
  change: string
  positive?: boolean
  icon: React.ReactNode
  description: string
  danger?: boolean
}) {

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20">

      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/5 blur-2xl transition group-hover:bg-cyan-400/10" />


      <div className="relative">

        <div className="mb-5 flex items-center justify-between">

          <span className="text-xs text-slate-500">
            {title}
          </span>


          <div
            className={`rounded-lg p-2 ${
              danger
                ? "bg-red-400/10 text-red-400"
                : "bg-cyan-400/10 text-cyan-400"
            }`}
          >
            {icon}
          </div>

        </div>


        <div className="flex items-end justify-between">

          <div>

            <p className="text-2xl font-bold tracking-tight text-white">
              {value}
            </p>

            <p className="mt-1 text-[10px] text-slate-600">
              {description}
            </p>

          </div>


          <span
            className={`flex items-center gap-0.5 text-[10px] font-medium ${
              positive
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >

            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}

            {change}

          </span>

        </div>

      </div>

    </div>
  )
}


// ============================================================
// RISK ROW
// ============================================================

function RiskRow({
  label,
  value,
  count,
  dot,
}: {
  label: string
  value: string
  count: string
  dot: string
}) {

  return (
    <div className="flex items-center justify-between">

      <div className="flex items-center gap-3">

        <span
          className={`h-2 w-2 rounded-full ${dot}`}
        />

        <span className="text-xs text-slate-400">
          {label}
        </span>

      </div>


      <div className="flex items-center gap-4">

        <span className="text-xs text-slate-600">
          {count}
        </span>

        <span className="w-10 text-right text-xs font-semibold text-white">
          {value}
        </span>

      </div>

    </div>
  )
}


// ============================================================
// RISK SCORE
// ============================================================

function RiskScore({
  score,
}: {
  score: number
}) {

  const bar =
    score >= 70
      ? "bg-red-400"
      : score >= 40
        ? "bg-yellow-400"
        : "bg-emerald-400"


  const text =
    score >= 70
      ? "text-red-400"
      : score >= 40
        ? "text-yellow-400"
        : "text-emerald-400"


  return (
    <div className="flex items-center gap-3">

      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">

        <div
          className={`h-full rounded-full ${bar}`}
          style={{
            width: `${score}%`,
          }}
        />

      </div>


      <span
        className={`text-xs font-semibold ${text}`}
      >
        {score}
      </span>

    </div>
  )
}
