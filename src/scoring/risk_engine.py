"""
UPI Sentinel - Risk Scoring Engine

Combines:
1. IQR anomaly signal
2. Isolation Forest signal
3. Time-series anomaly signal
4. Behavioral signals

into a single 0-100 risk score.
"""

from pathlib import Path

import numpy as np
import pandas as pd


INPUT_FILE = Path(
    "data/processed/upi_transactions_timeseries.csv"
)

OUTPUT_FILE = Path(
    "data/processed/upi_transactions_scored.csv"
)


# ============================================================
# RISK WEIGHTS
# ============================================================

IQR_WEIGHT = 0.20
ISOLATION_WEIGHT = 0.35
TIME_SERIES_WEIGHT = 0.25
BEHAVIOR_WEIGHT = 0.20


def calculate_behavior_score(row):
    """
    Calculate a behavioral risk score from 0-100.

    The score considers:
    - New device
    - Location change
    - New recipient
    - Transaction burst
    - Night transaction
    """

    score = 0

    # New device
    if row["is_new_device"] == 1:
        score += 30

    # Location change
    if row["is_location_change"] == 1:
        score += 20

    # New recipient
    if row["is_new_recipient"] == 1:
        score += 15

    # Transaction burst
    if row["is_transaction_burst"] == 1:
        score += 20

    # Night transaction
    if row["is_night"] == 1:
        score += 15

    return min(score, 100)


def calculate_risk_score(row):
    """
    Combine anomaly signals into a final risk score.
    """

    # --------------------------------------------------------
    # Individual model scores
    # --------------------------------------------------------

    iqr_score = row["iqr_score"]

    isolation_score = row[
        "isolation_forest_score"
    ]

    time_series_score = row[
        "time_series_score"
    ]

    behavior_score = row[
        "behavior_score"
    ]

    # --------------------------------------------------------
    # Weighted combination
    # --------------------------------------------------------

    risk_score = (
        iqr_score * IQR_WEIGHT
        + isolation_score * ISOLATION_WEIGHT
        + time_series_score * TIME_SERIES_WEIGHT
        + behavior_score * BEHAVIOR_WEIGHT
    )

    return round(
        min(max(risk_score, 0), 100),
        2,
    )


def assign_risk_level(score):
    """
    Convert numerical score to risk category.
    """

    if score >= 70:
        return "HIGH"

    if score >= 40:
        return "MEDIUM"

    return "LOW"


def generate_alert(row):
    """
    Generate alert decision.
    """

    return int(
        row["risk_score"] >= 70
    )


def generate_reasons(row):
    """
    Generate human-readable reasons explaining
    why the transaction was considered risky.
    """

    reasons = []

    if row["iqr_anomaly"] == 1:
        reasons.append(
            "Transaction amount is a statistical outlier"
        )

    if row["isolation_forest_anomaly"] == 1:
        reasons.append(
            "Transaction shows unusual combined behavior"
        )

    if row["time_series_anomaly"] == 1:
        reasons.append(
            "Unusual transaction activity detected over time"
        )

    if row["is_new_device"] == 1:
        reasons.append(
            "New device detected"
        )

    if row["is_location_change"] == 1:
        reasons.append(
            "Location changed from previous transaction"
        )

    if row["is_new_recipient"] == 1:
        reasons.append(
            "New recipient detected"
        )

    if row["is_transaction_burst"] == 1:
        reasons.append(
            "Multiple transactions occurred within a short period"
        )

    if row["is_night"] == 1:
        reasons.append(
            "Transaction occurred during unusual night hours"
        )

    if not reasons:
        reasons.append(
            "No significant anomaly signals detected"
        )

    return " | ".join(reasons)


def main():

    print("=" * 60)
    print("UPI SENTINEL - RISK SCORING ENGINE")
    print("=" * 60)

    # --------------------------------------------------------
    # Load data
    # --------------------------------------------------------

    df = pd.read_csv(
        INPUT_FILE,
        parse_dates=["timestamp"],
    )

    print(f"\nInput shape: {df.shape}")

    # --------------------------------------------------------
    # Behavioral score
    # --------------------------------------------------------

    print("\nCalculating behavioral risk scores...")

    df["behavior_score"] = (
        df.apply(
            calculate_behavior_score,
            axis=1,
        )
    )

    # --------------------------------------------------------
    # Final risk score
    # --------------------------------------------------------

    print("Calculating combined risk scores...")

    df["risk_score"] = (
        df.apply(
            calculate_risk_score,
            axis=1,
        )
    )

    # --------------------------------------------------------
    # Risk level
    # --------------------------------------------------------

    df["risk_level"] = (
        df["risk_score"]
        .apply(assign_risk_level)
    )

    # --------------------------------------------------------
    # Alert
    # --------------------------------------------------------

    df["alert"] = (
        df.apply(
            generate_alert,
            axis=1,
        )
    )

    # --------------------------------------------------------
    # Explainability
    # --------------------------------------------------------

    df["alert_reason"] = (
        df.apply(
            generate_reasons,
            axis=1,
        )
    )

    # --------------------------------------------------------
    # Results
    # --------------------------------------------------------

    print("\nRisk Distribution")
    print("-" * 40)

    print(
        df["risk_level"]
        .value_counts()
    )

    print("\nAlerts generated:")
    print(
        f"{df['alert'].sum():,}"
    )

    # --------------------------------------------------------
    # Ground truth comparison
    # --------------------------------------------------------

    if "is_anomaly_ground_truth" in df.columns:

        actual = (
            df["is_anomaly_ground_truth"] == 1
        )

        predicted = (
            df["alert"] == 1
        )

        true_positive = (
            actual & predicted
        ).sum()

        false_positive = (
            (~actual) & predicted
        ).sum()

        false_negative = (
            actual & (~predicted)
        ).sum()

        true_negative = (
            (~actual) & (~predicted)
        ).sum()

        precision = (
            true_positive
            / (true_positive + false_positive)
            if (true_positive + false_positive)
            else 0
        )

        recall = (
            true_positive
            / (true_positive + false_negative)
            if (true_positive + false_negative)
            else 0
        )

        if precision + recall > 0:

            f1 = (
                2
                * precision
                * recall
                / (precision + recall)
            )

        else:

            f1 = 0

        print("\nModel Evaluation")
        print("-" * 40)

        print(
            f"True positives : {true_positive:,}"
        )

        print(
            f"False positives: {false_positive:,}"
        )

        print(
            f"False negatives: {false_negative:,}"
        )

        print(
            f"True negatives : {true_negative:,}"
        )

        print(
            f"\nPrecision: {precision:.2%}"
        )

        print(
            f"Recall:    {recall:.2%}"
        )

        print(
            f"F1 Score:  {f1:.2%}"
        )

    # --------------------------------------------------------
    # Show high-risk examples
    # --------------------------------------------------------

    print("\nTop 10 highest-risk transactions")
    print("-" * 40)

    top_risk = (
        df.sort_values(
            "risk_score",
            ascending=False,
        )
        [
            [
                "transaction_id",
                "user_id",
                "amount",
                "risk_score",
                "risk_level",
                "alert",
            ]
        ]
        .head(10)
    )

    print(top_risk.to_string(index=False))

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    print("\nScored dataset saved to:")
    print(OUTPUT_FILE)

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()