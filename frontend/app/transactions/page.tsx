"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Filter,
  MapPin,
  Monitor,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  User,
  X,
} from "lucide-react"


// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL = "http://127.0.0.1:8000"


// ============================================================
// TYPES
// ============================================================

type RiskLevel = "HIGH" | "MEDIUM" | "LOW"

type RiskResult = {
  risk_score: number
  risk_level: RiskLevel
  alert: boolean
  reasons: string[]
}

type Transaction = {
  transaction_id: string
  user_id: string
  timestamp: string
  amount: number
  sender_id: string
  receiver_id: string
  transaction_type: string
  merchant_category: string
  device_id: string
  location: string
  risk_results?: RiskResult[] | RiskResult | null
}


// ============================================================
// RISK BADGES
// ============================================================

const riskBadge = {
  HIGH: "border-red-500/30 bg-red-500/10 text-red-400",
  MEDIUM: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  LOW: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
}


// ============================================================
// PAGE
// ============================================================

export default function TransactionsPage() {

  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [loading, setLoading] =
    useState(true)

  const [apiError, setApiError] =
    useState(false)

  const [search, setSearch] =
    useState("")

  const [riskFilter, setRiskFilter] =
    useState<"ALL" | RiskLevel>("ALL")

  const [alertFilter, setAlertFilter] =
    useState<"ALL" | "ALERTS" | "CLEAR">("ALL")

  const [refreshing, setRefreshing] = useState(false)

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)


  // ==========================================================
  // FETCH TRANSACTIONS
  // ==========================================================

  async function fetchTransactions(
    showRefreshState = false
  ) {
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
        throw new Error(
          "Failed to fetch transactions"
        )
      }

      const data: Transaction[] =
        await response.json()

      setTransactions(data)

    } catch (error) {
      console.error(
        "Transactions API error:",
        error
      )

      setApiError(true)

    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])


  // ==========================================================
  // FILTER TRANSACTIONS
  // ==========================================================

  const filteredTransactions =
    useMemo(() => {

      return transactions.filter(
        (transaction) => {

          const risk =
            getRiskResult(transaction)

          const riskMatches =
            riskFilter === "ALL" ||
            risk?.risk_level === riskFilter

          const alertMatches =
            alertFilter === "ALL" ||
            (alertFilter === "ALERTS" && risk?.alert === true) ||
            (alertFilter === "CLEAR" && risk?.alert !== true)

          const searchValue =
            search.toLowerCase().trim()

          const searchableText = [
            transaction.transaction_id,
            transaction.user_id,
            transaction.receiver_id,
            transaction.sender_id,
            transaction.device_id,
            transaction.location,
            transaction.merchant_category,
          ]
            .join(" ")
            .toLowerCase()

          const searchMatches =
            !searchValue ||
            searchableText.includes(searchValue)

          return (
            riskMatches &&
            alertMatches &&
            searchMatches
          )
        }
      )

    }, [
      transactions,
      search,
      riskFilter,
      alertFilter,
    ])


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const highRiskCount =
    transactions.filter(
      (transaction) =>
        getRiskResult(transaction)
          ?.risk_level === "HIGH"
    ).length

  const mediumRiskCount =
    transactions.filter(
      (transaction) =>
        getRiskResult(transaction)
          ?.risk_level === "MEDIUM"
    ).length

  const lowRiskCount =
    transactions.filter(
      (transaction) =>
        getRiskResult(transaction)
          ?.risk_level === "LOW"
    ).length

  const alertCount =
    transactions.filter(
      (transaction) =>
        getRiskResult(transaction)?.alert === true
    ).length


  return (
    <main className="min-h-screen bg-[#07090d] text-slate-100">


      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#07090d]/90 px-5 backdrop-blur-xl lg:px-8">

        <div className="flex items-center gap-4">

          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-cyan-400/20 hover:text-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>


          <div>

            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Security Operations
            </p>

            <h1 className="text-lg font-semibold text-white">
              Transaction Intelligence
            </h1>

          </div>

        </div>


        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">

          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

          <span className="hidden text-xs text-emerald-400 sm:block">
            {apiError
              ? "API ERROR"
              : loading
                ? "LOADING"
                : "LIVE DATA"}
          </span>

        </div>

      </header>


      {/* ====================================================
          CONTENT
      ==================================================== */}

      <div className="mx-auto max-w-[1600px] p-5 lg:p-8">


        {/* Page heading */}

        <div className="mb-8">

          <div className="mb-2 flex items-center gap-2">

            <CreditCard className="h-4 w-4 text-cyan-400" />

            <span className="text-xs font-medium uppercase tracking-widest text-cyan-400">
              Transaction Monitoring
            </span>

          </div>


          <h2 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            All Transactions
          </h2>


          <p className="mt-2 text-sm text-slate-500">
            Monitor transaction behavior and ML-generated risk classifications.
          </p>

        </div>


        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">


          <SummaryCard
            label="Total Transactions"
            value={
              loading
                ? "..."
                : transactions.length.toLocaleString()
            }
            icon={
              <CreditCard className="h-5 w-5" />
            }
          />


          <SummaryCard
            label="High Risk"
            value={
              loading
                ? "..."
                : highRiskCount.toLocaleString()
            }
            icon={
              <ShieldAlert className="h-5 w-5" />
            }
            danger
          />


          <SummaryCard
            label="Medium Risk"
            value={
              loading
                ? "..."
                : mediumRiskCount.toLocaleString()
            }
            icon={
              <AlertTriangle className="h-5 w-5" />
            }
          />


          <SummaryCard
            label="Low Risk"
            value={
              loading
                ? "..."
                : lowRiskCount.toLocaleString()
            }
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />

          <SummaryCard
            label="Active Alerts"
            value={
              loading
                ? "..."
                : alertCount.toLocaleString()
            }
            icon={
              <ShieldAlert className="h-5 w-5" />
            }
            danger
          />

        </div>


        {/* =================================================
            FILTER BAR
        ================================================= */}

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">


            {/* Search */}

            <div className="relative w-full lg:max-w-md">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

              <input
                type="text"
                placeholder="Search transaction, user or recipient..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30"
              />

            </div>


            {/* Filters */}

            <div className="flex flex-wrap items-center gap-2">

              <div className="mr-1 flex items-center gap-2 text-xs text-slate-500">

                <Filter className="h-3.5 w-3.5" />

                Risk

              </div>


              {(
                ["ALL", "HIGH", "MEDIUM", "LOW"] as const
              ).map((filter) => (

                <button
                  key={filter}
                  onClick={() =>
                    setRiskFilter(filter)
                  }
                  className={`rounded-lg border px-3 py-2 text-[10px] font-semibold tracking-wider transition ${
                    riskFilter === filter
                      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-400"
                      : "border-white/10 bg-white/[0.02] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
                  }`}
                >
                  {filter}
                </button>

              ))}

              <div className="mx-1 h-5 w-px bg-white/10" />

              <div className="mr-1 text-xs text-slate-500">
                Alert
              </div>

              {(
                ["ALL", "ALERTS", "CLEAR"] as const
              ).map((filter) => (

                <button
                  key={filter}
                  onClick={() =>
                    setAlertFilter(filter)
                  }
                  className={`rounded-lg border px-3 py-2 text-[10px] font-semibold tracking-wider transition ${
                    alertFilter === filter
                      ? "border-red-400/20 bg-red-400/10 text-red-400"
                      : "border-white/10 bg-white/[0.02] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
                  }`}
                >
                  {filter === "ALERTS" ? "ACTIVE" : filter}
                </button>

              ))}

            </div>

          </div>

        </div>


        {/* =================================================
            TABLE
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">


          {/* Table header */}

          <div className="flex items-center justify-between border-b border-white/10 p-5 lg:p-6">

            <div>

              <h3 className="font-semibold text-white">
                Transaction Records
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {loading
                  ? "Loading transaction data..."
                  : `${filteredTransactions.length} transaction${filteredTransactions.length === 1 ? "" : "s"} displayed`}
              </p>

            </div>


            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={() => fetchTransactions(true)}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-400 transition hover:bg-white/[0.05] hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>

              <div className="hidden items-center gap-2 text-[10px] uppercase tracking-widest text-slate-600 sm:flex">

                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                Supabase

              </div>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1000px] text-left">


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
                    Type
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Risk Score
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Risk Level
                  </th>

                  <th className="px-6 py-4 font-medium">
                    Time
                  </th>

                  <th className="px-6 py-4 font-medium">
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading && (

                  <tr>

                    <td
                      colSpan={8}
                      className="px-6 py-16 text-center"
                    >

                      <div className="flex flex-col items-center gap-3">

                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />

                        <p className="text-xs text-slate-500">
                          Loading transactions...
                        </p>

                      </div>

                    </td>

                  </tr>

                )}


                {!loading &&
                  apiError && (

                    <tr>

                      <td
                        colSpan={8}
                        className="px-6 py-16 text-center"
                      >

                        <div className="flex flex-col items-center gap-3">

                          <AlertTriangle className="h-8 w-8 text-red-400" />

                          <p className="text-sm text-red-400">
                            Unable to connect to the transaction API.
                          </p>

                          <p className="text-xs text-slate-600">
                            Make sure FastAPI is running on port 8000.
                          </p>

                        </div>

                      </td>

                    </tr>

                  )}


                {!loading &&
                  !apiError &&
                  filteredTransactions.length === 0 && (

                    <tr>

                      <td
                        colSpan={8}
                        className="px-6 py-16 text-center"
                      >

                        <Search className="mx-auto mb-3 h-7 w-7 text-slate-700" />

                        <p className="text-sm text-slate-500">
                          No transactions found.
                        </p>

                        <p className="mt-1 text-xs text-slate-700">
                          Try changing your search or risk filter.
                        </p>

                      </td>

                    </tr>

                  )}


                {!loading &&
                  !apiError &&
                  filteredTransactions.map(
                    (transaction) => {

                      const risk =
                        getRiskResult(
                          transaction
                        )

                      return (

                        <tr
                          key={
                            transaction.transaction_id
                          }
                          onClick={() =>
                            setSelectedTransaction(
                              transaction
                            )
                          }
                          className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.025]"
                        >

                          <td className="px-6 py-4">

                            <span className="font-mono text-xs text-slate-300">
                              {
                                transaction.transaction_id
                              }
                            </span>

                          </td>


                          <td className="px-6 py-4">

                            <span className="text-xs text-slate-400">
                              {transaction.user_id}
                            </span>

                          </td>


                          <td className="px-6 py-4">

                            <span className="text-sm font-semibold text-white">
                              ₹
                              {Number(
                                transaction.amount
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </span>

                          </td>


                          <td className="px-6 py-4">

                            <span className="text-xs text-slate-500">
                              {
                                transaction.transaction_type
                              }
                            </span>

                          </td>


                          <td className="px-6 py-4">

                            {risk ? (
                              <RiskScore
                                score={
                                  Number(
                                    risk.risk_score
                                  )
                                }
                              />
                            ) : (
                              <span className="text-xs text-slate-700">
                                —
                              </span>
                            )}

                          </td>


                          <td className="px-6 py-4">

                            {risk ? (

                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wider ${
                                  riskBadge[
                                    risk.risk_level
                                  ]
                                }`}
                              >
                                {risk.risk_level}
                              </span>

                            ) : (
                              <span className="text-xs text-slate-700">
                                —
                              </span>
                            )}

                          </td>


                          <td className="px-6 py-4">

                            <span className="text-xs text-slate-600">
                              {formatDate(
                                transaction.timestamp
                              )}
                            </span>

                          </td>


                          <td className="px-6 py-4">

                            <ChevronRight className="h-4 w-4 text-slate-700" />

                          </td>

                        </tr>

                      )
                    }
                  )}

              </tbody>

            </table>

          </div>

        </div>


        {/* Footer */}

        <div className="mt-6 flex flex-col justify-between gap-2 border-t border-white/5 pt-5 text-[10px] text-slate-600 sm:flex-row">

          <span>
            UPI SENTINEL • Transaction Intelligence
          </span>

          <span>
            FastAPI • Supabase • ML Risk Engine
          </span>

        </div>

      </div>


      {/* ====================================================
          DETAIL DRAWER
      ==================================================== */}

      {selectedTransaction && (

        <div className="fixed inset-0 z-50">

          {/* Overlay */}

          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() =>
              setSelectedTransaction(null)
            }
          />


          {/* Drawer */}

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#0b0e13] shadow-2xl">


            {/* Drawer header */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b0e13]/95 p-5 backdrop-blur-xl">

              <div>

                <p className="text-[10px] uppercase tracking-widest text-slate-600">
                  Transaction Investigation
                </p>

                <h3 className="mt-1 font-mono text-sm font-semibold text-white">
                  {
                    selectedTransaction.transaction_id
                  }
                </h3>

              </div>


              <button
                onClick={() =>
                  setSelectedTransaction(null)
                }
                className="rounded-lg border border-white/10 p-2 text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

            </div>


            <div className="space-y-6 p-5">


              {/* Risk summary */}

              {(() => {

                const risk =
                  getRiskResult(
                    selectedTransaction
                  )

                return (

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">

                    <div className="mb-5 flex items-center justify-between">

                      <div>

                        <p className="text-xs text-slate-500">
                          ML Risk Score
                        </p>

                        <p
                          className={`mt-1 text-4xl font-bold ${
                            risk
                              ? risk.risk_level ===
                                "HIGH"
                                ? "text-red-400"
                                : risk.risk_level ===
                                    "MEDIUM"
                                  ? "text-yellow-400"
                                  : "text-emerald-400"
                              : "text-slate-500"
                          }`}
                        >
                          {risk
                            ? Number(
                                risk.risk_score
                              ).toFixed(2)
                            : "—"}
                        </p>

                      </div>


                      {risk && (

                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            riskBadge[
                              risk.risk_level
                            ]
                          }`}
                        >
                          {risk.risk_level}
                        </span>

                      )}

                    </div>


                    {risk?.alert ? (

                      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">

                        <ShieldAlert className="h-5 w-5 text-red-400" />

                        <div>

                          <p className="text-xs font-semibold text-red-400">
                            HIGH-RISK ALERT
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-600">
                            This transaction requires security review.
                          </p>

                        </div>

                      </div>

                    ) : risk ? (

                      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">

                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />

                        <div>

                          <p className="text-xs font-semibold text-emerald-400">
                            NO ACTIVE ALERT
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-600">
                            Risk result recorded without an active alert.
                          </p>

                        </div>

                      </div>

                    ) : null}

                  </div>

                )

              })()}


              {/* Transaction information */}

              <DetailSection
                title="Transaction Information"
                icon={
                  <CreditCard className="h-4 w-4" />
                }
              >

                <DetailRow
                  label="Transaction ID"
                  value={
                    selectedTransaction.transaction_id
                  }
                />

                <DetailRow
                  label="Amount"
                  value={`₹${Number(
                    selectedTransaction.amount
                  ).toLocaleString("en-IN")}`}
                />

                <DetailRow
                  label="Transaction Type"
                  value={
                    selectedTransaction.transaction_type
                  }
                />

                <DetailRow
                  label="Merchant Category"
                  value={
                    selectedTransaction.merchant_category
                  }
                />

                <DetailRow
                  label="Timestamp"
                  value={formatFullDate(
                    selectedTransaction.timestamp
                  )}
                />

              </DetailSection>


              {/* User information */}

              <DetailSection
                title="User & Account"
                icon={
                  <User className="h-4 w-4" />
                }
              >

                <DetailRow
                  label="User ID"
                  value={
                    selectedTransaction.user_id
                  }
                />

                <DetailRow
                  label="Sender"
                  value={
                    selectedTransaction.sender_id
                  }
                />

                <DetailRow
                  label="Receiver"
                  value={
                    selectedTransaction.receiver_id
                  }
                />

              </DetailSection>


              {/* Device */}

              <DetailSection
                title="Device & Location"
                icon={
                  <Monitor className="h-4 w-4" />
                }
              >

                <DetailRow
                  label="Device ID"
                  value={
                    selectedTransaction.device_id
                  }
                />

                <DetailRow
                  label="Location"
                  value={
                    selectedTransaction.location
                  }
                />

              </DetailSection>


              {/* Reasons */}

              {(() => {

                const risk =
                  getRiskResult(
                    selectedTransaction
                  )

                return (

                  <DetailSection
                    title="Detection Explanation"
                    icon={
                      <ShieldAlert className="h-4 w-4" />
                    }
                  >

                    {risk?.reasons &&
                    risk.reasons.length > 0 ? (

                      <div className="space-y-2">

                        {risk.reasons.map(
                          (reason, index) => (

                            <div
                              key={index}
                              className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                            >

                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />

                              <p className="text-xs leading-relaxed text-slate-400">
                                {reason}
                              </p>

                            </div>

                          )
                        )}

                      </div>

                    ) : (

                      <p className="text-xs text-slate-600">
                        No detection reasons available.
                      </p>

                    )}

                  </DetailSection>

                )

              })()}


              {/* Location indicator */}

              <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">

                <MapPin className="h-4 w-4 text-cyan-400" />

                <div>

                  <p className="text-[10px] uppercase tracking-widest text-slate-600">
                    Transaction Location
                  </p>

                  <p className="mt-1 text-xs text-slate-300">
                    {
                      selectedTransaction.location
                    }
                  </p>

                </div>

              </div>

            </div>

          </aside>

        </div>

      )}

    </main>
  )
}


// ============================================================
// GET RISK RESULT
// ============================================================

function getRiskResult(
  transaction: Transaction
): RiskResult | null {

  if (!transaction.risk_results) {
    return null
  }

  if (Array.isArray(
    transaction.risk_results
  )) {

    return (
      transaction.risk_results[0] ??
      null
    )
  }

  return transaction.risk_results
}


// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  label,
  value,
  icon,
  danger = false,
}: {
  label: string
  value: string
  icon: React.ReactNode
  danger?: boolean
}) {

  return (

    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20">

      <div className="mb-5 flex items-center justify-between">

        <span className="text-xs text-slate-500">
          {label}
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

      <p className="text-2xl font-bold tracking-tight text-white">
        {value}
      </p>

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
            width: `${Math.min(
              Math.max(score, 0),
              100
            )}%`,
          }}
        />

      </div>

      <span
        className={`text-xs font-semibold ${text}`}
      >
        {score.toFixed(1)}
      </span>

    </div>

  )
}


// ============================================================
// DETAIL SECTION
// ============================================================

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {

  return (

    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">

      <div className="mb-5 flex items-center gap-2">

        <span className="text-cyan-400">
          {icon}
        </span>

        <h4 className="text-sm font-semibold text-white">
          {title}
        </h4>

      </div>

      <div className="space-y-3">
        {children}
      </div>

    </section>

  )
}


// ============================================================
// DETAIL ROW
// ============================================================

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {

  return (

    <div className="flex items-start justify-between gap-5 border-b border-white/5 pb-3 last:border-0 last:pb-0">

      <span className="text-xs text-slate-600">
        {label}
      </span>

      <span className="text-right text-xs font-medium text-slate-300">
        {value}
      </span>

    </div>

  )
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
  timestamp: string
) {

  const date =
    new Date(timestamp)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return timestamp
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  )
}


function formatFullDate(
  timestamp: string
) {

  const date =
    new Date(timestamp)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return timestamp
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  )
}