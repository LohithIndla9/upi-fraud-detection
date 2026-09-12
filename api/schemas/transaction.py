from datetime import datetime

from pydantic import BaseModel, Field


class TransactionRequest(BaseModel):

    transaction_id: str

    user_id: str

    timestamp: datetime

    amount: float = Field(
        ...,
        gt=0,
        description="Transaction amount in INR"
    )

    sender_id: str

    receiver_id: str

    transaction_type: str

    merchant_category: str

    device_id: str

    location: str


class TransactionResponse(BaseModel):

    transaction_id: str

    risk_score: float

    risk_level: str

    alert: bool

    reasons: list[str]