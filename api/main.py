"""
UPI Sentinel - FastAPI Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.schemas.transaction import (
    TransactionRequest,
    TransactionResponse,
)

from api.services.realtime_scoring import (
    score_transaction,
)

from api.services.database import (
    save_transaction,
    save_risk_result,
    save_alert,
    get_dashboard_stats,
    get_risk_distribution,
    get_transactions,
    get_alerts,
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="UPI Sentinel API",
    description=(
        "Anomaly-based UPI transaction "
        "risk detection and alerting system."
    ),
    version="1.0.0",
)
# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {
        "project": "UPI Sentinel",
        "status": "online",
        "message": (
            "UPI Fraud Risk Detection API"
        ),
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
    }


# ============================================================
# REAL-TIME TRANSACTION SCORING
# ============================================================

@app.post(
    "/api/v1/transactions/score",
    response_model=TransactionResponse,
)
def score_transaction_api(
    transaction: TransactionRequest,
):

    transaction_data = transaction.model_dump()

    # --------------------------------------------------------
    # Run ML scoring
    # --------------------------------------------------------

    result = score_transaction(
        transaction_data
    )

    # --------------------------------------------------------
    # Save transaction to Supabase
    # --------------------------------------------------------

    save_transaction(
        transaction_data
    )

    # --------------------------------------------------------
    # Save risk result to Supabase
    # --------------------------------------------------------

    save_risk_result(
        transaction_data["transaction_id"],
        result,
    )

    # --------------------------------------------------------
    # Create alert if HIGH risk
    # --------------------------------------------------------

    save_alert(
        transaction_data["transaction_id"],
        result,
    )

    return result


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

@app.get("/api/v1/dashboard/stats")
def dashboard_stats():

    return get_dashboard_stats()


# ============================================================
# RISK DISTRIBUTION
# ============================================================

@app.get("/api/v1/dashboard/risk-distribution")
def dashboard_risk_distribution():

    return get_risk_distribution()
# ============================================================
# TRANSACTIONS
# ============================================================

@app.get("/api/v1/transactions")
def transactions():

    return get_transactions()
@app.get("/api/v1/alerts")
def alerts():
    return get_alerts()