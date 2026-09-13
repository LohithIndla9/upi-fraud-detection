"use client"

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

const API_BASE_URL = "http://127.0.0.1:8000"

type Severity = "HIGH" | "MEDIUM" | "LOW"

type Alert = {
  id: number
  transactionId: string
  user: string
  score: number
  severity: Severity
  status: string
  reason: string
  details: string
  time: string
  location: string
  amount: number
}

type ApiAlert = {
  id: number
  transaction_id: string
  severity: string
  reason: string
  status: string
  created_at: string
}

const severityStyles = {
  HIGH: {
    badge: "border-red-500/30 bg-red-500/10 text-red-400",
    icon: "bg-red-500/10 text-red-400",
  },
  MEDIUM: {
    badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    icon: "bg-yellow-500/10 text-yellow-400",
  },
  LOW: {
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    icon: "bg-cyan-500/10 text-cyan-400",
  },
}

const statusStyles: Record<string, string> = {
  OPEN: "border-red-500/20 bg-red-500/5 text-red-400",
  REVIEW: "border-yellow-500/20 bg-yellow-500/5 text-yellow-400",
  RESOLVED: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("ALL")
  const [selected, setSelected] = useState<Alert | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState(false)

  async function fetchAlerts(showRefreshState = false) {
    try {
      if (showRefreshState) setRefreshing(true)
      else setLoading(true)

      setApiError(false)

      const response = await fetch(`${API_BASE_URL}/api/v1/alerts`)
      if (!response.ok) throw new Error("Failed to fetch alerts")

      const data: ApiAlert[] = await response.json()

      let transactions: Array<{
        transaction_id: string
        user_id: string
        amount: number
        location: string
        risk_results?: {
          risk_score: number
          risk_level: string
          alert: boolean
          reasons: string[]
        } | {
          risk_score: number
          risk_level: string
          alert: boolean
          reasons: string[]
        }[] | null
      }> = []

      try {
        const transactionResponse = await fetch(`${API_BASE_URL}/api/v1/transactions`)
        if (transactionResponse.ok) transactions = await transactionResponse.json()
      } catch {
        // Alerts remain usable even if enrichment is unavailable.
      }

      const getRisk = (value: typeof transactions[number]["risk_results"]) => {
        if (Array.isArray(value)) return value[0] ?? null
        return value ?? null
      }

      setAlerts(data.map((alert) => {
        const transaction = transactions.find(
          (item) => item.transaction_id === alert.transaction_id
        )
        const risk = transaction ? getRisk(transaction.risk_results) : null
        const createdAt = new Date(alert.created_at)

        return {
          id: alert.id,
          transactionId: alert.transaction_id,
          user: transaction?.user_id ?? "UNKNOWN",
          score: Number(risk?.risk_score ?? 0),
          severity:
            alert.severity === "HIGH" ||
            alert.severity === "MEDIUM" ||
            alert.severity === "LOW"
              ? alert.severity
              : "HIGH",
          status: alert.status,
          reason: alert.reason,
          details: alert.reason || "An anomaly-based risk alert was generated for this transaction.",
          time: Number.isNaN(createdAt.getTime())
            ? "Unknown"
            : formatRelativeTime(createdAt),
          location: transaction?.location ?? "Unknown",
          amount: Number(transaction?.amount ?? 0),
        }
      }))
    } catch (error) {
      console.error("Alerts API error:", error)
      setApiError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const filteredAlerts = useMemo(() => {
    const searchValue = search.toLowerCase().trim()

    return alerts.filter((alert) => {
      const matchesSearch =
        !searchValue ||
        String(alert.id).toLowerCase().includes(searchValue) ||
        alert.transactionId.toLowerCase().includes(searchValue) ||
        alert.user.toLowerCase().includes(searchValue) ||
        alert.reason.toLowerCase().includes(searchValue) ||
        alert.location.toLowerCase().includes(searchValue)

      const matchesFilter = filter === "ALL" || alert.severity === filter
      return matchesSearch && matchesFilter
    })
  }, [alerts, search, filter])

  const highRisk = alerts.filter((alert) => alert.severity === "HIGH").length
  const openAlerts = alerts.filter((alert) => alert.status === "OPEN").length
  const resolved = alerts.filter((alert) => alert.status === "RESOLVED").length

  return (
    <main className="min-h-screen bg-[#07090d] text-slate-100">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0b0e13]">
        <div className="flex h-20 items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
            >
              <ShieldAlert className="h-4 w-4" />
            </a>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-red-400">
                Security Operations
              </p>

              <h1 className="text-lg font-semibold text-white">
                Alert Center
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchAlerts(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-400 transition hover:bg-white/[0.05] hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="hidden text-xs text-emerald-400 sm:block">
                Monitoring Active
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-5 lg:p-8">
        {/* Heading */}
        <div className="mb-7">
          <div className="mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-red-400" />

            <span className="text-xs uppercase tracking-widest text-red-400">
              Threat Detection
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            Security Alerts
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Review suspicious transaction activity identified by the anomaly
            detection engine.
          </p>
        </div>

        {/* Statistics */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <AlertStat
            icon={<AlertTriangle className="h-5 w-5" />}
            label="High Risk Alerts"
            value={highRisk.toString()}
            danger
          />

          <AlertStat
            icon={<Clock3 className="h-5 w-5" />}
            label="Open Alerts"
            value={openAlerts.toString()}
          />

          <AlertStat
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Resolved"
            value={resolved.toString()}
            success
          />
        </div>

        {/* Controls */}
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alert, transaction or user..."
              className="w-full rounded-lg border border-white/10 bg-black/20 py-2.5 pl-10 pr-4 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="h-4 w-4 shrink-0 text-slate-600" />

            {["ALL", "HIGH", "MEDIUM"].map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`rounded-lg border px-3 py-2 text-[10px] font-semibold tracking-wider transition ${
                  filter === level
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-400"
                    : "border-white/10 text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {apiError && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
            <div>
              <p className="text-xs font-medium text-red-400">
                Unable to load live alerts
              </p>
              <p className="mt-1 text-[10px] text-slate-600">
                Check that the FastAPI backend is running.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchAlerts(true)}
              className="rounded-lg border border-red-500/20 px-3 py-2 text-[10px] font-semibold text-red-400 hover:bg-red-500/10"
            >
              Retry
            </button>
          </div>
        )}

        {/* Alert feed */}
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-20 text-center">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-400" />
              <p className="text-sm font-medium text-white">
                Loading security alerts...
              </p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 py-20 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-7 w-7 text-emerald-400" />
              <p className="text-sm font-medium text-white">
                No matching alerts
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Try changing your search or filter.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {

            const severity =
              severityStyles[
                alert.severity as keyof typeof severityStyles
              ]

            return (
              <button
                key={`ALT_${String(alert.id).padStart(5, "0")}`}
                onClick={() => setSelected(alert)}
                className="group flex w-full flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.035] lg:flex-row lg:items-center"
              >
                {/* Icon */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${severity.icon}`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>

                {/* Main information */}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-white">
                      {`ALT_${String(alert.id).padStart(5, "0")}`}
                    </span>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wider ${severity.badge}`}
                    >
                      {alert.severity}
                    </span>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wider ${
                        statusStyles[alert.status] ??
                        "border-white/10 bg-white/[0.03] text-slate-400"
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-300">
                    {alert.reason}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-slate-600">
                    <span>{alert.transactionId}</span>
                    <span>{alert.user}</span>
                    <span>{alert.time}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center gap-5 lg:w-48 lg:justify-end">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-600">
                      Risk Score
                    </p>

                    <p
                      className={`mt-1 text-xl font-bold ${
                        alert.score >= 70
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {alert.score}
                    </p>
                  </div>

                  <div className="h-2 w-20 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${
                        alert.score >= 70
                          ? "bg-red-400"
                          : "bg-yellow-400"
                      }`}
                      style={{
                        width: `${alert.score}%`,
                      }}
                    />
                  </div>
                </div>
              </button>
            )
            })
          )}
        </div>

      {/* Alert details drawer */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />

          <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0b0e13] p-6 shadow-2xl">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-red-400">
                  Alert Investigation
                </p>

                <h3 className="mt-2 font-mono text-lg font-semibold text-white">
                  {selected.id}
                </h3>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-white/10 p-2 text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Risk score */}
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6">
              <p className="text-[10px] uppercase tracking-widest text-slate-600">
                Detected Risk
              </p>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-5xl font-bold text-red-400">
                    {selected.score}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Risk score / 100
                  </p>
                </div>

                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-semibold tracking-wider text-red-400">
                  {selected.severity} RISK
                </span>
              </div>
            </div>

            {/* Transaction info */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02]">
              <DetailRow
                label="Transaction"
                value={selected.transactionId}
              />

              <DetailRow
                label="User"
                value={selected.user}
              />

              <DetailRow
                label="Amount"
                value={`₹${selected.amount.toLocaleString("en-IN")}`}
              />

              <DetailRow
                label="Location"
                value={selected.location}
              />

              <DetailRow
                label="Status"
                value={selected.status}
              />

              <DetailRow
                label="Detected"
                value={selected.time}
              />
            </div>

            {/* Explanation */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-cyan-400" />

                <p className="text-[10px] uppercase tracking-widest text-cyan-400">
                  Detection Explanation
                </p>
              </div>

              <p className="text-sm leading-relaxed text-slate-400">
                {selected.details}
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  )
}

function formatRelativeTime(date: Date) {
  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000)
  )

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

function AlertStat({
  icon,
  label,
  value,
  danger = false,
  success = false,
}: {
  icon: ReactNode
  label: string
  value: string
  danger?: boolean
  success?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div
        className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${
          danger
            ? "bg-red-500/10 text-red-400"
            : success
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-cyan-400/10 text-cyan-400"
        }`}
      >
        {icon}
      </div>

      <p className="text-xs text-slate-600">{label}</p>

      <p
        className={`mt-1 text-2xl font-bold ${
          danger
            ? "text-red-400"
            : success
              ? "text-emerald-400"
              : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 last:border-0">
      <span className="text-xs text-slate-600">{label}</span>

      <span className="max-w-[220px] truncate text-right text-xs text-slate-300">
        {value}
      </span>
    </div>
  )
}