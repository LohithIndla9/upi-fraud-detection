from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    confusion_matrix,
)


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

INPUT_FILE = Path(
    "data/processed/upi_transactions_scored.csv"
)

OUTPUT_DIR = Path("data/evaluation")

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ---------------------------------------------------------
# Load data
# ---------------------------------------------------------

print("\n" + "=" * 65)
print("UPI SENTINEL - RISK SCORE THRESHOLD ANALYSIS")
print("=" * 65)

if not INPUT_FILE.exists():
    raise FileNotFoundError(
        f"Dataset not found: {INPUT_FILE}"
    )

df = pd.read_csv(INPUT_FILE)

print(
    f"\nLoaded dataset: {len(df):,} transactions"
)


# ---------------------------------------------------------
# Required columns
# ---------------------------------------------------------

required_columns = [
    "risk_score",
    "is_anomaly_ground_truth",
]

for column in required_columns:
    if column not in df.columns:
        raise ValueError(
            f"Required column '{column}' not found."
        )


# ---------------------------------------------------------
# Prepare data
# ---------------------------------------------------------

df["risk_score"] = pd.to_numeric(
    df["risk_score"],
    errors="coerce",
)

df["is_anomaly_ground_truth"] = (
    pd.to_numeric(
        df["is_anomaly_ground_truth"],
        errors="coerce",
    )
    .fillna(0)
    .astype(int)
)

df = df.dropna(
    subset=["risk_score"]
)

y_true = df[
    "is_anomaly_ground_truth"
]


# ---------------------------------------------------------
# Thresholds to test
# ---------------------------------------------------------

thresholds = [
    20,
    25,
    30,
    35,
    40,
    45,
    50,
    55,
    60,
    65,
    70,
    75,
    80,
    85,
    90,
]


results = []


# ---------------------------------------------------------
# Evaluate every threshold
# ---------------------------------------------------------

for threshold in thresholds:

    # A transaction becomes an alert when
    # its risk score reaches the threshold.

    y_pred = (
        df["risk_score"] >= threshold
    ).astype(int)

    accuracy = accuracy_score(
        y_true,
        y_pred,
    )

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

    cm = confusion_matrix(
        y_true,
        y_pred,
    )

    tn, fp, fn, tp = cm.ravel()

    results.append(
        {
            "threshold": threshold,
            "accuracy": round(
                accuracy,
                4,
            ),
            "precision": round(
                precision,
                4,
            ),
            "recall": round(
                recall,
                4,
            ),
            "f1_score": round(
                f1,
                4,
            ),
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
            "alerts_generated": int(
                y_pred.sum()
            ),
        }
    )


results_df = pd.DataFrame(
    results
)


# ---------------------------------------------------------
# Display results
# ---------------------------------------------------------

print("\n" + "-" * 65)

print(
    f"{'Threshold':<12}"
    f"{'Precision':<14}"
    f"{'Recall':<12}"
    f"{'F1':<12}"
    f"{'Alerts':<10}"
)

print("-" * 65)

for _, row in results_df.iterrows():

    print(
        f"{int(row['threshold']):<12}"
        f"{row['precision']:<14.4f}"
        f"{row['recall']:<12.4f}"
        f"{row['f1_score']:<12.4f}"
        f"{int(row['alerts_generated']):<10}"
    )


# ---------------------------------------------------------
# Best F1 threshold
# ---------------------------------------------------------

best_f1_row = results_df.loc[
    results_df["f1_score"].idxmax()
]


# ---------------------------------------------------------
# Best recall threshold
# ---------------------------------------------------------

best_recall_row = results_df.loc[
    results_df["recall"].idxmax()
]


# ---------------------------------------------------------
# Best precision threshold
# ---------------------------------------------------------

best_precision_row = results_df.loc[
    results_df["precision"].idxmax()
]


# ---------------------------------------------------------
# Current threshold
# ---------------------------------------------------------

current_threshold = 70

current_row = results_df[
    results_df["threshold"]
    == current_threshold
].iloc[0]


# ---------------------------------------------------------
# Print recommendations
# ---------------------------------------------------------

print("\n" + "=" * 65)
print("THRESHOLD ANALYSIS")
print("=" * 65)


print(
    "\nCurrent threshold: "
    f"{current_threshold}"
)

print(
    f"Precision: {current_row['precision']:.4f}"
)

print(
    f"Recall:    {current_row['recall']:.4f}"
)

print(
    f"F1 Score:  {current_row['f1_score']:.4f}"
)

print(
    f"Alerts:    "
    f"{int(current_row['alerts_generated'])}"
)


print("\nBest F1 threshold:")

print(
    f"Threshold: "
    f"{int(best_f1_row['threshold'])}"
)

print(
    f"Precision: "
    f"{best_f1_row['precision']:.4f}"
)

print(
    f"Recall: "
    f"{best_f1_row['recall']:.4f}"
)

print(
    f"F1 Score: "
    f"{best_f1_row['f1_score']:.4f}"
)


print("\nBest Recall threshold:")

print(
    f"Threshold: "
    f"{int(best_recall_row['threshold'])}"
)

print(
    f"Precision: "
    f"{best_recall_row['precision']:.4f}"
)

print(
    f"Recall: "
    f"{best_recall_row['recall']:.4f}"
)

print(
    f"F1 Score: "
    f"{best_recall_row['f1_score']:.4f}"
)


print("\nBest Precision threshold:")

print(
    f"Threshold: "
    f"{int(best_precision_row['threshold'])}"
)

print(
    f"Precision: "
    f"{best_precision_row['precision']:.4f}"
)

print(
    f"Recall: "
    f"{best_precision_row['recall']:.4f}"
)

print(
    f"F1 Score: "
    f"{best_precision_row['f1_score']:.4f}"
)


# ---------------------------------------------------------
# Save results
# ---------------------------------------------------------

output_file = (
    OUTPUT_DIR /
    "threshold_analysis.csv"
)

results_df.to_csv(
    output_file,
    index=False,
)


print(
    "\nThreshold analysis saved to:"
)

print(output_file)

print(
    "\nAnalysis completed successfully."
)