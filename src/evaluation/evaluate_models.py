from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score,
    classification_report,
)


INPUT_FILE = Path("data/processed/upi_transactions_scored.csv")
OUTPUT_DIR = Path("data/evaluation")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


print("\n" + "=" * 60)
print("UPI SENTINEL - ML MODEL EVALUATION")
print("=" * 60)


# ---------------------------------------------------------
# Load dataset
# ---------------------------------------------------------

if not INPUT_FILE.exists():
    raise FileNotFoundError(
        f"Input file not found: {INPUT_FILE}"
    )

df = pd.read_csv(INPUT_FILE)

print(f"\nLoaded dataset: {len(df):,} transactions")


# ---------------------------------------------------------
# Ground truth
# ---------------------------------------------------------

GROUND_TRUTH = "is_anomaly_ground_truth"

if GROUND_TRUTH not in df.columns:
    raise ValueError(
        f"Column '{GROUND_TRUTH}' not found."
    )

y_true = df[GROUND_TRUTH].astype(int)

print(
    f"Ground-truth anomalies: {y_true.sum():,} "
    f"({y_true.mean() * 100:.2f}%)"
)


# ---------------------------------------------------------
# Evaluation function
# ---------------------------------------------------------

def evaluate_model(
    model_name,
    y_true,
    y_pred,
    y_score=None,
):

    y_pred = pd.Series(y_pred).astype(int)

    accuracy = accuracy_score(y_true, y_pred)

    precision = precision_score(
        y_true,
        y_pred,
        zero_division=0,
    )

    recall = recall_score(
        y_true,
        y_pred,
        zero_division=0,
    )

    f1 = f1_score(
        y_true,
        y_pred,
        zero_division=0,
    )

    cm = confusion_matrix(y_true, y_pred)

    roc_auc = None

    if y_score is not None:

        try:
            roc_auc = roc_auc_score(
                y_true,
                y_score,
            )

        except ValueError:
            roc_auc = None

    print("\n" + "-" * 60)
    print(model_name)
    print("-" * 60)

    print(f"Accuracy : {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print(f"F1 Score : {f1:.4f}")

    if roc_auc is not None:
        print(f"ROC-AUC  : {roc_auc:.4f}")
    else:
        print("ROC-AUC  : N/A")

    print("\nConfusion Matrix:")
    print(cm)

    return {
        "model": model_name,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "roc_auc": (
            round(roc_auc, 4)
            if roc_auc is not None
            else None
        ),
        "true_negatives": int(cm[0, 0]),
        "false_positives": int(cm[0, 1]),
        "false_negatives": int(cm[1, 0]),
        "true_positives": int(cm[1, 1]),
    }


results = []


# =========================================================
# 1. IQR
# =========================================================

if "iqr_anomaly" in df.columns:

    y_pred = df["iqr_anomaly"].fillna(0).astype(int)

    y_score = None

    if "iqr_score" in df.columns:
        y_score = df["iqr_score"].fillna(0)

    results.append(
        evaluate_model(
            "IQR",
            y_true,
            y_pred,
            y_score,
        )
    )

else:

    print("\nIQR columns not found.")


# =========================================================
# 2. Isolation Forest
# =========================================================

if "isolation_forest_anomaly" in df.columns:

    y_pred = (
        df["isolation_forest_anomaly"]
        .fillna(0)
        .astype(int)
    )

    y_score = None

    if "isolation_forest_score" in df.columns:

        y_score = (
            df["isolation_forest_score"]
            .fillna(0)
        )

    results.append(
        evaluate_model(
            "Isolation Forest",
            y_true,
            y_pred,
            y_score,
        )
    )

else:

    print(
        "\nIsolation Forest column not found."
    )


# =========================================================
# 3. Time-Series
# =========================================================

if "time_series_anomaly" in df.columns:

    y_pred = (
        df["time_series_anomaly"]
        .fillna(0)
        .astype(int)
    )

    y_score = None

    if "time_series_score" in df.columns:

        y_score = (
            df["time_series_score"]
            .fillna(0)
        )

    results.append(
        evaluate_model(
            "Time-Series",
            y_true,
            y_pred,
            y_score,
        )
    )

else:

    print(
        "\nTime-Series column not found."
    )


## =========================================================
# 4. Combined Risk Engine
# =========================================================

ALERT_THRESHOLD = 30

if "risk_score" in df.columns:

    # Use the final operational alert threshold
    y_score = (
        df["risk_score"]
        .fillna(0)
        .astype(float)
    )

    y_pred = (
        y_score >= ALERT_THRESHOLD
    ).astype(int)

    results.append(
        evaluate_model(
            f"Combined Risk Engine (Threshold {ALERT_THRESHOLD})",
            y_true,
            y_pred,
            y_score,
        )
    )

else:

    print(
        "\nRisk score column not found."
    )

# =========================================================
# Save results
# =========================================================

results_file = (
    OUTPUT_DIR /
    "model_evaluation_results.csv"
)

results_df = pd.DataFrame(results)

results_df.to_csv(
    results_file,
    index=False,
)


# =========================================================
# Classification reports
# =========================================================

report_file = (
    OUTPUT_DIR /
    "classification_reports.txt"
)


model_columns = {
    "IQR": "iqr_anomaly",
    "Isolation Forest": "isolation_forest_anomaly",
    "Time-Series": "time_series_anomaly",
    "Combined Risk Engine": "alert",
}


with open(
    report_file,
    "w",
    encoding="utf-8",
) as file:

    file.write(
        "UPI SENTINEL - CLASSIFICATION REPORTS\n"
    )

    file.write("=" * 60 + "\n")

    for model_name, column in model_columns.items():

        if column not in df.columns:
            continue

        y_pred = (
            df[column]
            .fillna(0)
            .astype(int)
        )

        file.write(
            f"\n{model_name}\n"
        )

        file.write("-" * 60 + "\n")

        file.write(
            classification_report(
                y_true,
                y_pred,
                target_names=[
                    "Normal",
                    "Anomaly",
                ],
                zero_division=0,
            )
        )


print(
    f"\nEvaluation results saved to:"
    f"\n{results_file}"
)

print(
    f"\nClassification reports saved to:"
    f"\n{report_file}"
)

print(
    "\nEvaluation completed successfully."
)