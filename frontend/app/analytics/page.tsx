"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Clock3,
  LayoutDashboard,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { API_BASE_URL } from "@/lib/api"

type RiskResult = {
  risk_score: number
  risk_level: "HIGH" | "MEDIUM" | "LOW"
  alert: boolean
  reasons: string[]
}

type Transaction = {
  transaction_id: string
  user_id: string
  timestamp: string
  amount: number
  location: string
  device_id: string
  merchant_category: string
  risk_results?: RiskResult | RiskResult[] | null
}

type TrendPoint = {
  time: string
  high: number
  medium: number
  low: number
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: any) => {

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#10141b] px-4 py-3 shadow-2xl">

      <p className="mb-2 text-xs text-zinc-400">
        {label}
      </p>

      {payload.map((item: any) => (
        <div
          key={item.dataKey}
          className="flex items-center justify-between gap-6 text-sm"
        >
          <span className="text-zinc-300">
            {item.name}
          </span>

          <span className="font-semibold text-white">
            {item.value}
          </span>
        </div>
      ))}

    </div>
  )
}


export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState(false)

  async function fetchAnalytics(showRefreshState = false) {
    try {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setApiError(false)

      const response = await fetch(
        `${API_BASE_URL}/api/v1/transactions`
      )

      if (!response.ok) {
        throw new Error("Failed to fetch transactions")
      }

      const data: Transaction[] = await response.json()
      setTransactions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Analytics API error:", error)
      setApiError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const getRisk = (transaction: Transaction): RiskResult | null => {
    const result = transaction.risk_results

    if (Array.isArray(result)) {
      return result[0] ?? null
    }

    return result ?? null
  }

  const totalTransactions = transactions.length

  const highCount = transactions.filter(
    (transaction) =>
      getRisk(transaction)?.risk_level === "HIGH"
  ).length

  const mediumCount = transactions.filter(
    (transaction) =>
      getRisk(transaction)?.risk_level === "MEDIUM"
  ).length

  const lowCount = transactions.filter(
    (transaction) =>
      getRisk(transaction)?.risk_level === "LOW"
  ).length

  const scoredTransactions = transactions.filter(
    (transaction) => getRisk(transaction) !== null
  )

  const averageRisk = scoredTransactions.length
    ? scoredTransactions.reduce(
        (sum, transaction) =>
          sum + Number(getRisk(transaction)?.risk_score ?? 0),
        0
      ) / scoredTransactions.length
    : 0

  const alertCount = transactions.filter(
    (transaction) =>
      getRisk(transaction)?.alert === true
  ).length

  const riskDistribution = [
    { name: "Low", value: lowCount },
    { name: "Medium", value: mediumCount },
    { name: "High", value: highCount },
  ]

  const riskColors = [
    "#22c55e",
    "#f59e0b",
    "#ef4444",
  ]

  // These are the configured risk-engine weights.
  const detectionMethods = [
    { name: "Isolation Forest", value: 35 },
    { name: "Time-Series", value: 25 },
    { name: "IQR", value: 20 },
    { name: "Behavioral", value: 20 },
  ]

  const behaviorCounts = {
    "New Device": 0,
    "Location Change": 0,
    "New Recipient": 0,
    "Transaction Burst": 0,
    "Night Activity": 0,
  }

  transactions.forEach((transaction) => {
    const reasons = getRisk(transaction)?.reasons ?? []

    reasons.forEach((reason) => {
      const text = reason.toLowerCase()

      if (text.includes("new device")) {
        behaviorCounts["New Device"]++
      }

      if (text.includes("location")) {
        behaviorCounts["Location Change"]++
      }

      if (text.includes("recipient")) {
        behaviorCounts["New Recipient"]++
      }

      if (text.includes("burst")) {
        behaviorCounts["Transaction Burst"]++
      }

      if (text.includes("night")) {
        behaviorCounts["Night Activity"]++
      }
    })
  })

  const behaviorSignals = Object.entries(
    behaviorCounts
  ).map(([name, count]) => ({
    name,
    value: totalTransactions
      ? Math.min(
          100,
          Math.round(
            (count / totalTransactions) * 100
          )
        )
      : 0,
  }))

  const anomalyTrend = buildTrendData(
    transactions,
    getRisk
  )

  return (
    <main className="min-h-screen bg-[#07090d] text-white">

      <div className="mx-auto max-w-[1600px] p-6 lg:p-8">


        {apiError && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
            <div>
              <p className="text-xs font-medium text-red-400">
                Unable to load live analytics data.
              </p>
              <p className="mt-1 text-[10px] text-zinc-600">
                Check that the FastAPI backend is running.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchAnalytics(true)}
              className="rounded-lg border border-red-500/20 px-3 py-2 text-[10px] font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              Retry
            </button>
          </div>
        )}

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

          {/* Title */}

          <div>

            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-cyan-400">

              <BarChart3 className="h-4 w-4" />

              Detection Intelligence

            </div>


            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Analytics
            </h1>


            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Analyze anomaly signals, behavioral patterns and risk
              distribution across the UPI transaction network.
            </p>

          </div>


          {/* Header Actions */}

          <div className="flex flex-wrap items-center gap-3">

            <button
              type="button"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Activity
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>

            {/* Back To Dashboard */}

            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-400"
            >

              <LayoutDashboard className="h-4 w-4" />

              Back to Dashboard

            </Link>


            {/* Detection Status */}

            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">

              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              <span className="text-xs font-medium text-emerald-300">
                DETECTION ENGINE ACTIVE
              </span>

            </div>

          </div>

        </div>



        {/* =====================================================
            KPI CARDS
        ====================================================== */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">


          <MetricCard
            icon={Brain}
            title="Transactions Analyzed"
            value={
              loading
                ? "..."
                : totalTransactions.toLocaleString()
            }
            subtitle="Live transaction feed"
          />


          <MetricCard
            icon={Activity}
            title="Average Risk Score"
            value={
              loading
                ? "..."
                : averageRisk.toFixed(1)
            }
            subtitle="Across scored transactions"
          />


          <MetricCard
            icon={AlertTriangle}
            title="High Risk"
            value={
              loading
                ? "..."
                : highCount.toLocaleString()
            }
            subtitle="Transactions classified HIGH"
          />


          <MetricCard
            icon={Zap}
            title="Active Alerts"
            value={
              loading
                ? "..."
                : alertCount.toLocaleString()
            }
            subtitle="Alerts generated by engine"
          />

        </div>



        {/* =====================================================
            MAIN CHARTS
        ====================================================== */}

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">


          {/* Anomaly Trend */}

          <section className="rounded-2xl border border-white/10 bg-[#0b0e13] p-5 shadow-2xl shadow-black/10">

            <div className="mb-6 flex items-start justify-between">

              <div>

                <h2 className="font-semibold">
                  Anomaly Detection Activity
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Live risk classification across the transaction timeline
                </p>

              </div>


              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">

                <TrendingUp className="h-4 w-4 text-cyan-400" />

              </div>

            </div>


            <div className="h-[330px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <AreaChart data={anomalyTrend}>

                  <defs>

                    <linearGradient
                      id="iqrFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >

                      <stop
                        offset="0%"
                        stopOpacity={0.25}
                      />

                      <stop
                        offset="100%"
                        stopOpacity={0}
                      />

                    </linearGradient>


                    <linearGradient
                      id="isolationFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >

                      <stop
                        offset="0%"
                        stopOpacity={0.18}
                      />

                      <stop
                        offset="100%"
                        stopOpacity={0}
                      />

                    </linearGradient>

                  </defs>


                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />


                  <XAxis
                    dataKey="time"
                    stroke="#52525b"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />


                  <YAxis
                    stroke="#52525b"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />


                  <Tooltip
                    content={<CustomTooltip />}
                  />


                  <Area
                    type="monotone"
                    dataKey="high"
                    name="High Risk"
                    stroke="#f59e0b"
                    fill="url(#iqrFill)"
                    strokeWidth={2}
                  />


                  <Area
                    type="monotone"
                    dataKey="medium"
                    name="Medium Risk"
                    stroke="#8b5cf6"
                    fill="url(#isolationFill)"
                    strokeWidth={2}
                  />


                  <Area
                    type="monotone"
                    dataKey="low"
                    name="Low Risk"
                    stroke="#22d3ee"
                    fill="transparent"
                    strokeWidth={2}
                  />

                </AreaChart>

              </ResponsiveContainer>

            </div>


            <div className="mt-4 flex flex-wrap gap-5 text-xs text-zinc-400">

              <LegendDot label="High Risk" />

              <LegendDot label="Medium Risk" />

              <LegendDot label="Low Risk" />

            </div>

          </section>



          {/* =================================================
              RISK DISTRIBUTION
          ================================================== */}

          <section className="rounded-2xl border border-white/10 bg-[#0b0e13] p-5">

            <div className="mb-4">

              <h2 className="font-semibold">
                Risk Distribution
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Current transaction risk classification
              </p>

            </div>


            <div className="relative h-[270px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={105}
                    paddingAngle={4}
                    dataKey="value"
                  >

                    {riskDistribution.map((_, index) => (

                      <Cell
                        key={index}
                        fill={riskColors[index]}
                      />

                    ))}

                  </Pie>


                  <Tooltip
                    contentStyle={{
                      background: "#10141b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />

                </PieChart>

              </ResponsiveContainer>


              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">

                <span className="text-3xl font-bold">
                  {totalTransactions >= 1000
                    ? `${(totalTransactions / 1000).toFixed(1)}K`
                    : totalTransactions.toLocaleString()}
                </span>

                <span className="text-xs text-zinc-500">
                  Transactions
                </span>

              </div>

            </div>


            <div className="space-y-3">

              {riskDistribution.map((item, index) => (

                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >

                  <div className="flex items-center gap-2">

                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: riskColors[index],
                      }}
                    />

                    <span className="text-sm text-zinc-300">
                      {item.name} Risk
                    </span>

                  </div>


                  <span className="text-sm font-semibold">
                    {totalTransactions
                      ? `${Math.round(
                          (item.value / totalTransactions) * 100
                        )}%`
                      : "0%"}
                  </span>

                </div>

              ))}

            </div>

          </section>

        </div>



        {/* =====================================================
            LOWER ANALYTICS
        ====================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-2">


          {/* Detection Contribution */}

          <section className="rounded-2xl border border-white/10 bg-[#0b0e13] p-5">

            <div className="mb-6">

              <h2 className="font-semibold">
                Detection Contribution
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Configured weights used by the risk scoring engine
              </p>

            </div>


            <div className="h-[300px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={detectionMethods}
                  layout="vertical"
                  margin={{
                    left: 10,
                    right: 20,
                  }}
                >

                  <CartesianGrid
                    horizontal={false}
                    stroke="rgba(255,255,255,0.06)"
                  />


                  <XAxis
                    type="number"
                    domain={[0, 40]}
                    stroke="#52525b"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />


                  <YAxis
                    type="category"
                    dataKey="name"
                    width={105}
                    stroke="#52525b"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />


                  <Tooltip
                    cursor={{
                      fill: "rgba(255,255,255,0.03)",
                    }}
                    contentStyle={{
                      background: "#10141b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />


                  <Bar
                    dataKey="value"
                    radius={[0, 6, 6, 0]}
                    fill="#22d3ee"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </section>



          {/* Behavioral Signals */}

          <section className="rounded-2xl border border-white/10 bg-[#0b0e13] p-5">

            <div className="mb-6 flex items-start justify-between">

              <div>

                <h2 className="font-semibold">
                  Behavioral Anomaly Signals
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Frequency of suspicious behavioral indicators
                </p>

              </div>


              <ShieldAlert className="h-5 w-5 text-cyan-400" />

            </div>


            <div className="space-y-5">

              {behaviorSignals.map((signal) => (

                <div key={signal.name}>

                  <div className="mb-2 flex items-center justify-between">

                    <span className="text-sm text-zinc-300">
                      {signal.name}
                    </span>

                    <span className="text-xs font-semibold text-zinc-400">
                      {signal.value}%
                    </span>

                  </div>


                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">

                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all"
                      style={{
                        width: `${signal.value}%`,
                      }}
                    />

                  </div>

                </div>

              ))}

            </div>

          </section>

        </div>



        {/* =====================================================
            DETECTION PIPELINE
        ====================================================== */}

        <section className="mt-6 rounded-2xl border border-white/10 bg-[#0b0e13] p-5">

          <div className="mb-6">

            <h2 className="font-semibold">
              Anomaly Detection Pipeline
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              How UPI Sentinel converts transaction behavior into a risk score
            </p>

          </div>


          <div className="grid gap-3 md:grid-cols-5">

            <PipelineStep
              number="01"
              icon={Activity}
              title="Transaction"
              description="Incoming UPI event"
            />


            <PipelineStep
              number="02"
              icon={BarChart3}
              title="Features"
              description="Behavioral features"
            />


            <PipelineStep
              number="03"
              icon={Brain}
              title="Detection"
              description="Multiple anomaly models"
            />


            <PipelineStep
              number="04"
              icon={TrendingUp}
              title="Risk Score"
              description="Weighted risk engine"
            />


            <PipelineStep
              number="05"
              icon={ShieldAlert}
              title="Alert"
              description="High-risk notification"
            />

          </div>

        </section>



        {/* =====================================================
            FOOTER
        ====================================================== */}

        <div className="mt-5 flex items-center gap-2 text-xs text-zinc-600">

          <Clock3 className="h-3.5 w-3.5" />

          Analytics is connected to the live transaction feed.
          Detection-method weights remain configured in the risk engine.

        </div>


      </div>

    </main>
  )
}



function buildTrendData(
  transactions: Transaction[],
  getRisk: (
    transaction: Transaction
  ) => RiskResult | null
): TrendPoint[] {
  if (!transactions.length) return []

  const timestamps = transactions
    .map((transaction) =>
      new Date(transaction.timestamp).getTime()
    )
    .filter((timestamp) => Number.isFinite(timestamp))

  if (!timestamps.length) return []

  const bucketSize =
    4 * 60 * 60 * 1000

  const latest = Math.max(...timestamps)
  const start =
    latest - 6 * bucketSize

  return Array.from(
    { length: 7 },
    (_, index) => {
      const bucketStart =
        start + index * bucketSize

      const bucketEnd =
        bucketStart + bucketSize

      const bucket =
        transactions.filter((transaction) => {
          const timestamp =
            new Date(
              transaction.timestamp
            ).getTime()

          return (
            timestamp >= bucketStart &&
            timestamp < bucketEnd
          )
        })

      return {
        time: new Date(
          bucketStart
        ).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),

        high: bucket.filter(
          (transaction) =>
            getRisk(transaction)
              ?.risk_level === "HIGH"
        ).length,

        medium: bucket.filter(
          (transaction) =>
            getRisk(transaction)
              ?.risk_level === "MEDIUM"
        ).length,

        low: bucket.filter(
          (transaction) =>
            getRisk(transaction)
              ?.risk_level === "LOW"
        ).length,
      }
    }
  )
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: any
  title: string
  value: string
  subtitle: string
}) {

  return (

    <div className="group rounded-2xl border border-white/10 bg-[#0b0e13] p-5 transition hover:border-cyan-400/20">

      <div className="mb-5 flex items-center justify-between">

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">

          <Icon className="h-4 w-4 text-cyan-400" />

        </div>


        <span className="text-xs text-zinc-600">
          ENGINE
        </span>

      </div>


      <p className="text-sm text-zinc-400">
        {title}
      </p>


      <p className="mt-1 text-2xl font-bold tracking-tight">
        {value}
      </p>


      <p className="mt-1 text-xs text-zinc-600">
        {subtitle}
      </p>

    </div>

  )
}



/* =========================================================
   LEGEND DOT
========================================================= */

function LegendDot({
  label,
}: {
  label: string
}) {

  return (

    <div className="flex items-center gap-2">

      <span className="h-2 w-2 rounded-full bg-cyan-400" />

      {label}

    </div>

  )
}



/* =========================================================
   PIPELINE STEP
========================================================= */

function PipelineStep({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string
  icon: any
  title: string
  description: string
}) {

  return (

    <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-4">

      <div className="mb-4 flex items-center justify-between">

        <span className="text-[10px] font-semibold tracking-widest text-cyan-400">
          {number}
        </span>


        <Icon className="h-4 w-4 text-zinc-500" />

      </div>


      <p className="text-sm font-medium">
        {title}
      </p>


      <p className="mt-1 text-xs text-zinc-600">
        {description}
      </p>

    </div>

  )
}
