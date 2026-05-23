/**
 * verifyController.js — NutriChain AI Device-Level Scan Hardcap Controller
 * -------------------------------------------------------------------------
 * Express route handler for POST /api/verify-device
 *
 * Three-rule deterministic gatekeeping strategy:
 *   Rule A — New Code Claim      → first scan, brand device as primary claimant
 *   Rule B — Legitimate Re-scan  → same UUID, enforce scan hardcap (max 3)
 *   Rule C — Counterfeit Intercept → UUID mismatch, flag and block immediately
 *
 * This controller is self-contained and works with both MongoDB (live)
 * and the in-memory sandbox fallback already wired in server.js.
 */

const mongoose = require('mongoose');

// ── DeviceScanLog Schema ───────────────────────────────────────────────────
// Lightweight collection — one document per containerCode.
// Stored separately from the legacy ScanLog to avoid schema conflicts.
const DeviceScanLogSchema = new mongoose.Schema({
  containerCode:  { type: String, required: true, unique: true, index: true },
  consumerUuid:   { type: String, required: true },  // primary claimant UUID
  scanCount:      { type: Number, default: 1 },
  timestamps:     [{ type: Date }],
  locationHistory:[{ name: String, lat: Number, lng: Number, at: Date }],
  createdAt:      { type: Date, default: Date.now }
});

// Re-use compiled model if it already exists (hot-reload safe)
const DeviceScanLog = mongoose.models.DeviceScanLog
  || mongoose.model('DeviceScanLog', DeviceScanLogSchema);

// ── In-Memory Fallback Store ───────────────────────────────────────────────
// Mirrors the DeviceScanLog structure for sandbox mode.
global._deviceScanCache = global._deviceScanCache || {};

const isMongoConnected = () =>
  mongoose.connection && mongoose.connection.readyState === 1;

// ── Helper: resolve record from correct storage layer ─────────────────────
const findRecord = async (containerCode) => {
  if (isMongoConnected()) {
    return DeviceScanLog.findOne({ containerCode });
  }
  return global._deviceScanCache[containerCode] || null;
};

const saveRecord = async (doc) => {
  if (isMongoConnected()) {
    if (doc instanceof mongoose.Document) {
      return doc.save();
    }
    return new DeviceScanLog(doc).save();
  }
  // In-memory persistence
  global._deviceScanCache[doc.containerCode] = {
    ...global._deviceScanCache[doc.containerCode],
    ...doc
  };
  return global._deviceScanCache[doc.containerCode];
};

const atomicIncrement = async (containerCode, location) => {
  const now = new Date();
  if (isMongoConnected()) {
    return DeviceScanLog.findOneAndUpdate(
      { containerCode },
      {
        $inc: { scanCount: 1 },
        $push: {
          timestamps: now,
          locationHistory: { name: location.name, lat: location.lat, lng: location.lng, at: now }
        }
      },
      { new: true }
    );
  }
  // In-memory fallback
  const rec = global._deviceScanCache[containerCode];
  if (rec) {
    rec.scanCount += 1;
    rec.timestamps.push(now);
    rec.locationHistory.push({ name: location.name, lat: location.lat, lng: location.lng, at: now });
  }
  return rec;
};

// ── Constants ──────────────────────────────────────────────────────────────
const SCAN_HARDCAP = 3;

// ── Main Route Handler ─────────────────────────────────────────────────────
/**
 * POST /api/verify-device
 * Body: { containerCode: string, consumerUuid: string, location: { name, lat, lng } }
 */
const verifyDeviceHandler = async (req, res) => {
  try {
    const { containerCode, consumerUuid, location } = req.body;

    // ── Input validation ──────────────────────────────────────────────────
    if (!containerCode || !consumerUuid) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'containerCode and consumerUuid are required fields.'
      });
    }

    const scanLocation = {
      name: location?.name || 'Unknown Location',
      lat:  Number(location?.lat)  || 0,
      lng:  Number(location?.lng)  || 0,
    };

    const existingRecord = await findRecord(containerCode);

    // ════════════════════════════════════════════════════════════════════════
    // RULE A — NEW CODE CLAIM
    // This containerCode has never been scanned. Brand this device as the
    // sole primary claimant and initialize the scan-history document.
    // ════════════════════════════════════════════════════════════════════════
    if (!existingRecord) {
      const now = new Date();
      const newRecord = {
        containerCode,
        consumerUuid,
        scanCount: 1,
        timestamps: [now],
        locationHistory: [{ name: scanLocation.name, lat: scanLocation.lat, lng: scanLocation.lng, at: now }],
        createdAt: now
      };
      await saveRecord(newRecord);

      console.log(`✅ [DeviceVerify] Rule A — New claim registered. Code: ${containerCode} | UUID: ${consumerUuid}`);
      return res.status(200).json({
        status: 'GENUINE',
        message: '✅ First verification successful. Product registered to your device.',
        scanCountLeft: SCAN_HARDCAP - 1,
        totalAllowed: SCAN_HARDCAP,
        containerCode
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // RULE C — COUNTERFEIT INTERCEPTION
    // Record exists but UUID does NOT match the stored primary claimant.
    // This is a definitive counterfeit / clone signal — terminate immediately.
    // ════════════════════════════════════════════════════════════════════════
    if (existingRecord.consumerUuid !== consumerUuid) {
      console.warn(`🚨 [DeviceVerify] Rule C FIRED — UUID mismatch on ${containerCode}. Stored: ${existingRecord.consumerUuid} | Incoming: ${consumerUuid}`);

      // Emit event for the AI Threat Dashboard telemetry pipeline
      // (hooks into the global in-memory scanlog for dashboard visibility)
      if (global._deviceScanCache) {
        global._deviceScanCache[`THREAT_${Date.now()}`] = {
          containerCode,
          incomingUuid: consumerUuid,
          claimantUuid: existingRecord.consumerUuid,
          type: 'COUNTERFEIT_INTERCEPT',
          at: new Date()
        };
      }

      return res.status(401).json({
        status: 'COUNTERFEIT_ALERT',
        message: 'COUNTERFEIT_ALERT: Token identity mismatch',
        details: 'This product code is already registered to a different consumer device. This indicates a cloned or counterfeit product.',
        ripplePulse: 'crimson'
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // RULE B — LEGITIMATE RE-VERIFICATION
    // UUID matches the primary claimant. Apply the scan hardcap.
    // ════════════════════════════════════════════════════════════════════════

    // Rule B-i: Hardcap exceeded — deny access permanently
    if (existingRecord.scanCount >= SCAN_HARDCAP) {
      console.warn(`🔒 [DeviceVerify] Rule B-i — Scan hardcap reached. Code: ${containerCode} (${existingRecord.scanCount}/${SCAN_HARDCAP})`);
      return res.status(403).json({
        status: 'LOCKED',
        message: `⚠️ Scan limit reached. This product code has been verified ${existingRecord.scanCount} times, which is the maximum allowed. No further scans are permitted.`,
        scanCount: existingRecord.scanCount,
        scanCountLeft: 0,
        totalAllowed: SCAN_HARDCAP,
        containerCode
      });
    }

    // Rule B-ii: Hardcap not yet reached — increment atomically and allow
    const updated = await atomicIncrement(containerCode, scanLocation);
    const scansRemaining = SCAN_HARDCAP - updated.scanCount;

    console.log(`✅ [DeviceVerify] Rule B-ii — Re-verification approved. Code: ${containerCode} | Scans: ${updated.scanCount}/${SCAN_HARDCAP}`);
    return res.status(200).json({
      status: 'GENUINE',
      message: `✅ Product verified. ${scansRemaining} verification${scansRemaining !== 1 ? 's' : ''} remaining on this code.`,
      scanCount: updated.scanCount,
      scanCountLeft: scansRemaining,
      totalAllowed: SCAN_HARDCAP,
      containerCode
    });

  } catch (error) {
    console.error('❌ [DeviceVerify] Controller crash:', error.message);
    return res.status(500).json({
      status: 'ERROR',
      message: 'Device scan verification system error.',
      error: error.message
    });
  }
};

module.exports = { verifyDeviceHandler };
