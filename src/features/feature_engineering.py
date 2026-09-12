"""
UPI Sentinel - Behavioral Feature Engineering

Creates transaction-level behavioral features used by:
- IQR
- Isolation Forest
- Time-series anomaly detection
- Risk scoring
"""

from pathlib import Path

import numpy as np
import pandas as pd


INPUT_FILE = Path(
    "data/processed/upi_transactions_clean.csv"
)

OUTPUT_FILE = Path(
    "data/processed/upi_transactions_features.csv"
)


def create_features(df):

    df = df.copy()

    # Ensure chronological order
    df = df.sort_values(
        ["user_id", "timestamp"]
    ).reset_index(drop=True)

    # ========================================================
    # 1. USER TRANSACTION HISTORY
    # ========================================================

    # Previous transaction amount
    df["previous_amount"] = (
        df.groupby("user_id")["amount"]
        .shift(1)
    )

    # Previous transaction timestamp
    df["previous_timestamp"] = (
        df.groupby("user_id")["timestamp"]
        .shift(1)
    )

    # Time since previous transaction in minutes
    df["minutes_since_previous"] = (
        (
            df["timestamp"]
            - df["previous_timestamp"]
        )
        .dt.total_seconds()
        / 60
    )

    # First transaction for each user
    df["minutes_since_previous"] = (
        df["minutes_since_previous"]
        .fillna(1440)
    )

    # ========================================================
    # 2. USER AMOUNT BASELINE
    # ========================================================

    # Historical mean excluding current transaction
    df["user_mean_amount"] = (
        df.groupby("user_id")["amount"]
        .transform(
            lambda x: x.shift(1).expanding().mean()
        )
    )

    # Historical median excluding current transaction
    df["user_median_amount"] = (
        df.groupby("user_id")["amount"]
        .transform(
            lambda x: x.shift(1).expanding().median()
        )
    )

    # Fill first transaction with global median
    global_median = df["amount"].median()

    df["user_mean_amount"] = (
        df["user_mean_amount"]
        .fillna(global_median)
    )

    df["user_median_amount"] = (
        df["user_median_amount"]
        .fillna(global_median)
    )

    # ========================================================
    # 3. AMOUNT DEVIATION
    # ========================================================

    df["amount_to_user_mean"] = (
        df["amount"]
        / df["user_mean_amount"].replace(0, np.nan)
    )

    df["amount_deviation"] = (
        df["amount"]
        - df["user_mean_amount"]
    )

    df["amount_deviation"] = (
        df["amount_deviation"]
        .fillna(0)
    )

    # ========================================================
    # 4. TRANSACTION FREQUENCY
    # ========================================================

    # Number of previous transactions by user
    df["user_transaction_count"] = (
        df.groupby("user_id")
        .cumcount()
    )

    # ========================================================
    # 5. NEW DEVICE DETECTION
    # ========================================================

    # First device ever observed for user
    df["first_device"] = (
        df.groupby("user_id")["device_id"]
        .transform("first")
    )

    df["is_new_device"] = (
        df["device_id"]
        != df["first_device"]
    ).astype(int)

    # ========================================================
    # 6. LOCATION CHANGE
    # ========================================================

    df["previous_location"] = (
        df.groupby("user_id")["location"]
        .shift(1)
    )

    df["is_location_change"] = (
        (
            df["previous_location"].notna()
        )
        & (
            df["location"]
            != df["previous_location"]
        )
    ).astype(int)

    # ========================================================
    # 7. RECIPIENT HISTORY
    # ========================================================

    # Whether recipient has appeared previously for this user
    df["recipient_pair"] = (
        df["user_id"]
        + "_"
        + df["receiver_id"]
    )

    df["recipient_transaction_count"] = (
        df.groupby("recipient_pair")
        .cumcount()
    )

    df["is_new_recipient"] = (
        df["recipient_transaction_count"] == 0
    ).astype(int)

    # ========================================================
    # 8. TIME FEATURES
    # ========================================================

    df["hour_sin"] = np.sin(
        2 * np.pi * df["hour"] / 24
    )

    df["hour_cos"] = np.cos(
        2 * np.pi * df["hour"] / 24
    )

    # ========================================================
    # 9. FREQUENCY BURST
    # ========================================================

    # Transactions occurring very close together
    df["is_transaction_burst"] = (
        df["minutes_since_previous"] <= 1
    ).astype(int)

    # ========================================================
    # 10. LOG AMOUNT
    # ========================================================

    # Useful because transaction amounts are highly skewed
    df["log_amount"] = np.log1p(
        df["amount"]
    )

    # ========================================================
    # CLEANUP
    # ========================================================

    # Replace infinite values
    df = df.replace(
        [np.inf, -np.inf],
        np.nan,
    )

    # Fill numerical missing values
    numeric_columns = df.select_dtypes(
        include=["number"]
    ).columns

    df[numeric_columns] = (
        df[numeric_columns]
        .fillna(0)
    )

    return df


def main():

    print("=" * 60)
    print("UPI SENTINEL - FEATURE ENGINEERING")
    print("=" * 60)

    # Load processed dataset
    df = pd.read_csv(
        INPUT_FILE,
        parse_dates=["timestamp"],
    )

    print(f"\nInput shape: {df.shape}")

    # Create features
    df = create_features(df)

    # Save
    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    # ========================================================
    # SUMMARY
    # ========================================================

    print(f"\nOutput shape: {df.shape}")

    print("\nNew behavioral features:")

    feature_columns = [
        "previous_amount",
        "minutes_since_previous",
        "user_mean_amount",
        "user_median_amount",
        "amount_to_user_mean",
        "amount_deviation",
        "user_transaction_count",
        "is_new_device",
        "is_location_change",
        "recipient_transaction_count",
        "is_new_recipient",
        "is_transaction_burst",
        "log_amount",
    ]

    for feature in feature_columns:
        print(f"  ✓ {feature}")

    print("\nSaved to:")
    print(OUTPUT_FILE)

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
