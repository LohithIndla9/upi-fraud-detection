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
# BURST CONFIGURATION
# ============================================================

# 20 burst groups × 4 transactions = 80 burst anomalies.
# Each group is generated for the same user within a few minutes.
BURST_GROUPS = 20
BURST_SIZE = 4


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
    "P2P",
    "P2M",
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
    anomaly_type=None,
):
    """
    Generate suspicious transaction behavior.

    anomaly_type can be explicitly supplied for controlled
    burst generation. Otherwise, a random anomaly type is used.
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

    if anomaly_type is None:
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

        # Keep amounts somewhat elevated but not extreme.
        amount = user["avg_amount"] * random.uniform(1.2, 3)

        # Timestamp is controlled by generate_dataset().
        # Burst transactions belonging to the same group are
        # placed only a few seconds apart.
        timestamp = timestamp

    # --------------------------------------------------------
    # 3. NEW DEVICE
    # --------------------------------------------------------

    elif anomaly_type == "NEW_DEVICE":

        amount = user["avg_amount"] * random.uniform(2, 5)

        device_id = (
            f"UNKNOWN_DEV{random.randint(10000, 99999)}"
        )

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

        receiver_id = (
            f"NEW_RECIPIENT_{random.randint(10000, 99999)}"
        )

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

        device_id = (
            f"UNKNOWN_DEV{random.randint(10000, 99999)}"
        )

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

    # --------------------------------------------------------
    # Create users
    # --------------------------------------------------------

    users = create_user_profiles()

    transactions = []

    # --------------------------------------------------------
    # Start date
    # --------------------------------------------------------

    start_date = datetime(2026, 1, 1)

    # --------------------------------------------------------
    # Determine number of anomalies
    # --------------------------------------------------------

    num_anomalies = int(
        NUM_TRANSACTIONS * ANOMALY_RATE
    )

    # --------------------------------------------------------
    # Create anomaly indices
    # --------------------------------------------------------

    anomaly_indices = set(
        random.sample(
            range(NUM_TRANSACTIONS),
            num_anomalies,
        )
    )

    # --------------------------------------------------------
    # Create controlled transaction-burst groups
    # --------------------------------------------------------

    burst_indices = set()
    burst_user_map = {}
    burst_timestamp_map = {}

    # We create consecutive groups of 4 transactions.
    # Each group belongs to the same user and occurs within
    # a few minutes.

    possible_starts = list(
        range(
            0,
            NUM_TRANSACTIONS - BURST_SIZE,
            BURST_SIZE + 10,
        )
    )

    random.shuffle(possible_starts)

    selected_starts = possible_starts[:BURST_GROUPS]

    # Make sure these indices are anomaly indices.
    # If necessary, replace normal indices with them while
    # keeping the total anomaly count exactly 500.

    selected_burst_indices = []

    for start in selected_starts:

        group_indices = list(
            range(
                start,
                start + BURST_SIZE,
            )
        )

        selected_burst_indices.extend(group_indices)

    # We need exactly BURST_GROUPS * BURST_SIZE burst anomalies.
    burst_count = BURST_GROUPS * BURST_SIZE

    # Replace randomly selected anomaly positions with burst positions.
    non_burst_anomaly_indices = [
        index
        for index in anomaly_indices
        if index not in selected_burst_indices
    ]

    # Select enough additional anomaly indices if needed.
    if len(selected_burst_indices) > burst_count:
        selected_burst_indices = selected_burst_indices[:burst_count]

    # Remove burst positions from normal pool and build final set.
    burst_indices = set(selected_burst_indices)

    # Make all burst indices anomalies.
    anomaly_indices.update(burst_indices)

    # If this increased anomaly count beyond target, remove
    # non-burst anomaly indices.
    while len(anomaly_indices) > num_anomalies:

        removable = [
            index
            for index in anomaly_indices
            if index not in burst_indices
        ]

        remove_index = random.choice(removable)
        anomaly_indices.remove(remove_index)

    # --------------------------------------------------------
    # Assign a user to each burst group
    # --------------------------------------------------------

    for group_number, start in enumerate(selected_starts):

        group_indices = list(
            range(
                start,
                start + BURST_SIZE,
            )
        )

        # Skip if any group index was not retained.
        if not all(
            index in anomaly_indices
            for index in group_indices
        ):
            continue

        user = users.iloc[
            random.randint(0, NUM_USERS - 1)
        ]

        base_time = None

        for offset, index in enumerate(group_indices):

            burst_user_map[index] = user

            # 30-90 seconds between burst transactions.
            # Four transactions therefore fit comfortably
            # inside the 10-minute detection window.
            if offset == 0:
                burst_timestamp_map[index] = None
            else:
                pass

    # --------------------------------------------------------
    # Generate transactions
    # --------------------------------------------------------

    current_time = start_date

    active_burst_base_time = {}

    for i in range(NUM_TRANSACTIONS):

        transaction_number = i + 1

        # ----------------------------------------------------
        # BURST TRANSACTION
        # ----------------------------------------------------

        if i in burst_user_map:

            user = burst_user_map[i]

            # Identify the beginning of this burst group.
            group_start = i - (i % BURST_SIZE)

            if group_start not in active_burst_base_time:

                # Start the burst at the current global time.
                active_burst_base_time[group_start] = (
                    current_time
                )

            base_time = active_burst_base_time[group_start]

            position_in_burst = i - group_start

            # 60-120 seconds apart.
            # Maximum ~6 minutes for four transactions.
            burst_timestamp = (
                base_time
                + timedelta(
                    seconds=position_in_burst
                    * random.randint(60, 120)
                )
            )

            transaction = generate_anomalous_transaction(
                user=user,
                transaction_number=transaction_number,
                timestamp=burst_timestamp,
                anomaly_type="TRANSACTION_BURST",
            )

        else:

            # ------------------------------------------------
            # Move normal global time forward
            # ------------------------------------------------

            current_time += timedelta(
                seconds=random.randint(30, 300)
            )

            # ------------------------------------------------
            # Select user
            # ------------------------------------------------

            user = users.iloc[
                random.randint(0, NUM_USERS - 1)
            ]

            # ------------------------------------------------
            # Other anomaly
            # ------------------------------------------------

            if i in anomaly_indices:

                transaction = generate_anomalous_transaction(
                    user=user,
                    transaction_number=transaction_number,
                    timestamp=current_time,
                )

            # ------------------------------------------------
            # Normal transaction
            # ------------------------------------------------

            else:

                transaction = generate_normal_transaction(
                    user=user,
                    transaction_number=transaction_number,
                    timestamp=current_time,
                )

        transactions.append(transaction)

    # --------------------------------------------------------
    # Convert to DataFrame
    # --------------------------------------------------------

    df = pd.DataFrame(transactions)

    # --------------------------------------------------------
    # Sort chronologically
    # --------------------------------------------------------

    df = df.sort_values("timestamp")

    df = df.reset_index(drop=True)

    # --------------------------------------------------------
    # Ensure timestamp format
    # --------------------------------------------------------

    df["timestamp"] = pd.to_datetime(
        df["timestamp"]
    )

    # --------------------------------------------------------
    # Create output directory
    # --------------------------------------------------------

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # --------------------------------------------------------
    # Save CSV
    # --------------------------------------------------------

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

    print(
        f"Total transactions : {len(df):,}"
    )

    print(
        f"Normal transactions : {normal_count:,}"
    )

    print(
        f"Anomalous transactions : {anomaly_count:,}"
    )

    print(
        f"Actual anomaly rate : "
        f"{anomaly_count / len(df):.2%}"
    )

    print("\nSaved to:")
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