"""
UPI Sentinel - IQR Anomaly Detection

Uses the Interquartile Range (IQR) method to identify
statistical outliers in transaction amounts.
"""

from pathlib import Path

import pandas as pd


INPUT_FILE = Path(
    "data/processed/upi_transactions_features.csv"
)

OUTPUT_FILE = Path(
    "data/processed/upi_transactions_iqr.csv"
)


def detect_iqr_anomalies(df):
    """
    Detect transaction amount outliers using IQR.

    Transactions outside:
        Q1 - 1.5 * IQR
        Q3 + 1.5 * IQR

    are marked as statistical anomalies.
    """

    df = df.copy()

    # --------------------------------------------------------
    # Calculate quartiles
    # --------------------------------------------------------

    q1 = df["amount"].quantile(0.25)
    q3 = df["amount"].quantile(0.75)

    iqr = q3 - q1

    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    # Amounts cannot be negative
    lower_bound = max(0, lower_bound)

    # --------------------------------------------------------
    # Detect anomalies
    # --------------------------------------------------------

    df["iqr_lower_bound"] = lower_bound
    df["iqr_upper_bound"] = upper_bound

    df["iqr_anomaly"] = (
        (df["amount"] < lower_bound)
        | (df["amount"] > upper_bound)
    ).astype(int)

    # Distance beyond upper threshold
    df["iqr_excess_amount"] = (
        df["amount"] - upper_bound
    ).clip(lower=0)

    # --------------------------------------------------------
    # IQR score: 0-100
    # --------------------------------------------------------

    if upper_bound > 0:

        df["iqr_score"] = (
            (
                df["iqr_excess_amount"]
                / upper_bound
            )
            * 100
        ).clip(0, 100)

    else:

        df["iqr_score"] = 0

    return df, q1, q3, iqr, lower_bound, upper_bound


def main():

    print("=" * 60)
    print("UPI SENTINEL - IQR ANOMALY DETECTION")
    print("=" * 60)

    # --------------------------------------------------------
    # Load feature dataset
    # --------------------------------------------------------

    df = pd.read_csv(
        INPUT_FILE,
        parse_dates=["timestamp"],
    )

    print(f"\nInput shape: {df.shape}")

    # --------------------------------------------------------
    # Run IQR
    # --------------------------------------------------------

    (
        df,
        q1,
        q3,
        iqr,
        lower_bound,
        upper_bound,
    ) = detect_iqr_anomalies(df)

    # --------------------------------------------------------
    # Results
    # --------------------------------------------------------

    anomaly_count = int(
        df["iqr_anomaly"].sum()
    )

    anomaly_rate = (
        anomaly_count / len(df)
    )

    print("\nIQR Statistics")
    print("-" * 40)

    print(f"Q1:          ₹{q1:,.2f}")
    print(f"Q3:          ₹{q3:,.2f}")
    print(f"IQR:         ₹{iqr:,.2f}")
    print(f"Lower bound: ₹{lower_bound:,.2f}")
    print(f"Upper bound: ₹{upper_bound:,.2f}")

    print("\nDetection Results")
    print("-" * 40)

    print(
        f"IQR anomalies: {anomaly_count:,}"
    )

    print(
        f"IQR anomaly rate: {anomaly_rate:.2%}"
    )

    # --------------------------------------------------------
    # Compare with ground truth
    # --------------------------------------------------------

    if "is_anomaly_ground_truth" in df.columns:

        actual_anomalies = int(
            df["is_anomaly_ground_truth"].sum()
        )

        detected_actual = int(
            (
                (df["iqr_anomaly"] == 1)
                & (
                    df["is_anomaly_ground_truth"] == 1
                )
            ).sum()
        )

        false_positives = int(
            (
                (df["iqr_anomaly"] == 1)
                & (
                    df["is_anomaly_ground_truth"] == 0
                )
            ).sum()
        )

        print("\nGround Truth Comparison")
        print("-" * 40)

        print(
            f"Actual injected anomalies: "
            f"{actual_anomalies:,}"
        )

        print(
            f"Correctly detected: "
            f"{detected_actual:,}"
        )

        print(
            f"False positives: "
            f"{false_positives:,}"
        )

        if actual_anomalies > 0:

            detection_rate = (
                detected_actual
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