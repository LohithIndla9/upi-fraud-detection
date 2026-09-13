"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Flame,
  LayoutDashboard,
  MapPin,
  Play,
  RefreshCw,
  Shield,
  ShieldAlert,
  Smartphone,
  Sparkles,
  TrendingUp,
  User,
  Zap,
} from "lucide-react"

import { API_BASE_URL } from "@/lib/api"

type RiskResponse = {
  transaction_id: string
  risk_score: number
  risk_level: "HIGH" | "MEDIUM" | "LOW"
  alert: boolean
  reasons: string[]
}

type TestPreset = {
  name: string
  description: string
  badge: string
  data: {
    user_id: string
    amount: number
    sender_id: string
    receiver_id: string
    transaction_type: string
    merchant_category: string
    device_id: string
    location: string
  }
}

const TEST_PRESETS: TestPreset[] = [
  {
    name: "Normal P2P Payment",
    description: "Typical daytime coffee payment to known friend",
    badge: "LOW RISK EXPECTED",
    data: {
      user_id: "USER0001",
      amount: 250,
      sender_id: "USER0001",
      receiver_id: "USER0002",
      transaction_type: "P2P",
      merchant_category: "Food",
      device_id: "DEV_TRUSTED_01",
      location: "Mumbai",
    },
  },
  {
    name: "Statistical Amount Outlier (IQR)",
    description: "Extremely large transfer exceeding IQR boundary",
    badge: "MEDIUM/HIGH RISK",
    data: {
      user_id: "USER0001",
      amount: 45000,
      sender_id: "USER0001",
      receiver_id: "MERCHANT_JEWELRY",
      transaction_type: "P2M",
      merchant_category: "Shopping",
      device_id: "DEV_TRUSTED_01",
      location: "Mumbai",
    },
  },
  {
    name: "New Device + Location Change",
    description: "Transaction from unfamiliar hardware in another city",
    badge: "BEHAVIORAL ANOMALY",
    data: {
      user_id: "USER0001",
      amount: 8500,
      sender_id: "USER0001",
      receiver_id: "UNKNOWN_REC_88",
      transaction_type: "UPI",
      merchant_category: "Shopping",
      device_id: "NEW_PHONE_ROUGE_99",
      location: "Kolkata",
    },
  },
  {
    name: "High-Risk Combined Attack",
    description: "Huge midnight payment, new device & untrusted recipient",
    badge: "HIGH RISK ALERT",
    data: {
      user_id: "USER0001",
      amount: 95000,
      sender_id: "USER0001",
      receiver_id: "MULE_ACCOUNT_666",
      transaction_type: "P2P",
      merchant_category: "Shopping",
      device_id: "EMULATOR_DEV_XYZ",
      location: "Unknown",
    },
  },
]

export default function TestScoringPage() {
  const [formData, setFormData] = useState({
    transaction_id: `TXN_SIM_${Date.now().toString().slice(-6)}`,
    user_id: "USER0001",
    amount: "15000",
    sender_id: "USER0001",
    receiver_id: "MERCHANT_999",
    transaction_type: "P2P",
    merchant_category: "Shopping",
    device_id: "DEVICE_NEW_01",
    location: "Mumbai",
  })

  const [scoring, setScoring] = useState(false)
  const [result, setResult] = useState<RiskResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  function applyPreset(preset: TestPreset) {
    setFormData({
      transaction_id: `TXN_SIM_${Date.now().toString().slice(-6)}`,
      user_id: preset.data.user_id,
      amount: preset.data.amount.toString(),
      sender_id: preset.data.sender_id,
      receiver_id: preset.data.receiver_id,
      transaction_type: preset.data.transaction_type,
      merchant_category: preset.data.merchant_category,
      device_id: preset.data.device_id,
      location: preset.data.location,
    })
    setResult(null)
    setError(null)
  }

  async function handleScore(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setScoring(true)
    setError(null)
    setStatusMessage("Running ML Risk Engine (IQR + Isolation Forest + Time Series + Behavioral)...")

    try {
      const payload = {
        transaction_id: formData.transaction_id.trim() || `TXN_${Date.now()}`,
        user_id: formData.user_id.trim(),
        timestamp: new Date().toISOString(),
        amount: parseFloat(formData.amount) || 1.0,
        sender_id: formData.sender_id.trim(),
        receiver_id: formData.receiver_id.trim(),
        transaction_type: formData.transaction_type.trim(),
        merchant_category: formData.merchant_category.trim(),
        device_id: formData.device_id.trim(),
        location: formData.location.trim(),
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/transactions/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(
          errJson?.detail
            ? typeof errJson.detail === "string"
              ? errJson.detail
              : JSON.stringify(errJson.detail)
            : `Server returned status ${res.status}`
        )
      }

      const scoreData: RiskResponse = await res.json()
      setResult(scoreData)
      setStatusMessage("Transaction scored & committed to Supabase database.")
    } catch (err: any) {
      console.error("Scoring error:", err)
      setError(err?.message || "Failed to score transaction.")
      setStatusMessage(null)
    } finally {
      setScoring(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#07090d]/90 px-5 backdrop-blur-xl lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-cyan-400/20 hover:text-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400">
              Live Testing Console
            </p>
            <h1 className="text-lg font-semibold text-white">
              Real-Time Transaction Risk Scoring Simulator
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/transactions"
            className="hidden items-center gap-1 text-xs text-slate-400 transition hover:text-white sm:flex"
          >
            Transactions
            <ChevronRight className="h-3 w-3" />
          </Link>
          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            <span className="text-xs text-cyan-400">FastAPI & Supabase Connected</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-[1600px] p-5 lg:p-8">
        {/* Intro */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-medium uppercase tracking-widest text-cyan-400">
              Anomaly Simulator
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            Simulate & Score UPI Transactions
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Submit transactions to the live FastAPI backend. The scoring engine evaluates the
            transaction against the trained Isolation Forest model, IQR boundaries, time-series windows,
            and behavioral heuristics, then automatically records the findings in Supabase.
          </p>
        </div>

        {/* Preset Scenarios */}
        <div className="mb-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick Test Scenarios
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {TEST_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-cyan-400/40 hover:bg-white/[0.04]"
              >
                <div>
                  <span className="mb-2 inline-block rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-400">
                    {preset.badge}
                  </span>
                  <h4 className="text-sm font-semibold text-white group-hover:text-cyan-400">
                    {preset.name}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">{preset.description}</p>
                </div>
                <p className="mt-3 text-[11px] font-medium text-slate-400">
                  ₹{preset.data.amount.toLocaleString("en-IN")} • {preset.data.location}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Two column layout: Form and Results */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-cyan-400" />
                <h3 className="font-semibold text-white">Transaction Parameters</h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    transaction_id: `TXN_SIM_${Date.now().toString().slice(-6)}`,
                  }))
                }
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400"
              >
                <RefreshCw className="h-3 w-3" />
                New ID
              </button>
            </div>

            <form onSubmit={handleScore} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Transaction ID</label>
                  <input
                    type="text"
                    required
                    value={formData.transaction_id}
                    onChange={(e) =>
                      setFormData({ ...formData, transaction_id: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-400/40"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-400">User ID</label>
                  <input
                    type="text"
                    required
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-400/40"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Amount (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-cyan-400/40"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-400">Transaction Type</label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) =>
                      setFormData({ ...formData, transaction_type: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400/40"
                  >
                    <option value="P2P">P2P (Person to Person)</option>
                    <option value="P2M">P2M (Person to Merchant)</option>
                    <option value="UPI">UPI Payment</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Sender ID</label>
                  <input
                    type="text"
                    required
                    value={formData.sender_id}
                    onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-400">Receiver ID</label>
                  <input
                    type="text"
                    required
                    value={formData.receiver_id}
                    onChange={(e) => setFormData({ ...formData, receiver_id: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Category</label>
                  <select
                    value={formData.merchant_category}
                    onChange={(e) =>
                      setFormData({ ...formData, merchant_category: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400/40"
                  >
                    <option value="Shopping">Shopping</option>
                    <option value="Food">Food & Dining</option>
                    <option value="Grocery">Grocery</option>
                    <option value="Travel">Travel</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Bills">Bills & Utility</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-400">Device ID</label>
                  <input
                    type="text"
                    required
                    value={formData.device_id}
                    onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-400">Location</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={scoring}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scoring ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Executing Risk Models...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    Calculate Risk Score
                  </>
                )}
              </button>

              {statusMessage && (
                <p className="mt-2 text-center text-xs text-slate-400">{statusMessage}</p>
              )}
            </form>
          </div>

          {/* Result Panel */}
          <div className="flex flex-col gap-6">
            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-sm font-semibold text-red-400">Scoring Engine Error</p>
                    <p className="mt-1 text-xs text-slate-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {result ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">
                      Scoring Verdict
                    </p>
                    <h3 className="font-mono text-sm font-semibold text-white">
                      {result.transaction_id}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wider ${
                      result.risk_level === "HIGH"
                        ? "border-red-500/40 bg-red-500/10 text-red-400"
                        : result.risk_level === "MEDIUM"
                          ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {result.risk_level} RISK
                  </span>
                </div>

                {/* Score visual */}
                <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500">ML Anomaly Risk Score</p>
                      <p
                        className={`mt-1 text-5xl font-extrabold ${
                          result.risk_level === "HIGH"
                            ? "text-red-400"
                            : result.risk_level === "MEDIUM"
                              ? "text-yellow-400"
                              : "text-emerald-400"
                        }`}
                      >
                        {result.risk_score.toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">
                        Alert Threshold
                      </p>
                      <p className="text-xs font-medium text-slate-400">&ge; 30.00 Trigger Alert</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full transition-all duration-500 ${
                        result.risk_level === "HIGH"
                          ? "bg-red-400"
                          : result.risk_level === "MEDIUM"
                            ? "bg-yellow-400"
                            : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(result.risk_score, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Alert Notification Status */}
                {result.alert ? (
                  <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <ShieldAlert className="h-6 w-6 text-red-400" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">Security Alert Triggered</p>
                      <p className="mt-0.5 text-xs text-slate-300">
                        This transaction triggered an OPEN alert in Supabase and was forwarded for security review.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">Transaction Cleared</p>
                      <p className="mt-0.5 text-xs text-slate-300">
                        No critical anomaly detected. Recorded in transaction history.
                      </p>
                    </div>
                  </div>
                )}

                {/* Explainability reasons */}
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Detection Signals & Explainability
                  </h4>
                  <div className="space-y-2">
                    {result.reasons && result.reasons.length > 0 ? (
                      result.reasons.map((reason, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                        >
                          <span className="h-2 w-2 rounded-full bg-cyan-400" />
                          <p className="text-xs text-slate-300">{reason}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No anomaly flags triggered.</p>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                  <Link
                    href="/transactions"
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-cyan-400" />
                    View in Transactions
                  </Link>

                  {result.alert && (
                    <Link
                      href="/alerts"
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/20"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      View in Alerts
                    </Link>
                  )}

                  <Link
                    href="/"
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 text-cyan-400" />
                    Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
                <Sparkles className="mb-4 h-10 w-10 text-slate-700" />
                <h4 className="text-base font-medium text-slate-400">Ready to Score</h4>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-600">
                  Select a preset scenario above or customize transaction details, then click
                  &quot;Calculate Risk Score&quot; to test real-time detection.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
