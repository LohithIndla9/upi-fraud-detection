"""
UPI Sentinel - Synthetic UPI Transaction Generator

Generates realistic synthetic UPI transactions with:
- Normal user behavior
- Behavioral patterns
- Device and location information
- Transaction timing
- Injected suspicious/anomalous behavior
- Ground-truth labels for later evaluation

Output:
    data/synthetic/upi_transactions.csv
"""

import random
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

NUM_USERS = 1000
NUM_TRANSACTIONS = 10_000

# Approximately 5% of transactions will contain injected
# suspicious behavior.
ANOMALY_RATE = 0.05

RANDOM_SEED = 42

OUTPUT_DIR = Path("data/synthetic")
OUTPUT_FILE = OUTPUT_DIR / "upi_transactions.csv"


# ============================================================
# REPRODUCIBILITY
# ============================================================

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


# ============================================================
# MASTER DATA
# ============================================================

CITIES = [
    "Bengaluru",
    "Mumbai",
    "Delhi",
    "Hyderabad",
    "Chennai",
    "Pune",
    "Kolkata",
    "Ahmedabad",
]

TRANSACTION_TYPES = [
    "P2P",       # Person to Person
    "P2M",       # Person to Merchant
    "BILL_PAYMENT",
    "RECHARGE",
]

MERCHANT_CATEGORIES = [
    "Grocery",
    "Food",
    "Shopping",
    "Travel",
    "Utilities",
    "Entertainment",
    "Healthcare",
]

STATUSES = [
    "SUCCESS",
    "SUCCESS",
    "SUCCESS",
    "SUCCESS",
    "FAILED",
]


# ============================================================
# USER PROFILES
# ============================================================

def create_user_profiles():
    """
    Create behavioral profiles for users.

    Each user has:
    - Typical transaction amount
    - Preferred city
    - Device
    - Spending tendency
    """

    users = []

    for i in range(NUM_USERS):

        user_id = f"USER{i + 1:04d}"

        # Individual spending behavior
        avg_amount = np.random.lognormal(
            mean=np.log(1000),
            sigma=0.55
        )

        avg_amount = np.clip(avg_amount, 100, 10_000)

        preferred_city = random.choice(CITIES)

        device_id = f"DEV{i + 1:04d}"

        users.append(
            {
                "user_id": user_id,
                "avg_amount": round(avg_amount, 2),
                "preferred_city": preferred_city,
                "device_id": device_id,
            }
        )

    return pd.DataFrame(users)


# ============================================================
# NORMAL TRANSACTION GENERATION
# ============================================================

def generate_normal_transaction(
    user,
    transaction_number,
    timestamp,
):
    """
    Generate one normal transaction for a user.
    """

    user_id = user["user_id"]

    # Amount centered around user's normal behavior
    amount = np.random.normal(
        loc=user["avg_amount"],
        scale=user["avg_amount"] * 0.35,
    )

    amount = max(20, amount)

    receiver_number = random.randint(1, 500)

    receiver_id = f"MERCHANT{receiver_number:04d}"

    transaction_type = random.choice(TRANSACTION_TYPES)

    merchant_category = random.choice(MERCHANT_CATEGORIES)

    city = user["preferred_city"]

    device_id = user["device_id"]

    status = random.choice(STATUSES)

    return {
        "transaction_id": f"TXN{transaction_number:06d}",
        "user_id": user_id,
        "timestamp": timestamp,
        "amount": round(amount, 2),
        "sender_id": user_id,
        "receiver_id": receiver_id,
        "transaction_type": transaction_type,
        "merchant_category": merchant_category,
        "device_id": device_id,
        "location": city,
        "status": status,
        "is_anomaly_ground_truth": 0,
        "anomaly_type": "NORMAL",
    }


# ============================================================
# ANOMALOUS TRANSACTIONS
# ============================================================

def generate_anomalous_transaction(
    user,
    transaction_number,
    timestamp,
):
    """
    Generate suspicious transaction behavior.

    Several different anomaly scenarios are injected.
    """

    user_id = user["user_id"]

    anomaly_types = [
        "HIGH_AMOUNT",
        "TRANSACTION_BURST",
        "NEW_DEVICE",
        "LOCATION_CHANGE",
        "NEW_RECIPIENT",
        "COMBINED_BEHAVIOR",
    ]

    anomaly_type = random.choice(anomaly_types)

    # Start with normal values
    amount = user["avg_amount"]
    city = user["preferred_city"]
    device_id = user["device_id"]

    receiver_id = f"MERCHANT{random.randint(1, 500):04d}"

    transaction_type = random.choice(TRANSACTION_TYPES)

    merchant_category = random.choice(MERCHANT_CATEGORIES)

    # --------------------------------------------------------
    # 1. HIGH AMOUNT
    # --------------------------------------------------------

    if anomaly_type == "HIGH_AMOUNT":

        amount = user["avg_amount"] * random.uniform(8, 20)

    # --------------------------------------------------------
    # 2. TRANSACTION BURST
    # --------------------------------------------------------

    elif anomaly_type == "TRANSACTION_BURST":

        amount = user["avg_amount"] * random.uniform(1.2, 3)

        # Timestamp will be close to another transaction.
        timestamp = timestamp + timedelta(
            seconds=random.randint(1, 20)
        )

    # --------------------------------------------------------
    # 3. NEW DEVICE
    # --------------------------------------------------------

    elif anomaly_type == "NEW_DEVICE":

        amount = user["avg_amount"] * random.uniform(2, 5)

        device_id = f"UNKNOWN_DEV{random.randint(10000, 99999)}"

    # --------------------------------------------------------
    # 4. LOCATION CHANGE
    # --------------------------------------------------------

    elif anomaly_type == "LOCATION_CHANGE":

        amount = user["avg_amount"] * random.uniform(2, 5)

        different_cities = [
            city_name
            for city_name in CITIES
            if city_name != user["preferred_city"]
        ]

        city = random.choice(different_cities)

    # --------------------------------------------------------
    # 5. NEW RECIPIENT
    # --------------------------------------------------------

    elif anomaly_type == "NEW_RECIPIENT":

        amount = user["avg_amount"] * random.uniform(3, 8)

        receiver_id = f"NEW_RECIPIENT_{random.randint(10000, 99999)}"

    # --------------------------------------------------------
    # 6. COMBINED BEHAVIOR
    # --------------------------------------------------------

    elif anomaly_type == "COMBINED_BEHAVIOR":

        amount = user["avg_amount"] * random.uniform(10, 25)

        different_cities = [
            city_name
            for city_name in CITIES
            if city_name != user["preferred_city"]
        ]

        city = random.choice(different_cities)

        device_id = f"UNKNOWN_DEV{random.randint(10000, 99999)}"

        receiver_id = (
            f"NEW_RECIPIENT_{random.randint(10000, 99999)}"
        )

    return {
        "transaction_id": f"TXN{transaction_number:06d}",
        "user_id": user_id,
        "timestamp": timestamp,
        "amount": round(max(amount, 20), 2),
        "sender_id": user_id,
        "receiver_id": receiver_id,
        "transaction_type": transaction_type,
        "merchant_category": merchant_category,
        "device_id": device_id,
        "location": city,
        "status": "SUCCESS",
        "is_anomaly_ground_truth": 1,
        "anomaly_type": anomaly_type,
    }


# ============================================================
# DATASET GENERATOR
# ============================================================

def generate_dataset():

    print("=" * 60)
    print("UPI SENTINEL - SYNTHETIC DATA GENERATOR")
    print("=" * 60)

    print(f"\nUsers: {NUM_USERS:,}")
    print(f"Transactions: {NUM_TRANSACTIONS:,}")
    print(f"Target anomaly rate: {ANOMALY_RATE:.1%}")

    # Create users
    users = create_user_profiles()

    transactions = []

    # Start date
    start_date = datetime(2026, 1, 1)

    # Determine number of anomalies
    num_anomalies = int(
        NUM_TRANSACTIONS * ANOMALY_RATE
    )

    anomaly_indices = set(
        random.sample(
            range(NUM_TRANSACTIONS),
            num_anomalies,
        )
    )

    # Generate transactions
    current_time = start_date

    for i in range(NUM_TRANSACTIONS):

        # Move time forward
        current_time += timedelta(
            seconds=random.randint(30, 300)
        )

        user = users.iloc[
            random.randint(0, NUM_USERS - 1)
        ]

        transaction_number = i + 1

        if i in anomaly_indices:

            transaction = generate_anomalous_transaction(
                user=user,
                transaction_number=transaction_number,
                timestamp=current_time,
            )

        else:

            transaction = generate_normal_transaction(
                user=user,
                transaction_number=transaction_number,
                timestamp=current_time,
            )

        transactions.append(transaction)

    # Convert to DataFrame
    df = pd.DataFrame(transactions)

    # Sort chronologically
    df = df.sort_values("timestamp")

    # Reset index
    df = df.reset_index(drop=True)

    # Ensure timestamp format
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # Create output directory
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Save CSV
    df.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    # ========================================================
    # SUMMARY
    # ========================================================

    anomaly_count = int(
        df["is_anomaly_ground_truth"].sum()
    )

    normal_count = len(df) - anomaly_count

    print("\nDataset generated successfully!")
    print("-" * 60)

    print(f"Total transactions : {len(df):,}")
    print(f"Normal transactions : {normal_count:,}")
    print(f"Anomalous transactions : {anomaly_count:,}")

    print(
        f"Actual anomaly rate : "
        f"{anomaly_count / len(df):.2%}"
    )

    print(f"\nSaved to:")
    print(OUTPUT_FILE)

    print("\nAnomaly distribution:")
    print(
        df.loc[
            df["is_anomaly_ground_truth"] == 1,
            "anomaly_type",
        ].value_counts()
    )

    print("\nFirst 5 transactions:")
    print(df.head())

    print("\nDataset shape:")
    print(df.shape)

    print("\nColumns:")
    print(list(df.columns))

    print("\n" + "=" * 60)

    return df


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    generate_dataset()
