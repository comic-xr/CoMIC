const { createLogger } = require("../utils/logger");

const log = createLogger("snapshot-diff-explainer");

function normalizeSnapshotState(snapshot) {
  const raw = snapshot?.snapshot_data;
  if (!raw) return {};

  const normalizeStateObject = (value) => {
    if (!value || typeof value !== "object") return {};
    if (value.state && typeof value.state === "object") return value.state;
    return value;
  };

  if (typeof raw === "string") {
    try {
      return normalizeStateObject(JSON.parse(raw));
    } catch (_error) {
      return {};
    }
  }

  return normalizeStateObject(raw);
}

function parseJsonIfNeeded(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return value;

  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    return value;
  }
}

function stableValue(value) {
  if (value === undefined) return null;
  return parseJsonIfNeeded(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function collectSnapshotDiff(snapshotA, snapshotB) {
  const aState = normalizeSnapshotState(snapshotA);
  const bState = normalizeSnapshotState(snapshotB);
  const rows = [];

  const walk = (aValue, bValue, path = "") => {
    const a = stableValue(aValue);
    const b = stableValue(bValue);

    if (isPlainObject(a) && isPlainObject(b)) {
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
      keys.forEach((key) => {
        walk(a[key], b[key], path ? `${path}.${key}` : key);
      });
      return;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        rows.push({ path: path || "state", before: a, after: b });
      }
      return;
    }

    if (JSON.stringify(a) !== JSON.stringify(b)) {
      rows.push({ path: path || "state", before: a, after: b });
    }
  };

  walk(aState, bState);
  return rows;
}

function summarizeChangeKind(path) {
  const normalized = String(path || "").toLowerCase();
  if (normalized.startsWith("camera")) {
    return "Camera position or orientation changed, indicating a different viewpoint.";
  }
  if (normalized.startsWith("filters")) {
    return "Filter parameters changed, indicating refinement of the visible data subset.";
  }
  if (normalized.startsWith("widgets")) {
    return "Widget state changed, indicating a different analytical tool configuration.";
  }
  if (normalized.startsWith("color_maps")) {
    return "Color mapping changed, indicating a different visual emphasis.";
  }
  if (normalized.startsWith("annotation")) {
    return "Annotation display settings changed, affecting visual context or labels.";
  }
  return "View state changed in this area of the analysis.";
}

function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : null;
}

function round(value, decimals = 2) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function vectorDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return null;
  if (!a.every((item) => typeof item === "number") || !b.every((item) => typeof item === "number")) {
    return null;
  }

  const sum = a.reduce((acc, item, index) => acc + ((b[index] - item) ** 2), 0);
  return Math.sqrt(sum);
}

function compactList(values, max = 4) {
  const items = [...new Set((values || []).filter(Boolean).map((item) => String(item)))];
  if (!items.length) return "none";
  if (items.length <= max) return items.join(", ");
  return `${items.slice(0, max).join(", ")} (+${items.length - max} more)`;
}

function formatScalar(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean") return value ? "enabled" : "disabled";
  if (typeof value === "number") return String(round(value));
  if (typeof value === "string") return `"${value}"`;
  if (Array.isArray(value)) return `[${compactList(value)}]`;
  if (typeof value === "object") return `${Object.keys(value).length} field object`;
  return String(value);
}

function formatArrayDelta(before, after, noun) {
  const beforeItems = asArray(before) || [];
  const afterItems = asArray(after) || [];
  const added = afterItems.filter((item) => !beforeItems.includes(item));
  const removed = beforeItems.filter((item) => !afterItems.includes(item));

  if (!added.length && !removed.length) {
    return `${noun} changed ordering or structure.`;
  }

  const statements = [];
  if (added.length) statements.push(`added ${compactList(added)}`);
  if (removed.length) statements.push(`removed ${compactList(removed)}`);
  return `${noun} changed: ${statements.join("; ")}.`;
}

function describeGenericChange(path, before, after) {
  if (Array.isArray(before) && Array.isArray(after)) {
    return `${path} changed from ${before.length} item${before.length === 1 ? "" : "s"} to ${after.length} item${after.length === 1 ? "" : "s"}.`;
  }
  if (
    typeof before === "object" && before !== null
    && typeof after === "object" && after !== null
  ) {
    return `${path} changed structurally (${Object.keys(before).length} -> ${Object.keys(after).length} fields).`;
  }
  return `${path} changed from ${formatScalar(before)} to ${formatScalar(after)}.`;
}

function buildCameraInsights(diffRows) {
  const insights = [];
  const byPath = new Map(diffRows.map((row) => [row.path, row]));

  const cameraContainer = byPath.get("camera");
  if (cameraContainer) {
    const beforeMissing = !cameraContainer.before || typeof cameraContainer.before !== "object";
    const afterMissing = !cameraContainer.after || typeof cameraContainer.after !== "object";

    if (beforeMissing || afterMissing) {
      insights.push(
        beforeMissing && afterMissing
          ? "Both snapshots are missing structured camera state, so viewpoint differences cannot be explained reliably."
          : beforeMissing
            ? "Snapshot A is missing structured camera state, so the comparison cannot fully explain how the viewpoint changed."
            : "Snapshot B is missing structured camera state, so the comparison cannot fully explain how the viewpoint changed."
      );
      return insights;
    }
  }

  const cameraPosition = byPath.get("camera.position");
  if (cameraPosition) {
    const distance = vectorDistance(cameraPosition.before, cameraPosition.after);
    if (distance !== null) {
      insights.push(`Camera position moved by ${round(distance)} units, indicating a materially different viewpoint.`);
    }
  }

  const focalPoint = byPath.get("camera.focalPoint");
  if (focalPoint) {
    const distance = vectorDistance(focalPoint.before, focalPoint.after);
    if (distance !== null) {
      insights.push(`The focal point shifted by ${round(distance)} units, so the view is centered on a different region of the data.`);
    }
  }

  const viewUp = byPath.get("camera.viewUp");
  if (viewUp) {
    insights.push("Camera orientation changed, so the same structure may now be interpreted from a different angle.");
  }

  const parallelScale = byPath.get("camera.parallelScale");
  if (parallelScale) {
    const before = asNumber(parallelScale.before);
    const after = asNumber(parallelScale.after);
    if (before !== null && after !== null) {
      const zoomDirection = after < before ? "zoomed in" : "zoomed out";
      insights.push(`Zoom level changed (${round(before)} -> ${round(after)} parallel scale), meaning the analyst ${zoomDirection} on the scene.`);
    }
  }

  const viewAngle = byPath.get("camera.viewAngle");
  if (viewAngle) {
    insights.push(`Perspective changed (${formatScalar(viewAngle.before)} -> ${formatScalar(viewAngle.after)} view angle), which affects depth perception.`);
  }

  const clippingRange = byPath.get("camera.clippingRange");
  if (clippingRange) {
    insights.push("Camera clipping changed, which may expose or hide geometry near the near/far planes.");
  }

  return insights;
}

function buildFilterInsights(diffRows) {
  const insights = [];

  diffRows.forEach((row) => {
    if (!row.path.startsWith("filters")) return;

    if (row.path === "filters.enabled") {
      insights.push(`Filtering was ${row.after ? "enabled" : "disabled"}, which changes whether a constrained subset or the full dataset is shown.`);
      return;
    }

    if (row.path.endsWith(".tags")) {
      insights.push(formatArrayDelta(row.before, row.after, "Filter tags"));
      return;
    }

    if (row.path.endsWith(".types")) {
      insights.push(formatArrayDelta(row.before, row.after, "Filter types"));
      return;
    }

    if (row.path.endsWith(".userIds")) {
      insights.push(formatArrayDelta(row.before, row.after, "User-based filtering"));
      return;
    }

    if (row.path.endsWith(".dateRange")) {
      insights.push(`The time window changed from ${formatScalar(row.before)} to ${formatScalar(row.after)}, altering the temporal subset under inspection.`);
      return;
    }
  });

  if (!insights.length && diffRows.length) {
    insights.push(`Filter configuration changed across ${diffRows.length} field${diffRows.length === 1 ? "" : "s"}, indicating a different data subset is being isolated.`);
  }

  return insights;
}

function buildWidgetInsights(diffRows) {
  const insights = [];

  diffRows.forEach((row) => {
    if (!row.path.startsWith("widgets")) return;

    if (Array.isArray(row.before) && Array.isArray(row.after)) {
      insights.push(`Widget set changed from ${row.before.length} to ${row.after.length} item${row.after.length === 1 ? "" : "s"}, so the available analysis controls are different.`);
      return;
    }

    insights.push(describeGenericChange(row.path, row.before, row.after));
  });

  return insights;
}

function buildColorInsights(diffRows) {
  const insights = [];

  diffRows.forEach((row) => {
    if (!(row.path.startsWith("color_maps") || row.path.startsWith("colorMaps"))) return;

    if (/preset|palette|scheme/i.test(row.path)) {
      insights.push(`Color encoding changed from ${formatScalar(row.before)} to ${formatScalar(row.after)}, which changes which values visually stand out.`);
      return;
    }

    if (/range|min|max|window|level/i.test(row.path)) {
      insights.push(`Color value range changed at ${row.path}, so the mapping between data values and colors is now different.`);
      return;
    }

    insights.push(describeGenericChange(row.path, row.before, row.after));
  });

  return insights;
}

function buildAnnotationInsights(diffRows) {
  const insights = [];

  diffRows.forEach((row) => {
    if (!(row.path.startsWith("annotation") || row.path.startsWith("annotations"))) return;

    if (typeof row.before === "boolean" && typeof row.after === "boolean") {
      insights.push(`Annotation visibility was ${row.after ? "turned on" : "turned off"}, changing how much contextual labeling is present.`);
      return;
    }

    insights.push(describeGenericChange(row.path, row.before, row.after));
  });

  return insights;
}

function buildLinkInsights(diffRows) {
  const insights = [];

  diffRows.forEach((row) => {
    if (!(row.path.startsWith("links") || row.path.startsWith("broadcast") || row.path.startsWith("following"))) return;

    if (row.path.startsWith("links") && Array.isArray(row.before) && Array.isArray(row.after)) {
      insights.push(`Linked state changed from ${row.before.length} to ${row.after.length} linked item${row.after.length === 1 ? "" : "s"}, affecting coordinated behavior across views.`);
      return;
    }

    insights.push(describeGenericChange(row.path, row.before, row.after));
  });

  return insights;
}

function buildInsightRows(diffRows) {
  const groups = new Map();

  const addGroup = (key, rows, builder) => {
    if (!rows.length) return;
    const insights = builder(rows).filter(Boolean);
    if (insights.length) groups.set(key, insights);
  };

  addGroup("camera", diffRows.filter((row) => row.path.startsWith("camera")), buildCameraInsights);
  addGroup("filters", diffRows.filter((row) => row.path.startsWith("filters")), buildFilterInsights);
  addGroup("widgets", diffRows.filter((row) => row.path.startsWith("widgets")), buildWidgetInsights);
  addGroup("color", diffRows.filter((row) => row.path.startsWith("color_maps") || row.path.startsWith("colorMaps")), buildColorInsights);
  addGroup("annotations", diffRows.filter((row) => row.path.startsWith("annotation") || row.path.startsWith("annotations")), buildAnnotationInsights);
  addGroup("links", diffRows.filter((row) => row.path.startsWith("links") || row.path.startsWith("broadcast") || row.path.startsWith("following")), buildLinkInsights);

  const usedPaths = new Set([...groups.values()].flatMap((_insights, key) => (
    diffRows.filter((row) => {
      if (key === "camera") return row.path.startsWith("camera");
      if (key === "filters") return row.path.startsWith("filters");
      if (key === "widgets") return row.path.startsWith("widgets");
      if (key === "color") return row.path.startsWith("color_maps") || row.path.startsWith("colorMaps");
      if (key === "annotations") return row.path.startsWith("annotation") || row.path.startsWith("annotations");
      if (key === "links") return row.path.startsWith("links") || row.path.startsWith("broadcast") || row.path.startsWith("following");
      return false;
    }).map((row) => row.path)
  )));

  diffRows.forEach((row) => {
    if (usedPaths.has(row.path)) return;
    if (!groups.has("other")) groups.set("other", []);
    groups.get("other").push(describeGenericChange(row.path, row.before, row.after));
  });

  return [...groups.entries()].flatMap(([group, insights]) =>
    insights.map((explanation, index) => ({
      path: group,
      explanation,
      before: null,
      after: null,
      priority: index,
    }))
  );
}

function buildHeuristicExplanation(snapshotA, snapshotB, diffRows) {
  const changedPaths = diffRows.map((row) => row.path);
  const distinctTopLevel = [...new Set(changedPaths.map((path) => path.split(".")[0]))];
  const keyInsights = buildInsightRows(diffRows).slice(0, 6);
  const dominantDomains = distinctTopLevel.slice(0, 3);
  const hasIncompleteCameraData = diffRows.some((row) => {
    if (row.path !== "camera") return false;
    const beforeMissing = !row.before || typeof row.before !== "object";
    const afterMissing = !row.after || typeof row.after !== "object";
    return beforeMissing || afterMissing;
  });

  const summary =
    diffRows.length === 0
      ? `Snapshot "${snapshotA.name}" and snapshot "${snapshotB.name}" have no state differences.`
      : hasIncompleteCameraData
        ? `Snapshot "${snapshotB.name}" differs from "${snapshotA.name}", but one of the snapshots is missing structured camera state, so the viewpoint comparison is only partially reliable.`
      : `Snapshot "${snapshotB.name}" differs from "${snapshotA.name}" across ${diffRows.length} changed field${diffRows.length === 1 ? "" : "s"}, with the strongest changes in ${dominantDomains.join(", ")}.`;

  let interpretation = "These changes represent a new analytical checkpoint.";
  if (hasIncompleteCameraData) {
    interpretation = "At least one snapshot was captured without a complete camera payload, so use this explanation cautiously and prefer newer manual snapshots for viewpoint comparisons.";
  } else if (distinctTopLevel.includes("camera") && distinctTopLevel.length === 1) {
    interpretation = "This checkpoint primarily changes viewpoint, so it represents a visual inspection change more than a data-subsetting change.";
  } else if (distinctTopLevel.includes("filters")) {
    interpretation = "This checkpoint changes the subset of data being shown, so it likely marks a tighter analytical focus rather than a cosmetic adjustment.";
  } else if (distinctTopLevel.includes("color_maps")) {
    interpretation = "This checkpoint mainly changes visual encoding, meaning the underlying data is similar but the emphasis or readability of patterns has changed.";
  } else if (distinctTopLevel.includes("widgets")) {
    interpretation = "This checkpoint changes the active analysis controls, which suggests a different exploration workflow rather than just a different viewpoint.";
  } else if (distinctTopLevel.length > 1) {
    interpretation = "This checkpoint combines viewpoint and analytical-state changes, so it likely marks a meaningful step in the exploration process rather than a single minor edit.";
  }

  return {
    provider: "heuristic",
    summary,
    keyInsights: keyInsights.length
      ? keyInsights
      : diffRows.slice(0, 5).map((row) => ({
          path: row.path,
          explanation: summarizeChangeKind(row.path),
          before: row.before,
          after: row.after,
        })),
    interpretation,
  };
}

async function explainWithOpenAI(snapshotA, snapshotB, diffRows) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) return null;

  const payload = {
    snapshotA: {
      id: snapshotA.id,
      name: snapshotA.name,
      timestamp: snapshotA.created_at,
    },
    snapshotB: {
      id: snapshotB.id,
      name: snapshotB.name,
      timestamp: snapshotB.created_at,
    },
    changes: diffRows.slice(0, 20),
  };

  const prompt = [
    "You are analyzing differences between two scientific analysis snapshots.",
    "Return JSON with keys: summary, keyInsights, interpretation.",
    "summary: 2 concise, technical sentences.",
    "keyInsights: array of 3 to 5 short technical bullet-like strings.",
    "interpretation: 1 concise sentence about likely analytical meaning, phrased in technical terms.",
    "Use only the provided differences. Do not invent changes.",
    "",
    JSON.stringify(payload, null, 2),
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response missing content");
  }

  const parsed = JSON.parse(content);
  return {
    provider: "openai",
    summary: parsed.summary || "",
    keyInsights: (parsed.keyInsights || []).map((item) =>
      typeof item === "string" ? { path: "", explanation: item, before: null, after: null } : item
    ),
    interpretation: parsed.interpretation || "",
  };
}

async function explainSnapshotDiff(snapshotA, snapshotB) {
  const diffRows = collectSnapshotDiff(snapshotA, snapshotB);

  try {
    const llmExplanation = await explainWithOpenAI(snapshotA, snapshotB, diffRows);
    if (llmExplanation) {
      return {
        ...llmExplanation,
        diffRows,
      };
    }
  } catch (error) {
    log.warn(`Falling back to heuristic snapshot explanation: ${error.message}`);
  }

  return {
    ...buildHeuristicExplanation(snapshotA, snapshotB, diffRows),
    diffRows,
  };
}

module.exports = {
  explainSnapshotDiff,
  collectSnapshotDiff,
  normalizeSnapshotState,
};
