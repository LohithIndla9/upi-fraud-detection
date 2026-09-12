"""
UPI Sentinel - FastAPI Backend
"""

from fastapi import FastAPI

from api.schemas.transaction import (
    TransactionRequest,
    TransactionResponse,
)

from api.services.realtime_scoring import (
    score_transaction,
)


app = FastAPI(
    title="UPI Sentinel API",
    description=(
        "Anomaly-based UPI transaction "
        "risk detection and alerting system."
    ),
    version="1.0.0",
)


@app.get("/")
def root():

    return {
        "project": "UPI Sentinel",
        "status": "online",
        "message": (
            "UPI Fraud Risk Detection API"
        ),
    }


@app.get("/health")
def health_check():

    return {
        "status": "healthy",
    }


@app.post(
    "/api/v1/transactions/score",
    response_model=TransactionResponse,
)
def score_transaction_api(
    transaction: TransactionRequest,
):

    result = score_transaction(
        transaction.model_dump()
    )

    return result