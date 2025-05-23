import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

function PathGraphViewer3D({ nodes, edges, highlightNodes, highlightEdges, isolate }) {
  const SPACE_SIZE = 500;

  const filteredNodes = useMemo(() => {
    if (!isolate) return nodes;
    return nodes.filter((node) => highlightNodes.includes(node.id));
  }, [nodes, highlightNodes, isolate]);

  const filteredEdges = useMemo(() => {
    if (!isolate) return edges;
    return edges.filter((edge) =>
      highlightEdges.some(
        (e) =>
          (e.from === edge.from && e.to === edge.to) ||
          (e.from === edge.to && e.to === edge.from)
      )
    );
  }, [edges, highlightEdges, isolate]);

  const nodePositions = useMemo(() => {
    const map = new Map();
    filteredNodes.forEach((node) => {
      const x = Math.random() * SPACE_SIZE - SPACE_SIZE / 2;
      const y = Math.random() * SPACE_SIZE - SPACE_SIZE / 2;
      const z = Math.random() * SPACE_SIZE - SPACE_SIZE / 2;
      map.set(node.id, new THREE.Vector3(x, y, z));
    });
    return map;
  }, [filteredNodes]);

  const edgeLines = useMemo(() => {
    const points = [];
    filteredEdges.forEach(({ from, to }) => {
      const p1 = nodePositions.get(from);
      const p2 = nodePositions.get(to);
      if (p1 && p2) {
        points.push(p1, p2);
      }
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [filteredEdges, nodePositions]);

  return (
    <div style={{ width: "100%", height: "95vh", marginTop: "20px" }}>
      <Canvas camera={{ position: [0, 0, SPACE_SIZE * 1.2], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[100, 100, 100]} />
        <axesHelper args={[SPACE_SIZE / 2]} />
        <gridHelper args={[SPACE_SIZE, 50]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -SPACE_SIZE / 2]} />
        <mesh>
          <boxGeometry args={[SPACE_SIZE, SPACE_SIZE, SPACE_SIZE]} />
          <meshBasicMaterial color="white" transparent opacity={0.05} wireframe />
        </mesh>

        <lineSegments geometry={edgeLines}>
          <lineBasicMaterial color="green" />
        </lineSegments>

        {filteredNodes.map((node) => {
          const pos = nodePositions.get(node.id);
          const isHighlighted = highlightNodes.includes(node.id);
          return (
            <mesh key={node.id} position={pos}>
              <sphereGeometry args={[2.5, 16, 16]} />
              <meshStandardMaterial color={isHighlighted ? "green" : "orange"} />
              <Text fontSize={4} color="black" anchorX="center" anchorY="middle" position={[0, 0, 3]}>
                {node.id}
              </Text>
            </mesh>
          );
        })}

        <OrbitControls enableZoom enablePan enableRotate />
      </Canvas>
    </div>
  );
}

export default PathGraphViewer3D;
