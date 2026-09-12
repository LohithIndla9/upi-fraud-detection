# 🛡️ UPI Sentinel

## Anomaly-Based UPI Transaction Risk Detection & Real-Time Alerting System

UPI Sentinel is an anomaly-based transaction risk detection system designed to identify **suspicious UPI transaction behavior** and generate real-time fraud-risk alerts.

Instead of relying on a single detection technique, the system combines **statistical analysis, machine learning, time-series analysis, and behavioral rules** to calculate a unified transaction risk score.

> **Note:** UPI Sentinel detects anomalous or suspicious behavior. An anomaly does not necessarily mean that a transaction is fraudulent.

---

## 🚀 Key Features

- 🔍 Multi-signal anomaly detection
- 📊 IQR-based statistical outlier detection
- 🤖 Isolation Forest anomaly detection
- ⏱️ Time-series transaction behavior analysis
- 🧠 Behavioral anomaly detection
- 🎯 Unified transaction risk scoring
- 🚨 Real-time risk alerts
- 📈 Risk distribution and analytics dashboard
- 🗄️ Supabase PostgreSQL integration
- ⚡ FastAPI real-time scoring API
- 💻 Modern Next.js frontend
- 🔐 Environment-based secret management
- ☁️ Cloud backend deployment

---

# 🏗️ System Architecture

```text
┌──────────────────────────┐
│   Synthetic UPI Data     │
│       Generator          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│      Preprocessing       │
│   Cleaning & Validation  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│    Feature Engineering   │
│                          │
│ Behavioral + Time-based  │
│ Transaction Features     │
└────────────┬─────────────┘
             │
     ┌───────┼────────┬──────────────┐
     ▼       ▼        ▼              ▼
  ┌─────┐ ┌────────┐ ┌──────────┐ ┌────────────┐
  │ IQR │ │Isolation│ │Time-Series│ │ Behavioral │
  │     │ │ Forest │ │ Detection │ │   Rules    │
  └──┬──┘ └───┬────┘ └────┬─────┘ └─────┬──────┘
     │        │            │             │
     └────────┴────────────┴─────────────┘
                       │
                       ▼
              ┌───────────────────┐
              │   Risk Scoring     │
              │                   │
              │    0 ──── 100    │
              └─────────┬─────────┘
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
       ┌──────────────┐     ┌──────────────┐
       │ Alert Engine │     │  Risk Level  │
       └───────┬──────┘     └──────────────┘
               │
               ▼
       ┌──────────────────┐
       │     FastAPI      │
       │  Real-Time API   │
       └────────┬─────────┘
                │
         ┌──────┴─────────┐
         ▼                ▼
   ┌────────────┐   ┌──────────────┐
   │  Supabase  │   │   Next.js    │
   │ PostgreSQL │   │  Dashboard   │
   └────────────┘   └──────────────┘
```

---

# 🧠 Detection Methodology

UPI Sentinel combines four complementary detection signals.

---

## 1. IQR-Based Statistical Detection

The Interquartile Range (IQR) method identifies unusually large transaction amounts.

### Formula

```text
IQR = Q3 - Q1

Upper Bound = Q3 + 1.5 × IQR

Lower Bound = Q1 - 1.5 × IQR
```

Transactions outside the statistical range receive an anomaly score.

### Evaluation

| Metric | Result |
|---|---:|
| Accuracy | 94.71% |
| Precision | 47.79% |
| Recall | 62.60% |
| F1 Score | 54.20% |
| ROC-AUC | 80.27% |

---

## 2. Isolation Forest

Isolation Forest identifies transactions that are unusual based on combinations of transaction and behavioral features.

### Features Used

- Transaction amount
- Log transaction amount
- Amount relative to user average
- Amount deviation
- Time since previous transaction
- User transaction count
- New device indicator
- Location change indicator
- Recipient frequency
- New recipient indicator
- Transaction burst indicator
- Night-time indicator
- Weekend indicator

### Model Configuration

```text
Algorithm       : Isolation Forest
Estimators      : 200
Contamination   : 5%
Random State    : 42
Scaler          : StandardScaler
```

### Evaluation

| Metric | Result |
|---|---:|
| Accuracy | 95.76% |
| Precision | 57.60% |
| Recall | 57.60% |
| F1 Score | 57.60% |
| ROC-AUC | 89.71% |

---

## 3. Time-Series Anomaly Detection

The time-series component analyzes transaction velocity and temporal behavior.

It considers:

- Global transaction volume
- User transaction velocity
- 10-minute transaction windows
- Transaction bursts
- Transaction frequency

The time-series detector is combined with other signals instead of being used independently.

---

## 4. Behavioral Rules

Behavioral rules identify changes in a user's normal transaction behavior.

| Behavior | Score Contribution |
|---|---:|
| New device | +30 |
| Location change | +20 |
| New recipient | +15 |
| Transaction burst | +20 |
| Night transaction | +15 |

The behavioral score is capped at 100.

---

# 🎯 Risk Scoring

The final risk score combines the outputs of all detection components.

| Detection Signal | Weight |
|---|---:|
| IQR | 20% |
| Isolation Forest | 35% |
| Time-Series | 25% |
| Behavioral Rules | 20% |

### Risk Score Formula

```text
Risk Score =
    0.20 × IQR Score
  + 0.35 × Isolation Forest Score
  + 0.25 × Time-Series Score
  + 0.20 × Behavioral Score
```

The resulting score ranges from **0 to 100**.

---

# 🚨 Risk Levels

| Risk Score | Risk Level |
|---:|---|
| 0–39 | 🟢 LOW |
| 40–69 | 🟡 MEDIUM |
| 70–100 | 🔴 HIGH |

### Alert Threshold

Risk severity and alert generation are treated separately.

```text
Alert generated when:

Risk Score ≥ 30
```

The threshold of **30** was selected through threshold analysis because it provided the best F1 score among the evaluated thresholds.

---

# 📊 Combined Risk Engine Performance

At the selected alert threshold of 30:

| Metric | Result |
|---|---:|
| Precision | 79.71% |
| Recall | 55.80% |
| F1 Score | 65.65% |

### Alert Results

```text
Total Transactions : 10,000
Alerts Generated   : 350

True Positives     : 279
False Positives    : 71
False Negatives    : 221
True Negatives     : 9,429
```

---

# 🔬 Anomaly Type Analysis

The synthetic dataset contains multiple types of injected anomalous behavior.

| Anomaly Type | Detection Rate |
|---|---:|
| Combined Behavior | 100.00% |
| High Amount | 90.91% |
| New Device | 59.26% |
| New Recipient | 56.67% |
| Location Change | 46.05% |
| Transaction Burst | 18.57% |

The system performs particularly well when multiple suspicious signals occur together, while isolated transaction-burst behavior remains more challenging to detect.

---

# 🧪 Dataset

The project uses a synthetic UPI transaction dataset for development and evaluation.

### Dataset Statistics

```text
Users               : 1,000
Transactions        : 10,000
Normal Transactions : 9,500
Anomalous           : 500
Anomaly Rate        : 5%
```

### Injected Anomaly Types

```text
HIGH_AMOUNT
TRANSACTION_BURST
NEW_DEVICE
LOCATION_CHANGE
NEW_RECIPIENT
COMBINED_BEHAVIOR
```

Ground-truth anomaly labels are used for **evaluation only** and are not used as model input during detection.

---

# ⚡ Real-Time Scoring API

The backend is implemented using **FastAPI**.

## Endpoint

```text
POST /api/v1/transactions/score
```

## Example Request

```json
{
  "transaction_id": "TXN_REALTIME_001",
  "user_id": "USER_001",
  "timestamp": "2026-09-13T10:30:00",
  "amount": 15000,
  "sender_id": "USER_001",
  "receiver_id": "MERCHANT_101",
  "transaction_type": "UPI",
  "merchant_category": "Retail",
  "device_id": "DEVICE_NEW",
  "location": "Bengaluru"
}
```

## Example Response

```json
{
  "transaction_id": "TXN_REALTIME_001",
  "risk_score": 63.51,
  "risk_level": "MEDIUM",
  "alert": true,
  "reasons": [
    "Transaction amount is a statistical outlier",
    "New device detected",
    "New recipient detected"
  ]
}
```

---

# 🗄️ Database

UPI Sentinel uses **Supabase PostgreSQL** for persistent storage.

### Main Tables

```text
transactions
      │
      │ Transaction information
      ▼
risk_results
      │
      │ Risk score
      │ Risk level
      │ Detection results
      ▼
alerts
      │
      │ Alert status
      │ Risk information
      │ Alert reasons
```

Database credentials are stored using environment variables and are never exposed to the frontend.

---

# 💻 Frontend

The frontend is built using:

- Next.js
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React

## Dashboard Pages

```text
/dashboard
/transactions
/alerts
/analytics
/test
```

### Dashboard Features

- Transaction monitoring
- Risk distribution
- Alert monitoring
- Transaction analytics
- Risk-score visualization
- Real-time transaction testing
- Suspicious transaction investigation

---

# 📁 Project Structure

```text
UPI-fraud-detection/
│
├── api/
│   ├── main.py
│   │
│   ├── schemas/
│   │   ├── transaction.py
│   │   └── dashboard.py
│   │
│   └── services/
│       ├── __init__.py
│       ├── database.py
│       └── realtime_scoring.py
│
├── data/
│   ├── synthetic/
│   ├── processed/
│   └── evaluation/
│
├── models/
│   ├── isolation_forest.pkl
│   └── isolation_scaler.pkl
│
├── src/
│   ├── data_generation/
│   │   └── generator.py
│   │
│   ├── preprocessing/
│   │   └── preprocess.py
│   │
│   ├── features/
│   │   └── feature_engineering.py
│   │
│   ├── detection/
│   │   ├── iqr.py
│   │   ├── isolation_forest.py
│   │   └── time_series.py
│   │
│   ├── scoring/
│   │   └── risk_engine.py
│   │
│   └── evaluation/
│       ├── evaluate_models.py
│       └── anomaly_type_analysis.py
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── transactions/
│   │   ├── alerts/
│   │   ├── analytics/
│   │   └── test/
│   │
│   └── package.json
│
├── requirements.txt
├── .gitignore
└── README.md
```

---

# 🛠️ Technology Stack

## Machine Learning

- Python
- Pandas
- NumPy
- SciPy
- Scikit-learn
- Joblib

## Backend

- FastAPI
- Pydantic
- Uvicorn

## Database

- Supabase
- PostgreSQL

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React

## Deployment

- GitHub
- Render
- Vercel / Next.js-compatible hosting

---

# ⚙️ Local Setup

## 1. Clone Repository

```bash
git clone https://github.com/LohithIndla/upi-fraud-detection.git
cd upi-fraud-detection
```

---

## 2. Create Python Virtual Environment

### Windows

```powershell
py -3.14 -m venv .venv
.venv\Scripts\Activate.ps1
```

---

## 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

---

## 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_server_side_supabase_key
```

> ⚠️ Never commit `.env` to GitHub or expose the Supabase secret key in the frontend.

---

# ▶️ Run the Backend

From the project root:

```bash
python -m uvicorn api.main:app --reload
```

The backend will run at:

```text
http://127.0.0.1:8000
```

### Health Check

```text
GET /health
```

---

# ▶️ Run the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at:

```text
http://localhost:3000
```

Configure the backend URL in:

```text
frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

# 🌐 Production Deployment

The backend is deployed as a Render Web Service.

### Production Backend

https://upi-sentinel-api.onrender.com

For production frontend deployment, configure:

```env
NEXT_PUBLIC_API_URL=https://upi-sentinel-api.onrender.com
```

The frontend communicates with the FastAPI backend rather than directly accessing Supabase with server-side credentials.

---

# 🔐 Security Considerations

- Supabase server-side credentials are stored as environment variables.
- `.env` files are excluded from Git.
- Supabase secret keys are never exposed to the frontend.
- Ground-truth anomaly labels are not used for real-time prediction.
- The system reports transaction risk/anomalies rather than confirmed fraud.
- Production deployments should additionally implement:
  - Authentication
  - Authorization
  - Rate limiting
  - Request validation
  - Audit logging
  - Monitoring
  - Secure secret rotation

---

# 📈 Future Improvements

Possible future enhancements include:

- 🔐 User authentication and role-based access
- 📱 SMS, email, or push notifications
- 🧠 Advanced anomaly detection models
- 🔄 Online model updating
- 📊 Advanced user behavioral profiling
- 🌍 Improved location anomaly detection
- ⚡ Streaming transaction processing
- 🧩 Explainable AI for individual risk factors
- 🗃️ Larger real-world transaction datasets
- 📡 Production monitoring and observability

---

# 🎯 Project Objective

The objective of UPI Sentinel is to demonstrate how multiple anomaly detection techniques can be combined into a practical transaction-risk monitoring pipeline.

Instead of depending on a single machine-learning model, the system combines:

```text
Statistical Detection
        +
Machine Learning
        +
Time-Series Analysis
        +
Behavioral Rules
        ↓
Unified Risk Score
        ↓
Real-Time Alert
```

This provides a foundation for developing more sophisticated real-time financial anomaly monitoring systems.

---

# 👨‍💻 Author

## Lohith Indla

GitHub: https://github.com/LohithIndla/upi-fraud-detection

---

# ⭐ Project Highlights

```text
10,000+ Synthetic Transactions
        │
        ▼
Multiple Anomaly Detection Methods
        │
        ▼
Unified Risk Scoring
        │
        ▼
Real-Time FastAPI Scoring
        │
        ▼
Supabase PostgreSQL
        │
        ▼
Interactive Next.js Dashboard
```

---

## 📌 Disclaimer

UPI Sentinel is an academic/portfolio project developed for demonstrating anomaly detection and real-time transaction risk analysis.

The system uses synthetic transaction data and should not be considered a production-ready financial fraud detection solution.
