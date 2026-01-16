
# MarketMinder AI 🇰🇪 - Nairobi Conversational ERP

**MarketMinder AI** is a specialized Conversational ERP designed for informal traders in Nairobi (Gikomba, Wakulima, etc.). It bridges the gap between digital illiteracy and modern business intelligence.

## 🏛️ System Architecture

1.  **Local-First Layer**: React + PWA (Service Workers) + LocalStorage. Data is persistent and functional even in underground market stalls with zero signal.
2.  **AI Orchestration Layer**:
    *   **Gemini 3 Flash**: Rapid extraction of transaction intent from Sheng slang/audio.
    *   **Gemini 3 Pro**: Deep reasoning with 15k+ Thinking Budget for price forecasting and risk analysis.
    *   **Gemini 2.5 Flash TTS**: Real-time audio feedback in local accents.
3.  **Synchronization Layer**: Automatic "Sync-on-Reconnect" logic pushes local blobs to a secure vault when 4G signal returns.

## 🚀 Hackathon Innovation Highlights

-   **Sheng Slang Processing**: Custom prompt engineering to resolve street currency terms like 'Mbao', 'Chuani', and 'Ngiri'.
-   **Multimodal Compliance**: Gemini-Vision parses receipts while automatically masking Personal Identifying Information (PII) to ensure **Kenya Data Protection Act (KDPA)** compliance.
-   **Low-Literacy Design**: A "Chat-First" interface that feels like WhatsApp, removing the intimidation of traditional ERP forms.

## 📊 Expected Impact

-   **Efficiency**: Reduces daily bookkeeping time from 45 mins to < 5 mins via voice/scan.
-   **Financial Inclusion**: Generates "Audit-Ready" CSV reports that serve as verifiable character evidence for KCB/M-Shwari loans.
-   **Waste Reduction**: Low-stock and oversupply alerts based on market price cycles save traders an estimated 15% in inventory losses.

## 🛡️ Privacy & Compliance

-   **Data Sovereignty**: Users own their local ledger. AI processing is stateless.
-   **Transparency**: Consent management UI explicitly warns users before data is sent for cloud-based "Deep Thinking" analytics.
-   **GDPR/KDPA Ready**: Features built-in PII masking and data deletion toggles.

---
*Building for the 'Matatu' of businesses—informal, fast, and the backbone of Kenya.*
