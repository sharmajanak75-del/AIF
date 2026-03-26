import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const port = process.env.PORT || 3001;
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'aif-metric-extractor' });
});

app.post('/api/extract-metrics', upload.single('deck'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing PDF file. Send form-data with field name "deck".' });
    }

    if (!client) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
    }

    const pdfResult = await pdfParse(req.file.buffer);
    const fullText = (pdfResult.text || '').replace(/\s+/g, ' ').trim();

    if (!fullText) {
      return res.status(422).json({ error: 'Could not extract readable text from this PDF.' });
    }

    const strategyHint = req.body?.strategy || null;
    const fundSizeHint = req.body?.fundSizeInr ? Number(req.body.fundSizeInr) : null;

    const prompt = `Extract fund metrics from this deck text and provide a qualitative IC-style diagnostic.
Return JSON only.

Context hints:
- strategyHint: ${strategyHint || 'unknown'}
- fundSizeHintInrCr: ${Number.isFinite(fundSizeHint) ? fundSizeHint : 'unknown'}

Deck text:\n${fullText.slice(0, 100000)}`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'aif_metrics',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              fundName: { type: ['string', 'null'] },
              vintageYear: { type: ['integer', 'null'] },
              fundSizeInrCr: { type: ['number', 'null'] },
              irr: { type: ['number', 'null'] },
              tvpi: { type: ['number', 'null'] },
              dpi: { type: ['number', 'null'] },
              rvpi: { type: ['number', 'null'] },
              pme: { type: ['number', 'null'] },
              confidence: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  irr: { type: 'number' },
                  tvpi: { type: 'number' },
                  dpi: { type: 'number' },
                  rvpi: { type: 'number' },
                  pme: { type: 'number' }
                },
                required: ['irr', 'tvpi', 'dpi', 'rvpi', 'pme']
              },
              notes: {
                type: 'array',
                items: { type: 'string' }
              },
              qualitativeEvaluation: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  inferredStrategy: { type: ['string', 'null'] },
                  irrRealism: { type: 'string' },
                  dpiExitStrength: { type: 'string' },
                  fundSizeFit: { type: 'string' },
                  redFlagSummary: { type: 'string' },
                  redFlags: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['inferredStrategy', 'irrRealism', 'dpiExitStrength', 'fundSizeFit', 'redFlagSummary', 'redFlags']
              }
            },
            required: ['fundName', 'vintageYear', 'fundSizeInrCr', 'irr', 'tvpi', 'dpi', 'rvpi', 'pme', 'confidence', 'notes', 'qualitativeEvaluation']
          }
        }
      },
      messages: [
        {
          role: 'system',
          content:
            'You extract private market fund metrics and provide an IC-style diagnostic. Prefer net metrics and fund-level values. If a value is absent, return null. Do not hallucinate. Explicitly: flag unrealistic IRR versus strategy norms, weak DPI/exit conversion, and fund-size-to-strategy misalignment. Provide a concise red flag summary.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');

    return res.json({
      source: {
        fileName: req.file.originalname,
        pages: pdfResult.numpages
      },
      extracted: parsed
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Failed to extract metrics from PDF.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(port, () => {
  console.log(`AIF metric extractor API listening on http://localhost:${port}`);
});
