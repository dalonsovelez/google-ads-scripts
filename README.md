# Google Ads Global Conversion Monitoring Framework
## Technical QA & Data Integrity for SEAT, CUPRA & Škoda

---

### 📋 Strategic Overview
In high-complexity AdTech environments, tracking failures in conversion pixels (Floodlights) can lead to significant media spend inefficiency. This **Google Ads Script (JavaScript)** provides an automated, baseline-driven monitoring layer across a global MCC ecosystem.

Designed for coordination between Omnicom agencies, it ensures that tracking anomalies are detected within 48 hours, safeguarding algorithmic optimization.

### 🚀 Key Technical Features
* **Baseline-Driven Anomaly Detection:** Compares real-time performance against a 14-day rolling average using GAQL (Google Ads Query Language).
* **Market-Specific Heuristics:** Includes logic to filter relevance based on ISO country codes and brand prefixes.
* **Consolidated Global Alerting:** Aggregates alerts from multiple markets into a single executive report to prevent alert fatigue.
* **Zero-Trust Architecture:** Designed to run in restricted MCC environments with full audit logging.



### 🛠 Implementation Guide
1.  Navigate to your **Google Ads MCC** > Tools & Settings > Scripts.
2.  Create a new script and copy the content from `/scripts/google_ads_conversion_monitor.js`.
3.  Grant **MccApp** and **MailApp** permissions.
4.  Configure the `NOTIFICATION_EMAILS` and `DROP_PERCENTAGE_THRESHOLD` variables.
5.  Schedule for **Daily Execution** (Recommended: 05:00 AM).

---
### 👤 Credits
**Author:** Daniel Alonso  
**Role:** Global Head of Data & AdTech for SEAT, CUPRA & Škoda @ Omnicom Media  
**Context:** Global operations management (Europe, MENA, Mexico, Australia).  
**Copyright © 2025. This asset is part of the Global AdTech Governance Framework.**
