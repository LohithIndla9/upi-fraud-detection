from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_transactions: int
    high_risk: int
    active_alerts: int
    average_risk: float


class RiskDistribution(BaseModel):
    low: int
    medium: int
    high: int