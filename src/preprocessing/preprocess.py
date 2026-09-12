"""
UPI Sentinel - Data Preprocessing

Loads the synthetic UPI transaction dataset,
cleans it, validates required fields, and saves
the processed dataset.
"""

from pathlib import Path

import pandas as pd


INPUT_FILE = Path("data/synthetic/upi_transactions.csv")
OUTPUT_FILE = Path("data/processed/upi_transactions_clean.csv")


REQUIRED_COLUMNS = [
    "transaction_id",
    "user_id",
    "timestamp",
    "amount",
    "sender_id",
    "receiver_id",
    "transaction_type",
    "merchant_category",
    "device_id",
    "location",
    "status",
    "is_anomaly_ground_truth",
    "anomaly_type",
]


def preprocess_data():

    print("=" * 60)
    print("UPI SENTINEL - DATA PREPROCESSING")
    print("=" * 60)

    # Load data
    df = pd.read_csv(INPUT_FILE)

    print(f"\nOriginal shape: {df.shape}")

    # --------------------------------------------------------
    # Validate columns
    # --------------------------------------------------------

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    # --------------------------------------------------------
    # Remove duplicate transactions
    # --------------------------------------------------------

    duplicate_count = df["transaction_id"].duplicated().sum()

    print(f"Duplicate transactions: {duplicate_count}")

    df = df.drop_duplicates(
        subset="transaction_id"
    )

    # --------------------------------------------------------
    # Convert timestamp
    # --------------------------------------------------------

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce",
    )

    # Remove rows with invalid timestamps
    df = df.dropna(subset=["timestamp"])

    # --------------------------------------------------------
    # Convert amount to numeric
    # --------------------------------------------------------

    df["amount"] = pd.to_numeric(
        df["amount"],
        errors="coerce",
    )

    # Remove invalid amounts
    df = df.dropna(subset=["amount"])

    # Transactions cannot have negative amounts
    df = df[df["amount"] > 0]

    # --------------------------------------------------------
    # Clean text columns
    # --------------------------------------------------------

    text_columns = [
        "user_id",
        "sender_id",
        "receiver_id",
        "transaction_type",
        "merchant_category",
        "device_id",
        "location",
        "status",
        "anomaly_type",
    ]

    for column in text_columns:
        df[column] = df[column].astype(str).str.strip()

    # --------------------------------------------------------
    # Sort chronologically
    # --------------------------------------------------------

    df = df.sort_values(
        "timestamp"
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # Create basic time features
    # --------------------------------------------------------

    df["hour"] = df["timestamp"].dt.hour

    df["day_of_week"] = df["timestamp"].dt.dayofweek

    df["day"] = df["timestamp"].dt.date

    df["is_weekend"] = (
        df["day_of_week"] >= 5
    ).astype(int)

    df["is_night"] = (
        (df["hour"] < 6)
        | (df["hour"] >= 23)
    ).astype(int)

    # --------------------------------------------------------
    # Save processed data
    # --------------------------------------------------------

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print(f"\nProcessed shape: {df.shape}")

    print(
        f"Missing values remaining: "
        f"{df.isna().sum().sum()}"
    )

    print(f"\nSaved to:")
    print(OUTPUT_FILE)

    print("\n" + "=" * 60)

    return df


if __name__ == "__main__":
    preprocess_data()
