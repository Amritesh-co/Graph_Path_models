/**
 * Turns parsed CSV rows into `{ nodes, edges }`.
 *
 * Recognised columns (case-insensitive, any order):
 *   from, to        - required, the edge endpoints
 *   weight          - optional, defaults to 1
 *   note            - optional, label attached to the `to` node
 *   x, y, z         - optional coordinates; used for layout and the A* heuristic
 *
 * Rather than throwing on a bad row, malformed input is skipped and reported
 * through `warnings` so the UI can surface it.
 */

/** Column lookup that tolerates `From`, `WEIGHT`, stray whitespace, etc. */
function normaliseRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (key == null) continue;
    out[String(key).trim().toLowerCase()] = value;
  }
  return out;
}

/** PapaParse yields strings, but tolerate numbers in case typing is enabled. */
function readString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function readNumber(value) {
  const text = readString(value);
  if (text === "") return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : NaN;
}

export function parseGraphFromCsv(data) {
  const nodesMap = new Map();
  const edges = [];
  const warnings = [];
  const seenEdges = new Set();

  let hasNegativeWeight = false;
  let hasCoordinates = data.length > 0;
  let skipped = 0;
  let badWeights = 0;
  let selfLoops = 0;
  let duplicates = 0;

  const touchNode = (id, coords) => {
    const existing = nodesMap.get(id) ?? { id, note: "" };
    if (coords && Number.isFinite(coords.x) && Number.isFinite(coords.y)) {
      existing.x = coords.x;
      existing.y = coords.y;
      existing.z = Number.isFinite(coords.z) ? coords.z : 0;
    }
    nodesMap.set(id, existing);
    return existing;
  };

  data.forEach((rawRow) => {
    const row = normaliseRow(rawRow);
    const from = readString(row.from);
    const to = readString(row.to);

    if (!from || !to) {
      skipped++;
      return;
    }

    const rawWeight = readNumber(row.weight);
    let weight = 1;
    if (rawWeight === null) {
      weight = 1;
    } else if (Number.isNaN(rawWeight)) {
      badWeights++; // non-numeric weight -> fall back to 1
    } else {
      weight = rawWeight;
    }
    if (weight < 0) hasNegativeWeight = true;

    const x = readNumber(row.x);
    const y = readNumber(row.y);
    const z = readNumber(row.z);
    const coords =
      x !== null && y !== null && !Number.isNaN(x) && !Number.isNaN(y)
        ? { x, y, z: z === null || Number.isNaN(z) ? 0 : z }
        : null;
    if (!coords) hasCoordinates = false;

    touchNode(from);
    const target = touchNode(to, coords);

    const note = readString(row.note);
    if (note) target.note = note;

    if (from === to) {
      selfLoops++; // a self-loop can never shorten a path
      return;
    }

    // Collapse parallel edges, keeping the cheapest. Node ids come from a
    // CSV and may contain any printable character, so NUL is the one
    // separator that cannot collide. Written as an escape so this file
    // stays plain text rather than a literal NUL byte in the source.
    const key = `${from}\u0000${to}`;
    if (seenEdges.has(key)) {
      duplicates++;
      const existing = edges.find((e) => e.from === from && e.to === to);
      if (existing && weight < existing.weight) existing.weight = weight;
      return;
    }
    seenEdges.add(key);
    edges.push({ from, to, weight });
  });

  if (skipped) warnings.push(`${skipped} row(s) skipped: missing a "from" or "to" value.`);
  if (badWeights) warnings.push(`${badWeights} row(s) had a non-numeric weight; defaulted to 1.`);
  if (selfLoops) warnings.push(`${selfLoops} self-loop(s) ignored.`);
  if (duplicates) warnings.push(`${duplicates} duplicate edge(s) merged, keeping the lowest weight.`);
  if (!edges.length) warnings.push('No usable edges found. The file needs "from" and "to" columns.');

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
    hasNegativeWeight,
    hasCoordinates: hasCoordinates && nodesMap.size > 0,
    warnings,
  };
}
