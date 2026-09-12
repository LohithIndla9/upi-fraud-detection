import pandas as pd
from sklearn.metrics import precision_score, recall_score, f1_score

# Load scored dataset
df = pd.read_csv("data/processed/upi_transactions_scored.csv")

# Use the selected alert threshold
THRESHOLD = 30

# Generate alert prediction from risk score
df["predicted_alert"] = (df["risk_score"] >= THRESHOLD).astype(int)

# Ground truth
df["actual_anomaly"] = df["is_anomaly_ground_truth"].astype(int)

results = []

for anomaly_type, group in df.groupby("anomaly_type"):

    # Ignore normal transactions if anomaly_type is NORMAL
    if anomaly_type == "NORMAL":
        continue

    y_true = group["actual_anomaly"]
    y_pred = group["predicted_alert"]

    results.append({
        "anomaly_type": anomaly_type,
        "total_transactions": len(group),
        "detected": int(y_pred.sum()),
        "detection_rate": round(y_pred.mean(), 4),
        "precision": round(
            precision_score(y_true, y_pred, zero_division=0), 4
        ),
        "recall": round(
            recall_score(y_true, y_pred, zero_division=0), 4
        ),
        "f1_score": round(
            f1_score(y_true, y_pred, zero_division=0), 4
        )
    })

results_df = pd.DataFrame(results)

# Sort by detection rate
results_df = results_df.sort_values(
    "detection_rate",
    ascending=False
)

# Save results
output_path = "data/evaluation/anomaly_type_analysis.csv"
results_df.to_csv(output_path, index=False)

print("\nAnomaly Type Analysis — Threshold 30")
print("=" * 70)
print(results_df.to_string(index=False))

print(f"\nSaved to:")
print(output_path)