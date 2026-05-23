/**
 * mcp_stitch_bridge.js — NutriChain AI MCP Server
 * ─────────────────────────────────────────────────
 * A standard Model Context Protocol (MCP) server that wraps the NutriChain
 * Express backend APIs as agent-queryable tools. Runs via stdio transport so
 * any MCP-compatible host (Claude Desktop, Cursor, Google Antigravity, etc.)
 * can invoke backend operations directly.
 *
 * Usage:
 *   node server/mcp_stitch_bridge.js
 *
 * Required env vars (or defaults are used for local dev):
 *   NUTRICHAIN_API_URL   — Base URL of the Express API  (default: http://localhost:5000)
 *   NUTRICHAIN_JWT_TOKEN — Pre-issued manufacturer JWT   (default: empty string)
 */

import { Server }              from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// ── Runtime Configuration ──────────────────────────────────────────────────
const API_BASE = (process.env.NUTRICHAIN_API_URL  || 'http://localhost:5000').replace(/\/$/, '');
const JWT      =  process.env.NUTRICHAIN_JWT_TOKEN || '';

// ── HTTP helper (uses built-in fetch — Node 18+) ──────────────────────────
async function apiPost(path, body, authRequired = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (authRequired && JWT) headers['Authorization'] = `Bearer ${JWT}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(15_000)   // 15-second hard timeout
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new McpError(
      ErrorCode.InternalError,
      `NutriChain API error ${res.status}: ${JSON.stringify(data)}`
    );
  }
  return data;
}

async function apiGet(path) {
  const headers = {};
  if (JWT) headers['Authorization'] = `Bearer ${JWT}`;
  const res  = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new McpError(ErrorCode.InternalError, `GET ${path} failed: ${res.status}`);
  return data;
}

// ══════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════
const TOOL_DEFINITIONS = [

  // ── TOOL A: verify_container_unit ───────────────────────────────────────
  {
    name:        'verify_container_unit',
    description: `Verifies a NutriChain product QR container code using the device-level hardcap 
engine. Applies 3-rule gatekeeping:
  • Rule A — First scan: registers UUID as primary claimant
  • Rule B — Legitimate re-scan: increments counter (max 3 per device)
  • Rule C — UUID mismatch: triggers COUNTERFEIT_ALERT and blocks immediately`,
    inputSchema: {
      type:     'object',
      required: ['containerCode', 'consumerUuid'],
      properties: {
        containerCode: {
          type:        'string',
          description: 'The scanned QR child unit identifier (e.g. NC-BATCH-...-01)'
        },
        consumerUuid: {
          type:        'string',
          description: 'Permanent browser device UUID from getOrCreateConsumerUUID() (e.g. NC-ID-...)'
        },
        location: {
          type:        'object',
          description: 'Optional geo-context of the scan',
          properties: {
            name: { type: 'string' },
            lat:  { type: 'number' },
            lng:  { type: 'number' }
          }
        }
      }
    }
  },

  // ── TOOL B: mint_production_batch ───────────────────────────────────────
  {
    name:        'mint_production_batch',
    description: `Mints a new hierarchical QR parent batch onto the Polygon Amoy blockchain via 
the NutriChain provenance smart contract. Creates a parent batch record, distributes 
child QR units across sub-batches, and returns cryptographic identifiers for label printing.`,
    inputSchema: {
      type:     'object',
      required: ['batchId', 'itemQuantity'],
      properties: {
        batchId: {
          type:        'string',
          description: 'Unique batch identifier string (e.g. OMEGA3-Q2-2025)'
        },
        itemQuantity: {
          type:        'integer',
          description: 'Total number of child QR units to generate (1–10000)',
          minimum:     1,
          maximum:     10000
        },
        metadata: {
          type:        'object',
          description: 'Optional batch metadata',
          properties: {
            productVariant:       { type: 'string' },
            assignedDistributorId:{ type: 'string' },
            manufactureDate:      { type: 'string' },
            expiryDate:           { type: 'string' }
          }
        }
      }
    }
  },

  // ── TOOL C: get_telemetry_stats ──────────────────────────────────────────
  {
    name:        'get_telemetry_stats',
    description: 'Returns live platform telemetry metrics: total minted QR units, active codes, total scans, flagged anomalies, and verification velocity (scans/hour).',
    inputSchema: {
      type:       'object',
      properties: {},
      required:   []
    }
  },

  // ── TOOL D: get_recent_scans ─────────────────────────────────────────────
  {
    name:        'get_recent_scans',
    description: 'Retrieves the most recent scan telemetry logs (up to 50 entries), including location, anomaly scores, and threat reasons.',
    inputSchema: {
      type:       'object',
      properties: {
        limit: {
          type:        'integer',
          description: 'Number of records to return (default: 20, max: 50)',
          minimum:     1,
          maximum:     50
        }
      },
      required: []
    }
  }

];

// ══════════════════════════════════════════════════════════════════════════
// MCP SERVER INITIALISATION
// ══════════════════════════════════════════════════════════════════════════
const server = new Server(
  { name: 'nutrichain-stitch-connector', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ── List Tools Handler ─────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS
}));

// ── Call Tool Handler ──────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    // ─────────────────────────────────────────────────────────────────────
    // TOOL A: verify_container_unit
    // Hits POST /api/verify-device — device-level UUID hardcap engine
    // ─────────────────────────────────────────────────────────────────────
    if (name === 'verify_container_unit') {
      const { containerCode, consumerUuid, location = {} } = args;

      if (!containerCode || typeof containerCode !== 'string') {
        throw new McpError(ErrorCode.InvalidParams, 'containerCode is required and must be a string.');
      }
      if (!consumerUuid || typeof consumerUuid !== 'string') {
        throw new McpError(ErrorCode.InvalidParams, 'consumerUuid is required and must be a string.');
      }

      const result = await apiPost('/api/verify-device', {
        containerCode: containerCode.trim(),
        consumerUuid:  consumerUuid.trim(),
        location: {
          name: location.name || 'MCP Agent Terminal',
          lat:  Number(location.lat)  || 12.9716,
          lng:  Number(location.lng)  || 77.5946
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status:        result.status,
            message:       result.message,
            scanCountLeft: result.scanCountLeft,
            totalAllowed:  result.totalAllowed,
            containerCode: result.containerCode,
            ripplePulse:   result.ripplePulse ?? null
          }, null, 2)
        }]
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // TOOL B: mint_production_batch
    // Hits POST /api/batches — mints parent batch + child QR units on Polygon
    // ─────────────────────────────────────────────────────────────────────
    if (name === 'mint_production_batch') {
      const { batchId, itemQuantity, metadata = {} } = args;

      if (!batchId || typeof batchId !== 'string') {
        throw new McpError(ErrorCode.InvalidParams, 'batchId is required and must be a string.');
      }
      if (!Number.isInteger(itemQuantity) || itemQuantity < 1 || itemQuantity > 10000) {
        throw new McpError(ErrorCode.InvalidParams, 'itemQuantity must be an integer between 1 and 10000.');
      }

      const result = await apiPost('/api/batches', {
        batchId:               batchId.trim(),
        productVariant:        metadata.productVariant        || 'SUPPLEMENT',
        totalUnits:            itemQuantity,
        assignedDistributorId: metadata.assignedDistributorId || 'MCP-AGENT-DISTRIBUTOR',
        manufactureDate:       metadata.manufactureDate        || new Date().toISOString().split('T')[0],
        expiryDate:            metadata.expiryDate             || ''
      }, true);  // requires JWT auth

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success:      true,
            batchId:      result.batchId      ?? batchId,
            polygonTxHash:result.polygonTxHash ?? result.txHash ?? null,
            childQRCount: result.childQRs?.length ?? itemQuantity,
            subBatches:   result.subBatches?.length ?? null,
            message:      result.message ?? 'Batch minted and registered on Polygon Amoy.',
            childQRSample:result.childQRs?.slice(0, 5) ?? []
          }, null, 2)
        }]
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // TOOL C: get_telemetry_stats
    // ─────────────────────────────────────────────────────────────────────
    if (name === 'get_telemetry_stats') {
      const data = await apiGet('/api/telemetry/stats');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // TOOL D: get_recent_scans
    // ─────────────────────────────────────────────────────────────────────
    if (name === 'get_recent_scans') {
      const limit = Math.min(Number(args.limit) || 20, 50);
      const data  = await apiGet('/api/telemetry/scans');
      const sliced = Array.isArray(data) ? data.slice(0, limit) : data;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(sliced, null, 2)
        }]
      };
    }

    // Unknown tool
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);

  } catch (err) {
    if (err instanceof McpError) throw err;
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed for "${name}": ${err.message}`
    );
  }
});

// ══════════════════════════════════════════════════════════════════════════
// STARTUP
// ══════════════════════════════════════════════════════════════════════════
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP JSON-RPC messages)
  process.stderr.write(`🛡️  NutriChain MCP Stitch Bridge running.\n`);
  process.stderr.write(`    API target: ${API_BASE}\n`);
  process.stderr.write(`    JWT auth:   ${JWT ? 'configured' : 'NOT SET — mint_production_batch will fail'}\n`);
  process.stderr.write(`    Tools:      ${TOOL_DEFINITIONS.map(t => t.name).join(', ')}\n`);
}

main().catch(err => {
  process.stderr.write(`❌ MCP server fatal error: ${err.message}\n`);
  process.exit(1);
});
