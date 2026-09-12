"""
UPI Sentinel - Real-Time Transaction Scoring

Scores a single incoming transaction using:
1. IQR anomaly signal
2. Isolation Forest
3. Time-series activity
4. Behavioral signals

The historical synthetic dataset is used as the baseline/context.
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

FEATURE_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "upi_transactions_features.csv"
)

MODEL_FILE = (
    PROJECT_ROOT
    / "models"
    / "isolation_forest.pkl"
)

SCALER_FILE = (
    PROJECT_ROOT
    / "models"
    / "isolation_scaler.pkl"
)


# ============================================================
# ISOLATION FOREST FEATURES
# ============================================================

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


# ============================================================
# RISK WEIGHTS
# ============================================================

IQR_WEIGHT = 0.20
ISOLATION_WEIGHT = 0.35
TIME_SERIES_WEIGHT = 0.25
BEHAVIOR_WEIGHT = 0.20


# ============================================================
# LOAD HISTORICAL DATA
# ============================================================

if not FEATURE_FILE.exists():
    raise FileNotFoundError(
        f"Feature dataset not found: {FEATURE_FILE}"
    )

if not MODEL_FILE.exists():
    raise FileNotFoundError(
        f"Isolation Forest model not found: {MODEL_FILE}"
    )

if not SCALER_FILE.exists():
    raise FileNotFoundError(
        f"Isolation Forest scaler not found: {SCALER_FILE}"
    )


HISTORICAL_DF = pd.read_csv(
    FEATURE_FILE,
    parse_dates=["timestamp"],
)

MODEL = joblib.load(MODEL_FILE)
SCALER = joblib.load(SCALER_FILE)


# ============================================================
# IQR BASELINE
# ============================================================

Q1 = HISTORICAL_DF["amount"].quantile(0.25)
Q3 = HISTORICAL_DF["amount"].quantile(0.75)

IQR = Q3 - Q1

IQR_LOWER_BOUND = max(
    0,
    Q1 - 1.5 * IQR,
)

IQR_UPPER_BOUND = Q3 + 1.5 * IQR


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_user_history(user_id):
    """Return historical transactions for a user."""

    return HISTORICAL_DF[
        HISTORICAL_DF["user_id"] == user_id
    ].sort_values("timestamp")


def calculate_behavior_score(
    is_new_device,
    is_location_change,
    is_new_recipient,
    is_transaction_burst,
    is_night,
):
    """Calculate behavioral risk score from 0-100."""

    score = 0

    if is_new_device:
        score += 30

    if is_location_change:
        score += 20

    if is_new_recipient:
        score += 15

    if is_transaction_burst:
        score += 20

    if is_night:
        score += 15

    return min(score, 100)


def assign_risk_level(score):
    """Convert score into risk category."""

    if score >= 70:
        return "HIGH"

    if score >= 40:
        return "MEDIUM"

    return "LOW"


def generate_reasons(
    iqr_anomaly,
    isolation_anomaly,
    time_series_anomaly,
    is_new_device,
    is_location_change,
    is_new_recipient,
    is_transaction_burst,
    is_night,
):
    """Generate human-readable explanations."""

    reasons = []

    if iqr_anomaly:
        reasons.append(
            "Transaction amount is a statistical outlier"
        )

    if isolation_anomaly:
        reasons.append(
            "Transaction shows unusual combined behavior"
        )

    if time_series_anomaly:
        reasons.append(
            "Unusual transaction activity detected over time"
        )

    if is_new_device:
        reasons.append(
            "New device detected"
        )

    if is_location_change:
        reasons.append(
            "Location changed from previous transaction"
        )

    if is_new_recipient:
        reasons.append(
            "New recipient detected"
        )

    if is_transaction_burst:
        reasons.append(
            "Multiple transactions occurred within a short period"
        )

    if is_night:
        reasons.append(
            "Transaction occurred during unusual night hours"
        )

    if not reasons:
        reasons.append(
            "No significant anomaly signals detected"
        )

    return reasons


# ============================================================
# REAL-TIME SCORING
# ============================================================

def score_transaction(transaction):
    """
    Score one incoming transaction.

    Parameters
    ----------
    transaction : dict

    Returns
    -------
    dict
    """

    user_id = transaction["user_id"]
    amount = float(transaction["amount"])
    timestamp = pd.Timestamp(transaction["timestamp"])
    device_id = transaction["device_id"]
    location = transaction["location"]
    receiver_id = transaction["receiver_id"]

    # --------------------------------------------------------
    # User history
    # --------------------------------------------------------

    user_history = get_user_history(user_id)

    # --------------------------------------------------------
    # Previous transaction
    # --------------------------------------------------------

    previous_transaction = None

    if not user_history.empty:

        previous_transactions = user_history[
            user_history["timestamp"] < timestamp
        ]

        if not previous_transactions.empty:
            previous_transaction = (
                previous_transactions
                .sort_values("timestamp")
                .iloc[-1]
            )

    # --------------------------------------------------------
    # User amount baseline
    # --------------------------------------------------------

    if not user_history.empty:

        user_mean_amount = (
            user_history["amount"].mean()
        )

        user_median_amount = (
            user_history["amount"].median()
        )

        user_transaction_count = len(
            user_history
        )

    else:

        # New user fallback
        user_mean_amount = (
            HISTORICAL_DF["amount"].median()
        )

        user_median_amount = (
            HISTORICAL_DF["amount"].median()
        )

        user_transaction_count = 0

    # Avoid division by zero
    if user_mean_amount <= 0:
        user_mean_amount = 1.0

    # --------------------------------------------------------
    # Amount features
    # --------------------------------------------------------

    amount_to_user_mean = (
        amount / user_mean_amount
    )

    amount_deviation = abs(
        amount - user_mean_amount
    )

    log_amount = np.log1p(amount)

    # --------------------------------------------------------
    # Previous transaction features
    # --------------------------------------------------------

    if previous_transaction is not None:

        previous_amount = float(
            previous_transaction["amount"]
        )

        previous_timestamp = pd.Timestamp(
            previous_transaction["timestamp"]
        )

        minutes_since_previous = (
            timestamp - previous_timestamp
        ).total_seconds() / 60

        previous_location = (
            previous_transaction["location"]
        )

        is_location_change = int(
            location != previous_location
        )

    else:

        previous_amount = 0.0
        minutes_since_previous = 999999.0
        previous_location = None
        is_location_change = 0

    # --------------------------------------------------------
    # Device
    # --------------------------------------------------------

    known_devices = set(
        user_history["device_id"].dropna()
    )

    is_new_device = int(
        device_id not in known_devices
    )

    # --------------------------------------------------------
    # Recipient
    # --------------------------------------------------------

    recipient_history = HISTORICAL_DF[
        HISTORICAL_DF["receiver_id"] == receiver_id
    ]

    recipient_transaction_count = len(
        recipient_history
    )

    user_recipient_history = user_history[
        user_history["receiver_id"] == receiver_id
    ]

    is_new_recipient = int(
        user_recipient_history.empty
    )

    # --------------------------------------------------------
    # Time features
    # --------------------------------------------------------

    hour = timestamp.hour

    is_night = int(
        hour < 6 or hour >= 23
    )

    is_weekend = int(
        timestamp.dayofweek >= 5
    )

    hour_sin = np.sin(
        2 * np.pi * hour / 24
    )

    hour_cos = np.cos(
        2 * np.pi * hour / 24
    )

    # --------------------------------------------------------
    # Transaction burst
    # --------------------------------------------------------

    burst_start = timestamp - pd.Timedelta(
        minutes=10
    )

    recent_user_transactions = user_history[
        (
            user_history["timestamp"] >= burst_start
        )
        & (
            user_history["timestamp"] <= timestamp
        )
    ]

    user_10min_count = len(
        recent_user_transactions
    ) + 1

    is_transaction_burst = int(
        user_10min_count >= 4
    )

    # --------------------------------------------------------
    # IQR SCORE
    # --------------------------------------------------------

    iqr_anomaly = int(
        (
            amount < IQR_LOWER_BOUND
        )
        or (
            amount > IQR_UPPER_BOUND
        )
    )

    iqr_excess_amount = max(
        0,
        amount - IQR_UPPER_BOUND,
    )

    if IQR_UPPER_BOUND > 0:

        iqr_score = min(
            (
                iqr_excess_amount
                / IQR_UPPER_BOUND
            )
            * 100,
            100,
        )

    else:

        iqr_score = 0.0

    # --------------------------------------------------------
    # Isolation Forest features
    # --------------------------------------------------------

    feature_vector = pd.DataFrame(
        [
            {
                "amount": amount,
                "log_amount": log_amount,
                "amount_to_user_mean": amount_to_user_mean,
                "amount_deviation": amount_deviation,
                "minutes_since_previous": minutes_since_previous,
                "user_transaction_count": user_transaction_count,
                "is_new_device": is_new_device,
                "is_location_change": is_location_change,
                "recipient_transaction_count": recipient_transaction_count,
                "is_new_recipient": is_new_recipient,
                "is_transaction_burst": is_transaction_burst,
                "is_night": is_night,
                "is_weekend": is_weekend,
            }
        ]
    )

    X = feature_vector[
        FEATURE_COLUMNS
    ]

    X_scaled = SCALER.transform(X)

    # Prediction
    isolation_prediction = MODEL.predict(
        X_scaled
    )[0]

    isolation_anomaly = int(
        isolation_prediction == -1
    )

    # Decision score
    isolation_decision_score = float(
        MODEL.decision_function(X_scaled)[0]
    )

    # --------------------------------------------------------
    # Normalize Isolation Forest score
    #
    # Compare against historical model scores.
    # --------------------------------------------------------

    historical_X = HISTORICAL_DF[
        FEATURE_COLUMNS
    ]

    historical_scaled = SCALER.transform(
        historical_X
    )

    historical_raw_scores = -MODEL.decision_function(
        historical_scaled
    )

    raw_score = -isolation_decision_score

    score_min = historical_raw_scores.min()
    score_max = historical_raw_scores.max()

    if score_max != score_min:

        isolation_score = (
            (
                raw_score - score_min
            )
            / (
                score_max - score_min
            )
            * 100
        )

        isolation_score = float(
            np.clip(
                isolation_score,
                0,
                100,
            )
        )

    else:

        isolation_score = 0.0

    # --------------------------------------------------------
    # Time-Series baseline
    # --------------------------------------------------------

    historical = HISTORICAL_DF.copy()

    historical["time_window"] = (
        historical["timestamp"]
        .dt.floor("10min")
    )

    current_window = timestamp.floor(
        "10min"
    )

    window_counts = (
        historical
        .groupby("time_window")
        .size()
    )

    previous_windows = window_counts[
        window_counts.index < current_window
    ]

    recent_windows = previous_windows.tail(
        12
    )

    if len(recent_windows) >= 3:

        rolling_mean = recent_windows.mean()

        rolling_std = recent_windows.std()

    else:

        rolling_mean = window_counts.mean()

        rolling_std = window_counts.std()

    if pd.isna(rolling_mean):
        rolling_mean = 0.0

    if pd.isna(rolling_std) or rolling_std == 0:
        rolling_std = 1.0

    historical_window_count = int(
        window_counts.get(
            current_window,
            0,
        )
    )

    current_transaction_count = (
        historical_window_count + 1
    )

    time_series_zscore = (
        current_transaction_count
        - rolling_mean
    ) / rolling_std

    time_series_anomaly = int(
        time_series_zscore >= 3
        or is_transaction_burst
    )

    time_series_score = float(
        np.clip(
            (
                time_series_zscore
                / 6
            )
            * 100,
            0,
            100,
        )
    )

    if is_transaction_burst:

        time_series_score = max(
            time_series_score,
            75,
        )

    # --------------------------------------------------------
    # Behavioral score
    # --------------------------------------------------------

    behavior_score = calculate_behavior_score(
        is_new_device=is_new_device,
        is_location_change=is_location_change,
        is_new_recipient=is_new_recipient,
        is_transaction_burst=is_transaction_burst,
        is_night=is_night,
    )

    # --------------------------------------------------------
    # FINAL RISK SCORE
    # --------------------------------------------------------

    risk_score = (
        iqr_score * IQR_WEIGHT
        + isolation_score * ISOLATION_WEIGHT
        + time_series_score * TIME_SERIES_WEIGHT
        + behavior_score * BEHAVIOR_WEIGHT
    )

    risk_score = round(
        float(
            np.clip(
                risk_score,
                0,
                100,
            )
        ),
        2,
    )

    risk_level = assign_risk_level(
        risk_score
    )

    alert = risk_score >= 30

    # --------------------------------------------------------
    # Explainability
    # --------------------------------------------------------

    reasons = generate_reasons(
        iqr_anomaly=iqr_anomaly,
        isolation_anomaly=isolation_anomaly,
        time_series_anomaly=time_series_anomaly,
        is_new_device=is_new_device,
        is_location_change=is_location_change,
        is_new_recipient=is_new_recipient,
        is_transaction_burst=is_transaction_burst,
        is_night=is_night,
    )

    # --------------------------------------------------------
    # Return API result
    # --------------------------------------------------------

    return {
        "transaction_id": transaction[
            "transaction_id"
        ],
        "risk_score": risk_score,
        "risk_level": risk_level,
        "alert": alert,
        "reasons": reasons,
    }