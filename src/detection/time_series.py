"""
UPI Sentinel - Time-Series Anomaly Detection

Detects unusual transaction activity by analyzing:
- Global transaction volume
- User-level transaction velocity
- Short-term transaction bursts
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


# ============================================================
# CONFIGURATION
# ============================================================

BURST_WINDOW_MINUTES = 10
BURST_TRANSACTION_THRESHOLD = 4

ROLLING_WINDOWS = 12
Z_SCORE_THRESHOLD = 3


# ============================================================
# TIME-SERIES DETECTOR
# ============================================================

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
    # GLOBAL 10-MINUTE TRANSACTION VOLUME
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
    # GLOBAL ROLLING BASELINE
    # --------------------------------------------------------

    window_stats = (
        window_counts
        .to_frame()
        .sort_index()
    )

    window_stats["rolling_mean"] = (
        window_stats["transactions_in_window"]
        .rolling(
            window=ROLLING_WINDOWS,
            min_periods=3,
        )
        .mean()
        .shift(1)
    )

    window_stats["rolling_std"] = (
        window_stats["transactions_in_window"]
        .rolling(
            window=ROLLING_WINDOWS,
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
    # INITIAL BASELINE
    # --------------------------------------------------------

    global_mean = window_counts.mean()
    global_std = window_counts.std()

    if pd.isna(global_mean):
        global_mean = 0

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
    # GLOBAL Z-SCORE
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
    # GLOBAL TIME-SERIES ANOMALY
    # --------------------------------------------------------

    df["time_series_anomaly"] = (
        df["time_series_zscore"] >= Z_SCORE_THRESHOLD
    ).astype(int)

    # --------------------------------------------------------
    # GLOBAL TIME-SERIES SCORE
    # --------------------------------------------------------

    df["time_series_score"] = (
        (
            df["time_series_zscore"]
            / 6
        )
        * 100
    ).clip(0, 100)

    # ========================================================
    # USER-LEVEL TRANSACTION VELOCITY
    # ========================================================

    # IMPORTANT:
    # Use a true rolling 10-minute window per user rather
    # than grouping only by the fixed 10-minute floor.

    df["user_10min_count"] = 0

    for user_id, group in df.groupby("user_id"):

        timestamps = (
            group["timestamp"]
            .sort_values()
        )

        counts = []

        for timestamp in timestamps:

            window_start = (
                timestamp
                - pd.Timedelta(
                    minutes=BURST_WINDOW_MINUTES
                )
            )

            count = (
                (timestamps >= window_start)
                & (timestamps <= timestamp)
            ).sum()

            counts.append(count)

        df.loc[
            timestamps.index,
            "user_10min_count"
        ] = counts

    # --------------------------------------------------------
    # USER BURST DETECTION
    # --------------------------------------------------------

    df["user_burst_anomaly"] = (
        df["user_10min_count"]
        >= BURST_TRANSACTION_THRESHOLD
    ).astype(int)

    # --------------------------------------------------------
    # USER VELOCITY SCORE
    # --------------------------------------------------------

    # 1 transaction → 0
    # 2 transactions → 25
    # 3 transactions → 50
    # 4 transactions → 75
    # 5+ transactions → 100

    df["user_velocity_score"] = (
        (
            df["user_10min_count"]
            - 1
        )
        * 25
    ).clip(0, 100)

    # --------------------------------------------------------
    # COMBINE GLOBAL + USER SIGNALS
    # --------------------------------------------------------

    # Global activity contributes 40%
    # User velocity contributes 60%

    df["time_series_score"] = (
        (
            df["time_series_score"] * 0.40
        )
        +
        (
            df["user_velocity_score"] * 0.60
        )
    ).clip(0, 100)

    # --------------------------------------------------------
    # FINAL TIME-SERIES ANOMALY
    # --------------------------------------------------------

    df["time_series_anomaly"] = (
        (
            df["time_series_anomaly"] == 1
        )
        |
        (
            df["user_burst_anomaly"] == 1
        )
    ).astype(int)

    # --------------------------------------------------------
    # Strong burst score
    # --------------------------------------------------------

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


# ============================================================
# MAIN
# ============================================================

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

    print(
        f"\nInput shape: {df.shape}"
    )

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

    burst_count = int(
        df["user_burst_anomaly"].sum()
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
        f"{burst_count:,}"
    )

    print(
        f"Maximum user 10-minute count: "
        f"{int(df['user_10min_count'].max())}"
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
                &
                (
                    df["is_anomaly_ground_truth"] == 1
                )
            ).sum()
        )

        false_positives = int(
            (
                (df["time_series_anomaly"] == 1)
                &
                (
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