"""
UPI Sentinel - Supabase Database Service
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL:
    raise ValueError(
        "SUPABASE_URL is missing from .env"
    )

if not SUPABASE_KEY:
    raise ValueError(
        "SUPABASE_KEY is missing from .env"
    )


# ============================================================
# SUPABASE CLIENT
# ============================================================

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
)


# ============================================================
# SAVE TRANSACTION
# ============================================================

def save_transaction(transaction):
    raw_timestamp = transaction["timestamp"]
    if hasattr(raw_timestamp, "isoformat"):
        formatted_timestamp = raw_timestamp.isoformat()
    else:
        formatted_timestamp = str(raw_timestamp)

    data = {
        "transaction_id": transaction["transaction_id"],
        "user_id": transaction["user_id"],
        "timestamp": formatted_timestamp,
        "amount": transaction["amount"],
        "sender_id": transaction["sender_id"],
        "receiver_id": transaction["receiver_id"],
        "transaction_type": transaction["transaction_type"],
        "merchant_category": transaction["merchant_category"],
        "device_id": transaction["device_id"],
        "location": transaction["location"],
    }

    print("DATABASE DATA:", data)
    print("TIMESTAMP TYPE:", type(data["timestamp"]))

    response = (
        supabase
        .table("transactions")
        .insert(data)
        .execute()
    )

    return response.data


# ============================================================
# SAVE RISK RESULT
# ============================================================

def save_risk_result(
    transaction_id,
    result,
):
    """
    Store ML risk-scoring result.
    """

    data = {
        "transaction_id": transaction_id,
        "risk_score": result["risk_score"],
        "risk_level": result["risk_level"],
        "alert": result["alert"],
        "reasons": result["reasons"],
    }

    response = (
        supabase
        .table("risk_results")
        .insert(data)
        .execute()
    )

    return response.data


# ============================================================
# SAVE ALERT
# ============================================================

def save_alert(
    transaction_id,
    result,
):
    """
    Create an alert only when the risk
    score reaches the HIGH threshold.
    """

    if not result["alert"]:
        return None

    reasons = result["reasons"]

    reason_text = " | ".join(
        reasons
    )

    data = {
        "transaction_id": transaction_id,
        "severity": result["risk_level"],
        "reason": reason_text,
        "status": "OPEN",
    }

    response = (
        supabase
        .table("alerts")
        .insert(data)
        .execute()
    )

    return response.data


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

def get_dashboard_stats():
    """
    Get summary statistics for the dashboard.
    """

    # --------------------------------------------------------
    # TOTAL TRANSACTIONS
    # --------------------------------------------------------

    transactions_response = (
        supabase
        .table("transactions")
        .select(
            "transaction_id",
            count="exact",
        )
        .execute()
    )

    total_transactions = (
        transactions_response.count or 0
    )

    # --------------------------------------------------------
    # RISK RESULTS
    # --------------------------------------------------------

    risk_response = (
        supabase
        .table("risk_results")
        .select(
            "risk_score, risk_level"
        )
        .execute()
    )

    risk_data = risk_response.data or []

    # --------------------------------------------------------
    # HIGH RISK COUNT
    # --------------------------------------------------------

    high_risk = sum(
        1
        for row in risk_data
        if row["risk_level"] == "HIGH"
    )

    # --------------------------------------------------------
    # AVERAGE RISK
    # --------------------------------------------------------

    if risk_data:
        average_risk = round(
            sum(
                float(row["risk_score"])
                for row in risk_data
            )
            / len(risk_data),
            2,
        )
    else:
        average_risk = 0.0

    # --------------------------------------------------------
    # ACTIVE ALERTS
    # --------------------------------------------------------

    alerts_response = (
        supabase
        .table("alerts")
        .select(
            "id",
            count="exact",
        )
        .eq(
            "status",
            "OPEN",
        )
        .execute()
    )

    active_alerts = (
        alerts_response.count or 0
    )

    # --------------------------------------------------------
    # RETURN DASHBOARD DATA
    # --------------------------------------------------------

    return {
        "total_transactions": total_transactions,
        "high_risk": high_risk,
        "active_alerts": active_alerts,
        "average_risk": average_risk,
    }


# ============================================================
# RISK DISTRIBUTION
# ============================================================

def get_risk_distribution():
    """
    Get LOW, MEDIUM and HIGH risk transaction counts.
    """

    response = (
        supabase
        .table("risk_results")
        .select("risk_level")
        .execute()
    )

    data = response.data or []

    # --------------------------------------------------------
    # COUNT RISK LEVELS
    # --------------------------------------------------------

    low = sum(
        1
        for row in data
        if row["risk_level"] == "LOW"
    )

    medium = sum(
        1
        for row in data
        if row["risk_level"] == "MEDIUM"
    )

    high = sum(
        1
        for row in data
        if row["risk_level"] == "HIGH"
    )

    # --------------------------------------------------------
    # RETURN DISTRIBUTION
    # --------------------------------------------------------

    return {
        "low": low,
        "medium": medium,
        "high": high,
    }


# ============================================================
# GET TRANSACTIONS
# ============================================================

def get_transactions():
    """
    Get transactions along with their risk results.
    """

    response = (
        supabase
        .table("transactions")
        .select(
            """
            transaction_id,
            user_id,
            timestamp,
            amount,
            sender_id,
            receiver_id,
            transaction_type,
            merchant_category,
            device_id,
            location,
            risk_results(
                risk_score,
                risk_level,
                alert,
                reasons
            )
            """
        )
        .order(
            "timestamp",
            desc=True,
        )
        .execute()
    )

    return response.data or []


# ============================================================
# GET ALERTS
# ============================================================

def get_alerts():
    response = (
        supabase
        .table("alerts")
        .select(
            """
            id,
            transaction_id,
            severity,
            reason,
            status,
            created_at
            """
        )
        .order("created_at", desc=True)
        .execute()
    )

    return response.data or []