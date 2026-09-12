"""
UPI Sentinel - Isolation Forest Anomaly Detection
"""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


INPUT_FILE = Path(
    "data/processed/upi_transactions_iqr.csv"
)

OUTPUT_FILE = Path(
    "data/processed/upi_transactions_isolation_forest.csv"
)

MODEL_DIR = Path("models")

MODEL_FILE = MODEL_DIR / "isolation_forest.pkl"
SCALER_FILE = MODEL_DIR / "isolation_scaler.pkl"


FEATURE_COLUMNS = [
    "amount",
    "log_amount",
    "amount_to_user_mean",
    "amount_deviation",
    "minutes_since_previous",
    "user_transaction_count",
    "is_new_device",
    "is_location_change",
    "recipient_transaction_count",
    "is_new_recipient",
    "is_transaction_burst",
    "is_night",
    "is_weekend",
]


def train_isolation_forest(df):
    """
    Train Isolation Forest using behavioral features.
    """

    X = df[FEATURE_COLUMNS].copy()

    # Scale features so variables with larger numerical
    # ranges do not dominate the model.
    scaler = StandardScaler()

    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_scaled)

    return model, scaler, X_scaled


def main():

    print("=" * 60)
    print("UPI SENTINEL - ISOLATION FOREST")
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
    # Check features
    # --------------------------------------------------------

    missing_features = [
        feature
        for feature in FEATURE_COLUMNS
        if feature not in df.columns
    ]

    if missing_features:
        raise ValueError(
            f"Missing features: {missing_features}"
        )

    # --------------------------------------------------------
    # Train model
    # --------------------------------------------------------

    print("\nTraining Isolation Forest...")

    model, scaler, X_scaled = train_isolation_forest(df)

    # --------------------------------------------------------
    # Predictions
    # --------------------------------------------------------

    predictions = model.predict(X_scaled)

    # Isolation Forest:
    #   1  = normal
    #  -1  = anomaly

    df["isolation_forest_anomaly"] = (
        predictions == -1
    ).astype(int)

    # Raw decision score
    df["isolation_decision_score"] = (
        model.decision_function(X_scaled)
    )

    # Convert so higher = more suspicious
    raw_score = -df["isolation_decision_score"]

    score_min = raw_score.min()
    score_max = raw_score.max()

    if score_max != score_min:

        df["isolation_forest_score"] = (
            (raw_score - score_min)
            / (score_max - score_min)
            * 100
        )

    else:

        df["isolation_forest_score"] = 0

    # --------------------------------------------------------
    # Results
    # --------------------------------------------------------

    anomaly_count = int(
        df["isolation_forest_anomaly"].sum()
    )

    print("\nDetection Results")
    print("-" * 40)

    print(
        f"Isolation Forest anomalies: "
        f"{anomaly_count:,}"
    )

    print(
        f"Anomaly rate: "
        f"{anomaly_count / len(df):.2%}"
    )

    # --------------------------------------------------------
    # Ground truth evaluation
    # --------------------------------------------------------

    if "is_anomaly_ground_truth" in df.columns:

        actual_anomalies = int(
            df["is_anomaly_ground_truth"].sum()
        )

        correctly_detected = int(
            (
                (df["isolation_forest_anomaly"] == 1)
                & (
                    df["is_anomaly_ground_truth"] == 1
                )
            ).sum()
        )

        false_positives = int(
            (
                (df["isolation_forest_anomaly"] == 1)
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
    # Save model
    # --------------------------------------------------------

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        model,
        MODEL_FILE,
    )

    joblib.dump(
        scaler,
        SCALER_FILE,
    )

    # --------------------------------------------------------
    # Save results
    # --------------------------------------------------------

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    print("\nModel saved to:")
    print(MODEL_FILE)

    print("\nScaler saved to:")
    print(SCALER_FILE)

    print("\nResults saved to:")
    print(OUTPUT_FILE)

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()