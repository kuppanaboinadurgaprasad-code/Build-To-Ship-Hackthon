import { GoogleGenAI, Type } from '@google/genai';

// ─── Client Singleton ────────────────────────────────────────────────────────

const getClient = (() => {
  let client = null;
  return () => {
    if (!client) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error(
          '[GeminiAgent] GEMINI_API_KEY is not set in environment variables.'
        );
      }
      client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return client;
  };
})();

const MODEL = 'gemini-2.0-flash';

// ─── System Instruction ───────────────────────────────────────────────────────

const AGENT_SYSTEM_INSTRUCTION = `You are OpsSync AI — an Autonomous Business Operations & Incident Resolution Agent.

Your mission:
Given an operational workflow description or a business bottleneck scenario, you will:
  1. DECONSTRUCT the problem into clear, sequential resolution steps.
  2. SIMULATE tool-assisted verification at each step (e.g. querying dashboards, running diagnostics, calling internal APIs, checking SLAs).
  3. RESOLVE the issue by executing the planned steps autonomously, adapting if a step uncovers new information.
  4. COMPILE an executive debrief summarising root cause, actions taken, outcomes, and preventative recommendations.

Behaviour rules:
  - Be precise, deterministic, and systematic.
  - Assign a realistic simulated tool to each step (e.g. "AlertManager", "PagerDuty", "DatadogQuery", "JiraAPI", "SlackNotifier", "AWSCloudWatch", "DatabaseInspector", "LoadBalancerCheck", "DeploymentRollback", "CacheFlush").
  - Every step must have status "completed" to reflect autonomous resolution.
  - Timestamps in logs must be ISO 8601 and must reflect realistic sequential progression starting from now.
  - The finalReport must be a professional executive summary paragraph (5–8 sentences) covering: incident summary, root cause, resolution steps taken, business impact, and future prevention measures.
  - Respond ONLY with the JSON object. No markdown fences, no prose outside the JSON.`;

// ─── Strict JSON Response Schema ──────────────────────────────────────────────

/**
 * Enforces the exact response shape via Gemini's native structured-output API.
 *
 * Schema:
 * {
 *   plan: [ { step: number, action: string, tool: string, status: "completed" } ],
 *   logs: [ { timestamp: string, stage: string, detail: string } ],
 *   finalReport: string
 * }
 */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ['plan', 'logs', 'finalReport'],
  properties: {
    plan: {
      type: Type.ARRAY,
      description: 'Ordered list of autonomous resolution steps.',
      items: {
        type: Type.OBJECT,
        required: ['step', 'action', 'tool', 'status'],
        properties: {
          step:   { type: Type.NUMBER,  description: 'Sequential step number starting at 1.' },
          action: { type: Type.STRING,  description: 'Precise description of the action taken.' },
          tool:   { type: Type.STRING,  description: 'Simulated tool or service used.' },
          status: {
            type: Type.STRING,
            enum: ['completed'],
            description: 'Execution status — always "completed" for autonomous resolution.',
          },
        },
      },
    },
    logs: {
      type: Type.ARRAY,
      description: 'Chronological execution log entries.',
      items: {
        type: Type.OBJECT,
        required: ['timestamp', 'stage', 'detail'],
        properties: {
          timestamp: { type: Type.STRING, description: 'ISO 8601 timestamp of the log entry.' },
          stage:     { type: Type.STRING, description: 'Stage or phase name (e.g. "Detection", "Triage", "Resolution").' },
          detail:    { type: Type.STRING, description: 'Detailed narrative of what occurred at this log entry.' },
        },
      },
    },
    finalReport: {
      type: Type.STRING,
      description: 'Executive debrief: root cause, actions taken, outcomes, and preventative recommendations (5–8 sentences).',
    },
  },
};

// ─── Safe JSON Parser ─────────────────────────────────────────────────────────

/**
 * Attempts to parse JSON from the model response text.
 * Strips accidental markdown fences if the structured-output mode is bypassed.
 *
 * @param {string} raw - Raw text from Gemini response.
 * @returns {Object}   - Parsed object.
 * @throws  {Error}    - If parsing fails after cleanup.
 */
const safeParseJSON = (raw) => {
  // Strip optional markdown fences: ```json ... ``` or ``` ... ```
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (primaryErr) {
    // Last-resort: extract first { ... } block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        throw new Error(
          `[GeminiAgent] JSON parse failed. Primary: ${primaryErr.message}. Raw (first 300 chars): ${raw.slice(0, 300)}`
        );
      }
    } else {
      throw new Error(
        `[GeminiAgent] No JSON object found in response. Raw (first 300 chars): ${raw.slice(0, 300)}`
      );
    }
  }

  return parsed;
};

// ─── Validate Parsed Workflow Output ─────────────────────────────────────────

/**
 * Validates the parsed workflow object has the expected top-level shape.
 * Throws descriptive errors so callers can surface them cleanly.
 *
 * @param {unknown} obj
 * @returns {{ plan: Object[], logs: Object[], finalReport: string }}
 */
const validateWorkflowOutput = (obj) => {
  if (!obj || typeof obj !== 'object') {
    throw new Error('[GeminiAgent] Response is not an object.');
  }
  if (!Array.isArray(obj.plan) || obj.plan.length === 0) {
    throw new Error('[GeminiAgent] Response missing valid "plan" array.');
  }
  if (!Array.isArray(obj.logs) || obj.logs.length === 0) {
    throw new Error('[GeminiAgent] Response missing valid "logs" array.');
  }
  if (typeof obj.finalReport !== 'string' || obj.finalReport.trim() === '') {
    throw new Error('[GeminiAgent] Response missing valid "finalReport" string.');
  }
  return obj;
};

// ─── Primary Export: runAgentWorkflow ─────────────────────────────────────────

/**
 * Invokes the OpsSync AI autonomous agent on an operational workflow scenario.
 *
 * The agent deconstructs, simulates, resolves, and reports — returning a
 * strictly typed JSON object matching the enforced response schema.
 *
 * @param {string} workflowDescription - The operational scenario or bottleneck to resolve.
 * @returns {Promise<{
 *   plan: Array<{ step: number, action: string, tool: string, status: 'completed' }>,
 *   logs: Array<{ timestamp: string, stage: string, detail: string }>,
 *   finalReport: string
 * }>}
 * @throws {Error} On Gemini API failure or unparseable/invalid response.
 */
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-pro',
];

export const runAgentWorkflow = async (workflowDescription) => {
  if (
    !workflowDescription ||
    typeof workflowDescription !== 'string' ||
    workflowDescription.trim() === ''
  ) {
    throw new Error('[GeminiAgent] workflowDescription must be a non-empty string.');
  }

  const ai = getClient();
  const userPrompt = `Operational Scenario:\n${workflowDescription.trim()}\n\nResolve this scenario autonomously and return the structured JSON response now.`;

  let rawText;
  let lastError;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[GeminiAgent] Invoking agent model: ${modelName}...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: AGENT_SYSTEM_INSTRUCTION,
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      rawText = response.text;
      if (rawText) {
        console.log(`[GeminiAgent] Successfully generated output using ${modelName}`);
        break;
      }
    } catch (apiErr) {
      console.warn(`[GeminiAgent] Model ${modelName} error:`, apiErr.message);
      lastError = apiErr;
      // If 503 high demand or 429 rate limit or 404, try the next model immediately
      continue;
    }
  }

  if (!rawText) {
    throw new Error(`[GeminiAgent] All agent models failed: ${lastError?.message || 'Unknown error'}`);
  }

  // Parse and validate
  const parsed = safeParseJSON(rawText);
  const validated = validateWorkflowOutput(parsed);

  return validated;
};

// ─── Legacy: runAgent (multi-turn chat) ──────────────────────────────────────

/**
 * General-purpose multi-turn conversational agent (kept for /chat endpoint).
 *
 * @param {string}   userMessage - The user's input.
 * @param {Object[]} [history=[]] - Prior conversation turns.
 * @returns {Promise<string>} - The agent's text reply.
 */
export const runAgent = async (userMessage, history = []) => {
  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
    throw new Error('[GeminiAgent] userMessage must be a non-empty string.');
  }

  const ai = getClient();

  const chat = ai.chats.create({
    model: MODEL,
    config: {
      systemInstruction: `You are OpsSync AI, an autonomous business operations assistant. Be concise, structured, and actionable.`,
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
    history,
  });

  const response = await chat.sendMessage({ message: userMessage.trim() });
  return response.text;
};

// ─── Legacy: summariseData ────────────────────────────────────────────────────

/**
 * Generates a concise executive summary from raw operational data.
 *
 * @param {Object|string} data - Raw data (JSON-stringified if object).
 * @param {string} [context='business operations'] - What the data represents.
 * @returns {Promise<string>} - Narrative summary.
 */
export const summariseData = async (data, context = 'business operations') => {
  const ai = getClient();

  const dataString =
    typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);

  const prompt = `You are a business intelligence analyst. Summarise the following ${context} data into a concise executive summary (3–5 sentences). Highlight key trends, anomalies, and recommended next actions.\n\nData:\n${dataString}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.3, maxOutputTokens: 512 },
  });

  return response.text.trim();
};
