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
    data = {
        "transaction_id": transaction["transaction_id"],
        "user_id": transaction["user_id"],
        "timestamp": transaction["timestamp"].isoformat(),
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