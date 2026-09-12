import pandas as pd
from datetime import timedelta

# Load dataset
df = pd.read_csv("data/synthetic/upi_transactions.csv")

# Convert timestamp
df["timestamp"] = pd.to_datetime(df["timestamp"])

# Only burst anomalies
burst_df = df[
    df["anomaly_type"] == "TRANSACTION_BURST"
].copy()

burst_df = burst_df.sort_values(
    ["user_id", "timestamp"]
)

max_count = 0
best_user = None
best_timestamps = []

# Check every burst user
for user_id, group in burst_df.groupby("user_id"):

    timestamps = group["timestamp"].tolist()

    for i in range(len(timestamps)):

        start_time = timestamps[i]
        end_time = start_time + timedelta(minutes=10)

        count = sum(
            1
            for timestamp in timestamps
            if start_time <= timestamp <= end_time
        )

        if count > max_count:
            max_count = count
            best_user = user_id
            best_timestamps = [
                timestamp
                for timestamp in timestamps
                if start_time <= timestamp <= end_time
            ]

print("=" * 60)
print("TRANSACTION BURST VALIDATION")
print("=" * 60)

print(f"\nTotal burst transactions : {len(burst_df)}")
print(f"Unique burst users       : {burst_df['user_id'].nunique()}")
print(
    f"Maximum transactions for one user "
    f"within 10 minutes       : {max_count}"
)

if best_user:
    print(f"\nExample burst user: {best_user}")

    print("\nTransactions within 10-minute window:")

    for timestamp in best_timestamps:
        print(timestamp)

if max_count >= 4:
    print("\nSUCCESS: Burst generation is working.")
    print("The time-series detector should be able to detect these bursts.")
else:
    print("\nPROBLEM: No user has 4+ transactions within 10 minutes.")

print("\n" + "=" * 60)