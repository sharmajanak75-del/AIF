# AIF Evaluator + PDF Metric Extraction

This repo now includes:
- A React-based AIF evaluator UI (`aif-evaluator.jsx`)
- A Node.js backend API for PDF upload + metric extraction (`backend/server.js`)
- OpenAI-powered extraction of fund metrics into structured JSON

## What the backend does

`POST /api/extract-metrics`
- Accepts multipart form-data with a `deck` PDF file
- Extracts text using `pdf-parse`
- Sends text to OpenAI to extract:
  - IRR
  - TVPI
  - DPI
  - RVPI
  - PME
  - plus optional `fundName`, `vintageYear`, `fundSizeInrCr`
- Also returns qualitative diagnostics:
  - IRR realism vs inferred strategy benchmark
  - DPI / exit strength commentary
  - Fund-size-to-strategy fit assessment
  - Red flag summary + bullet red flags
- Returns structured JSON suitable for direct UI auto-fill

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
cp .env.example .env
```

3. Add your key in `.env`:
```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
PORT=3001
```

4. Start backend:
```bash
npm run dev:backend
```

5. In a separate terminal, start frontend:
```bash
npm run dev
```

Or run both together:
```bash
npm run dev:fullstack
```

## Frontend integration

In step 1 (`Classification`) of the evaluator, upload a PDF fund deck.
The app calls `http://localhost:3001/api/extract-metrics` and auto-populates:
- Fund name
- Vintage year
- Fund size
- IRR / TVPI / DPI / RVPI / PME
- AI qualitative evaluation with red flag summary

## Local access URLs

- Frontend app: `http://localhost:5173`
- Backend health check: `http://localhost:3001/health`
- Backend extraction API: `POST http://localhost:3001/api/extract-metrics`

## Example API response

```json
{
  "source": {
    "fileName": "Fund_Deck.pdf",
    "pages": 32
  },
  "extracted": {
    "fundName": "Acme Growth Fund III",
    "vintageYear": 2021,
    "fundSizeInrCr": 1500,
    "irr": 22.5,
    "tvpi": 2.1,
    "dpi": 0.9,
    "rvpi": 1.2,
    "pme": 1.3,
    "confidence": {
      "irr": 0.94,
      "tvpi": 0.91,
      "dpi": 0.88,
      "rvpi": 0.9,
      "pme": 0.8
    },
    "notes": [
      "Net IRR identified on track record page.",
      "TVPI appears as MoM equivalent in portfolio summary."
    ]
  }
}
```
