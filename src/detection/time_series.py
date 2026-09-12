"""
UPI Sentinel - Time-Series Anomaly Detection

Detects unusual transaction activity by analyzing
transaction frequency over time.
"""

from pathlib import Path

import numpy as np
import pandas as pd


INPUT_FILE = Path(
    "data/processed/upi_transactions_isolation_forest.csv"
)

OUTPUT_FILE = Path(
    "data/processed/upi_transactions_timeseries.csv"
)


def detect_time_series_anomalies(df):

    df = df.copy()

    # --------------------------------------------------------
    # Prepare timestamp
    # --------------------------------------------------------

    df["timestamp"] = pd.to_datetime(
        df["timestamp"]
    )

    df = df.sort_values(
        "timestamp"
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # Transactions per 10-minute window
    # --------------------------------------------------------

    df["time_window"] = (
        df["timestamp"]
        .dt.floor("10min")
    )

    window_counts = (
        df.groupby("time_window")
        .size()
        .rename("transactions_in_window")
    )

    df = df.merge(
        window_counts,
        left_on="time_window",
        right_index=True,
        how="left",
    )

    # --------------------------------------------------------
    # Rolling baseline
    # --------------------------------------------------------

    # Use the previous windows to establish a baseline.
    # shift(1) prevents the current window from influencing
    # its own baseline.

    window_stats = (
        window_counts
        .to_frame()
        .sort_index()
    )

    window_stats["rolling_mean"] = (
        window_stats["transactions_in_window"]
        .rolling(
            window=12,
            min_periods=3,
        )
        .mean()
        .shift(1)
    )

    window_stats["rolling_std"] = (
        window_stats["transactions_in_window"]
        .rolling(
            window=12,
            min_periods=3,
        )
        .std()
        .shift(1)
    )

    df = df.merge(
        window_stats[
            [
                "rolling_mean",
                "rolling_std",
            ]
        ],
        left_on="time_window",
        right_index=True,
        how="left",
    )

    # --------------------------------------------------------
    # Fill initial baseline
    # --------------------------------------------------------

    global_mean = (
        window_counts.mean()
    )

    global_std = (
        window_counts.std()
    )

    if pd.isna(global_std) or global_std == 0:
        global_std = 1.0

    df["rolling_mean"] = (
        df["rolling_mean"]
        .fillna(global_mean)
    )

    df["rolling_std"] = (
        df["rolling_std"]
        .fillna(global_std)
    )

    # --------------------------------------------------------
    # Calculate time-series z-score
    # --------------------------------------------------------

    df["time_series_zscore"] = (
        (
            df["transactions_in_window"]
            - df["rolling_mean"]
        )
        / df["rolling_std"].replace(0, np.nan)
    )

    df["time_series_zscore"] = (
        df["time_series_zscore"]
        .replace(
            [np.inf, -np.inf],
            np.nan,
        )
        .fillna(0)
    )

    # --------------------------------------------------------
    # Detect unusual activity
    # --------------------------------------------------------

    # 3 standard deviations above the baseline
    df["time_series_anomaly"] = (
        df["time_series_zscore"] >= 3
    ).astype(int)

    # --------------------------------------------------------
    # Convert z-score to 0-100 score
    # --------------------------------------------------------

    df["time_series_score"] = (
        (
            df["time_series_zscore"]
            / 6
        )
        * 100
    ).clip(0, 100)

    # --------------------------------------------------------
    # User-level burst detection
    # --------------------------------------------------------

    df["user_10min_count"] = (
        df.groupby(
            [
                "user_id",
                "time_window",
            ]
        )["transaction_id"]
        .transform("count")
    )

    df["user_burst_anomaly"] = (
        df["user_10min_count"] >= 4
    ).astype(int)

    # Combine global and user-level signals

    df["time_series_anomaly"] = (
        (
            df["time_series_anomaly"] == 1
        )
        | (
            df["user_burst_anomaly"] == 1
        )
    ).astype(int)

    # Increase score when a user has a burst
    df.loc[
        df["user_burst_anomaly"] == 1,
        "time_series_score",
    ] = np.maximum(
        df.loc[
            df["user_burst_anomaly"] == 1,
            "time_series_score",
        ],
        75,
    )

    return df


def main():

    print("=" * 60)
    print("UPI SENTINEL - TIME-SERIES ANOMALY DETECTION")
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
    # Run detector
    # --------------------------------------------------------

    df = detect_time_series_anomalies(df)

    # --------------------------------------------------------
    # Results
    # --------------------------------------------------------

    anomaly_count = int(
        df["time_series_anomaly"].sum()
    )

    print("\nDetection Results")
    print("-" * 40)

    print(
        f"Time-series anomalies: "
        f"{anomaly_count:,}"
    )

    print(
        f"Anomaly rate: "
        f"{anomaly_count / len(df):.2%}"
    )

    print(
        f"User burst anomalies: "
        f"{df['user_burst_anomaly'].sum():,}"
    )

    # --------------------------------------------------------
    # Ground truth comparison
    # --------------------------------------------------------

    if "is_anomaly_ground_truth" in df.columns:

        actual_anomalies = int(
            df["is_anomaly_ground_truth"].sum()
        )

        correctly_detected = int(
            (
                (df["time_series_anomaly"] == 1)
                & (
                    df["is_anomaly_ground_truth"] == 1
                )
            ).sum()
        )

        false_positives = int(
            (
                (df["time_series_anomaly"] == 1)
                & (
                    df["is_anomaly_ground_truth"] == 0
                )
            ).sum()
        )

        print("\nGround Truth Comparison")
        print("-" * 40)

        print(
            f"Actual anomalies: "
            f"{actual_anomalies:,}"
        )

        print(
            f"Correctly detected: "
            f"{correctly_detected:,}"
        )

        print(
            f"False positives: "
            f"{false_positives:,}"
        )

        if actual_anomalies > 0:

            detection_rate = (
                correctly_detected
                / actual_anomalies
            )

            print(
                f"Detection rate: "
                f"{detection_rate:.2%}"
            )

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

    print("\nSaved to:")
    print(OUTPUT_FILE)

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()