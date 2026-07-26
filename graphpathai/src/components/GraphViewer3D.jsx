import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Instances, Instance, Billboard } from "@react-three/drei";
import * as THREE from "three";

/**
 * Single 3D graph viewer, used for both the overview and the result view.
 *
 * Previously these were two near-identical components that each randomised
 * their own layout, so the same graph looked different in each. Positions are
 * now computed once and passed in.
 */

const COLORS = {
  path: "#22d3ee",
  start: "#4ade80",
  end: "#f472b6",
  edgeDark: "#3b4c6b",
  edgeLight: "#b6c2d4",
};

/**
 * Nodes are tinted by degree — cool indigo for leaves through to warm amber for
 * the busiest hubs — so the shape of the graph reads at a glance instead of
 * being a uniform field of identical spheres.
 */
const DEGREE_RAMP = ["#4f6ef7", "#22d3ee", "#34d399", "#fbbf24", "#fb7185"].map(
  (c) => new THREE.Color(c)
);

function rampColor(t) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1) * (DEGREE_RAMP.length - 1);
  const i = Math.min(Math.floor(clamped), DEGREE_RAMP.length - 2);
  return DEGREE_RAMP[i].clone().lerp(DEGREE_RAMP[i + 1], clamped - i);
}

/** Label text colour that stays legible on top of a tinted sphere. */
function readableOn(color) {
  // Rec. 601 luma; spheres are lit, so bias a little towards dark text.
  const luma = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  return luma > 0.45 ? "#0b1120" : "#f8fafc";
}

/**
 * Undirected edge key, so highlight lookup ignores direction. NUL separates
 * the two ids because node ids may contain any printable character; it is
 * written as an escape so this file stays plain text.
 */
const edgeKey = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/** Frames the camera on the graph whenever the layout changes. */
function CameraRig({ bounds, controlsRef }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!bounds) return;
    const { center, radius } = bounds;

    // Fit the bounding sphere to whichever axis is tighter. The vertical half
    // angle is fov/2; the horizontal one widens with aspect ratio, so a narrow
    // window needs to pull back further.
    const halfV = THREE.MathUtils.degToRad(camera.fov) / 2;
    const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
    const distance = (radius * 1.05) / Math.tan(Math.min(halfV, halfH));

    // Offset is a *direction*: normalise it so the framing distance is exactly
    // what was computed rather than ~10% further out.
    const dir = new THREE.Vector3(0.35, 0.25, 1).normalize().multiplyScalar(distance);
    camera.position.copy(center).add(dir);
    camera.near = Math.max(distance / 1000, 0.01);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    camera.lookAt(center);
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [bounds, camera, controlsRef]);

  return null;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * The winning path drawn as solid tubes rather than lines.
 *
 * WebGL caps `lineWidth` at 1px on virtually every platform, so a highlighted
 * line was indistinguishable from a background one. Cylinders give the result
 * real presence, and there are only ever a handful of them.
 */
function PathEdges({ segments, radius, color }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.emissiveIntensity = 0.75 + 0.45 * Math.sin(clock.elapsedTime * 2.2);
    }
  });

  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((seg) => {
        const dir = seg.to.clone().sub(seg.from);
        const length = dir.length();
        if (length === 0) return null;
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          UP,
          dir.clone().normalize()
        );
        return (
          <mesh
            key={seg.key}
            position={seg.from.clone().add(seg.to).multiplyScalar(0.5)}
            quaternion={quaternion}
          >
            <cylinderGeometry args={[radius, radius, length, 8]} />
            <meshStandardMaterial
              ref={ref}
              color={color}
              emissive={color}
              emissiveIntensity={0.9}
              roughness={0.25}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

function Scene({
  nodes,
  edges,
  positions,
  highlightSet,
  highlightEdgeSet,
  startId,
  endId,
  showLabels,
  isDark,
  controlsRef,
}) {
  const bounds = useMemo(() => {
    const box = new THREE.Box3();
    nodes.forEach((n) => {
      const p = positions.get(n.id);
      if (p) box.expandByPoint(p);
    });
    if (box.isEmpty()) return { center: new THREE.Vector3(), radius: 100, extent: 200 };
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // True bounding-sphere radius, not the box half-diagonal. The diagonal
    // overestimates badly for elongated layouts, which left the graph framed
    // far smaller than the viewport could show.
    let radiusSq = 0;
    nodes.forEach((n) => {
      const p = positions.get(n.id);
      if (p) radiusSq = Math.max(radiusSq, p.distanceToSquared(center));
    });

    return {
      center,
      radius: Math.max(Math.sqrt(radiusSq), 1),
      extent: Math.max(size.x, size.y, size.z, 1),
    };
  }, [nodes, positions]);

  /**
   * Sphere size comes from the *measured* median nearest-neighbour distance,
   * not an idealised `extent / cbrt(n)`. Real layouts are never uniform — a
   * clustered graph packs nodes far closer than the average implies, which is
   * what made spheres overlap into an unreadable clump. Sampling keeps this
   * affordable on large graphs.
   */
  const nodeRadius = useMemo(() => {
    const pts = nodes.map((n) => positions.get(n.id)).filter(Boolean);
    if (pts.length < 2) return Math.max(bounds.extent * 0.02, 0.4);

    const stride = Math.max(1, Math.floor(pts.length / 300));
    const distances = [];
    for (let i = 0; i < pts.length; i += stride) {
      let nearest = Infinity;
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        const d = pts[i].distanceToSquared(pts[j]);
        if (d < nearest) nearest = d;
      }
      if (Number.isFinite(nearest)) distances.push(Math.sqrt(nearest));
    }
    if (distances.length === 0) return Math.max(bounds.extent * 0.02, 0.4);

    distances.sort((a, b) => a - b);
    const median = distances[Math.floor(distances.length / 2)];

    // Edge length is not independently adjustable: the force layout is
    // normalised to a fixed extent, so its equilibrium is scale-invariant, and
    // a node's nearest neighbour is almost always one of its graph neighbours
    // (measured median edge length is only ~1.0-1.3x the median nearest
    // neighbour distance). What actually controls the visible gap between two
    // linked nodes is this ratio: the gap is `edge - 2 * radius`, so anything
    // above ~0.5 makes connected spheres touch. 0.3 leaves roughly half the
    // link visible as empty space.
    return Math.max(Math.min(median * 0.3, bounds.extent * 0.045), 0.2);
  }, [nodes, positions, bounds.extent]);

  /** Degree per node, used for both tint and sphere scale. */
  const degrees = useMemo(() => {
    const d = new Map(nodes.map((n) => [n.id, 0]));
    edges.forEach(({ from, to }) => {
      if (d.has(from)) d.set(from, d.get(from) + 1);
      if (d.has(to)) d.set(to, d.get(to) + 1);
    });
    return d;
  }, [nodes, edges]);

  // Normalise across the observed min..max degree, not 0..max: most graphs have
  // a narrow degree band, and anchoring at zero squashed nearly every node into
  // the same end of the ramp.
  const degreeRange = useMemo(() => {
    const values = Array.from(degrees.values());
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    return { min, span: Math.max(max - min, 1) };
  }, [degrees]);

  const degreeT = useCallback(
    (id) => ((degrees.get(id) ?? 0) - degreeRange.min) / degreeRange.span,
    [degrees, degreeRange]
  );

  const nodeColor = useMemo(() => {
    const cache = new Map();
    nodes.forEach((n) => cache.set(n.id, rampColor(degreeT(n.id))));
    return cache;
  }, [nodes, degreeT]);

  // Hubs render slightly larger, which gives dense graphs a readable structure.
  const radiusFor = (id) => nodeRadius * (1 + 0.45 * Math.sqrt(degreeT(id)));

  const { baseGeometry, pathSegments } = useMemo(() => {
    const basePts = [];
    const segments = [];
    edges.forEach(({ from, to }) => {
      const p1 = positions.get(from);
      const p2 = positions.get(to);
      if (!p1 || !p2) return;
      if (highlightEdgeSet.has(edgeKey(from, to))) {
        segments.push({ key: `${from}->${to}`, from: p1, to: p2 });
      } else {
        basePts.push(p1, p2);
      }
    });
    return {
      baseGeometry: new THREE.BufferGeometry().setFromPoints(basePts),
      pathSegments: segments,
    };
  }, [edges, positions, highlightEdgeSet]);

  /**
   * Midpoint label for every edge weight. Skipped entirely when every weight is
   * 1 (nothing to learn from a wall of "1"s) or when there are too many labels
   * to stay readable — each one is an SDF mesh.
   */
  const weightLabels = useMemo(() => {
    const varied = edges.some((e) => e.weight !== edges[0]?.weight);
    if (!varied || edges.length > 220) return [];
    return edges
      .map((e) => {
        const p1 = positions.get(e.from);
        const p2 = positions.get(e.to);
        if (!p1 || !p2) return null;
        return {
          key: `${e.from}->${e.to}`,
          position: p1.clone().lerp(p2, 0.5),
          weight: Number(e.weight.toFixed(2)),
          onPath: highlightEdgeSet.has(edgeKey(e.from, e.to)),
        };
      })
      .filter(Boolean);
  }, [edges, positions, highlightEdgeSet]);

  // Release GPU buffers when geometry is rebuilt; the old viewers leaked one
  // BufferGeometry per re-render.
  useEffect(() => () => baseGeometry.dispose(), [baseGeometry]);

  const plainNodes = useMemo(
    () => nodes.filter((n) => !highlightSet.has(n.id)),
    [nodes, highlightSet]
  );
  const pathNodes = useMemo(
    () => nodes.filter((n) => highlightSet.has(n.id)),
    [nodes, highlightSet]
  );

  const colorFor = (id) => {
    if (id === startId) return COLORS.start;
    if (id === endId) return COLORS.end;
    return COLORS.path;
  };

  const dimmed = highlightSet.size > 0;

  return (
    <>
      {/* Depth cue, scaled to the graph so far-side nodes recede instead of
          piling into an unreadable mass. Absolute distances would either do
          nothing or swallow the whole scene, depending on graph size. */}
      <fog
        attach="fog"
        args={[isDark ? "#080d1a" : "#f4f7fb", bounds.radius * 2.2, bounds.radius * 6]}
      />

      <ambientLight intensity={0.75} />
      <directionalLight position={[1, 1, 1]} intensity={1.1} />
      <directionalLight position={[-1, -0.5, -1]} intensity={0.35} />

      <CameraRig bounds={bounds} controlsRef={controlsRef} />

      <lineSegments geometry={baseGeometry}>
        <lineBasicMaterial
          color={isDark ? COLORS.edgeDark : COLORS.edgeLight}
          transparent
          opacity={dimmed ? 0.25 : 0.75}
        />
      </lineSegments>

      <PathEdges
        segments={pathSegments}
        radius={nodeRadius * 0.22}
        color={COLORS.path}
      />

      {/* Instanced: a single draw call for every off-path node, tinted by degree. */}
      {plainNodes.length > 0 && (
        <Instances key={plainNodes.length} limit={plainNodes.length} range={plainNodes.length}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            roughness={0.35}
            metalness={0.15}
            transparent
            opacity={dimmed ? 0.35 : 1}
          />
          {plainNodes.map((node) => (
            <Instance
              key={node.id}
              position={positions.get(node.id)}
              scale={radiusFor(node.id)}
              color={nodeColor.get(node.id)}
            />
          ))}
        </Instances>
      )}

      {pathNodes.map((node) => (
        <mesh key={node.id} position={positions.get(node.id)}>
          <sphereGeometry args={[radiusFor(node.id) * 1.35, 24, 24]} />
          <meshStandardMaterial
            color={colorFor(node.id)}
            emissive={colorFor(node.id)}
            emissiveIntensity={0.7}
            roughness={0.25}
          />
        </mesh>
      ))}

      {/* Node ids sit on the sphere itself, billboarded to face the camera and
          nudged towards the viewer so the sphere never occludes its own label.
          One SDF mesh each, so only for small graphs or path nodes. */}
      {nodes
        .filter((n) => showLabels || highlightSet.has(n.id))
        .map((node) => {
          const p = positions.get(node.id);
          if (!p) return null;
          const onPath = highlightSet.has(node.id);
          const r = radiusFor(node.id);
          const face = onPath
            ? new THREE.Color(colorFor(node.id))
            : nodeColor.get(node.id) ?? new THREE.Color("#64748b");
          return (
            <Billboard key={`label-${node.id}`} position={p}>
              <Text
                fontSize={r * 1.35}
                maxWidth={r * 4.2}
                color={readableOn(face)}
                anchorX="center"
                anchorY="middle"
                outlineWidth={r * 0.05}
                outlineColor={face.getStyle()}
                position={[0, 0, r * 1.36]}
                fillOpacity={dimmed && !onPath ? 0.45 : 1}
                outlineOpacity={dimmed && !onPath ? 0.45 : 1}
              >
                {node.id}
              </Text>
            </Billboard>
          );
        })}

      {/* Edge weights, floating at the midpoint of each edge. Pushed towards
          the camera so the path tubes don't hide the numbers they belong to. */}
      {weightLabels.map((label) => (
        <Billboard key={`w-${label.key}`} position={label.position}>
          <Text
            fontSize={nodeRadius * (label.onPath ? 1.45 : 1.2)}
            color={label.onPath ? "#e0fbff" : isDark ? "#cbd5e1" : "#334155"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={nodeRadius * 0.16}
            outlineColor={isDark ? "#0b1120" : "#f8fafc"}
            fillOpacity={dimmed && !label.onPath ? 0.35 : 1}
            outlineOpacity={dimmed && !label.onPath ? 0.35 : 1}
            position={[0, 0, nodeRadius * 0.9]}
          >
            {label.weight}
          </Text>
        </Billboard>
      ))}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enableZoom
        enablePan
        enableRotate
      />
    </>
  );
}

export default function GraphViewer3D({
  nodes,
  edges,
  positions,
  highlightNodes = [],
  highlightEdges = [],
  isolate = false,
  isDark = true,
  height = "70vh",
  emptyMessage = "Upload a CSV to visualise the graph",
}) {
  const controlsRef = useRef();

  const highlightSet = useMemo(() => new Set(highlightNodes), [highlightNodes]);
  const highlightEdgeSet = useMemo(
    () => new Set(highlightEdges.map((e) => edgeKey(e.from, e.to))),
    [highlightEdges]
  );

  const visibleNodes = useMemo(
    () => (isolate ? nodes.filter((n) => highlightSet.has(n.id)) : nodes),
    [nodes, isolate, highlightSet]
  );

  const visibleEdges = useMemo(
    () => (isolate ? edges.filter((e) => highlightEdgeSet.has(edgeKey(e.from, e.to))) : edges),
    [edges, isolate, highlightEdgeSet]
  );

  const LABEL_LIMIT = 150;
  const showLabels = visibleNodes.length <= LABEL_LIMIT;

  if (nodes.length === 0) {
    return (
      <div className="viewer viewer--empty" style={{ height }}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="viewer" style={{ height }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 50, position: [0, 0, 600] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[isDark ? "#080d1a" : "#f4f7fb"]} />
        <Scene
          nodes={visibleNodes}
          edges={visibleEdges}
          positions={positions}
          highlightSet={highlightSet}
          highlightEdgeSet={highlightEdgeSet}
          startId={highlightNodes[0]}
          endId={highlightNodes[highlightNodes.length - 1]}
          showLabels={showLabels}
          isDark={isDark}
          controlsRef={controlsRef}
        />
      </Canvas>
      <div className="viewer__hint">
        drag to orbit · scroll to zoom
        {!showLabels && ` · labels hidden above ${LABEL_LIMIT} nodes`}
      </div>

      {/* Legend, so the degree colour ramp actually means something. */}
      <div className="legend">
        <span className="legend__ramp" aria-hidden="true" />
        <span className="legend__ends">
          <span>few links</span>
          <span>hub</span>
        </span>
      </div>
    </div>
  );
}
