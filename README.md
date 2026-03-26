package.json
README.md
AGENTS.md
# AGENTS.md

## Goal
Build an AIF evaluator tool that:
- Takes PDF fund decks
- Extracts key metrics (IRR, TVPI, DPI, RVPI, PME)
- Auto-fills evaluator UI
- Generates IC-style evaluation

## Stack
- Frontend: React
- Backend: Node.js / Python
- LLM: OpenAI

## Tasks
- Add PDF upload
- Extract metrics from decks
- Map extracted data to scoring engine
- Generate summary report

## Rules
- Keep scoring logic unchanged
- Focus on automation layer
- Output should be investor-grade
