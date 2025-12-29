# Google Ads Global Automation Framework
## Technical QA, Monitoring & Data Hygiene for SEAT, CUPRA & Škoda

---

### 📋 Overview
A collection of professional **Google Ads Scripts (JavaScript)** designed for global MCC management. These tools automate the auditing and monitoring of conversion signals across multinational accounts, ensuring data integrity and optimizing media spend.



### 🛠 Active Solutions

#### 1. Critical Conversion Drop Monitor (`/monitoring`)
* **Purpose:** Real-time anomaly detection for conversion pixels.
* **Logic:** Compares current performance against a 14-day baseline (GAQL).
* **Impact:** Immediate detection of server-side failures or pixel drops in global markets.

#### 2. Floodlight Zero Activity Audit (`/auditing`)
* **Purpose:** Ecosystem hygiene and lifecycle management.
* **Logic:** Heuristic-based filtering to identify inactive tags without cross-market false positives.
* **Impact:** Simplifies the decommissioning of legacy assets and validates new implementations.

### 🚀 Strategic Implementation
These scripts are engineered for high-complexity environments with multiple vendors (**PHD, Annalect, Adylic**). They prioritize:
* **Market Heuristics:** Automatic filtering by ISO country codes.
* **Alert Consolidation:** Single executive reporting to avoid alert fatigue.
* **Scalability:** Ready for EU5, Mexico, and Australia MCC structures.

---

### 👤 Author & Credits
**Lead Architect:** Daniel Alonso  
**Role:** Global Head of Data & AdTech for SEAT, CUPRA & Škoda @ Omnicom Media  
**Copyright:** © 2025. Developed for Global Data Operations.