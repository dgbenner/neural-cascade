"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const BRAIN_REGIONS = [
  {
    id: "frontal",
    name: "Frontal Lobe",
    description: "Executive function, decision-making, planning, personality, motor control",
    color: "#FF6A3D",
    basePos: { x: 0, y: 0.3, z: 0.7 },
    clusterRadius: 0.35,
    nodeCount: 18,
  },
  {
    id: "prefrontal",
    name: "Prefrontal Cortex",
    description: "Complex planning, social behavior, impulse control, working memory",
    color: "#FF3B30",
    basePos: { x: 0, y: 0.5, z: 0.85 },
    clusterRadius: 0.2,
    nodeCount: 12,
  },
  {
    id: "parietal",
    name: "Parietal Lobe",
    description: "Spatial awareness, sensory integration, navigation, attention",
    color: "#FF9F43",
    basePos: { x: 0, y: 0.6, z: -0.1 },
    clusterRadius: 0.3,
    nodeCount: 14,
  },
  {
    id: "temporal_left",
    name: "Temporal Lobe (Left)",
    description: "Language comprehension, verbal memory, speech processing",
    color: "#2E9CFF",
    basePos: { x: -0.75, y: -0.1, z: 0.1 },
    clusterRadius: 0.25,
    nodeCount: 12,
  },
  {
    id: "temporal_right",
    name: "Temporal Lobe (Right)",
    description: "Music perception, face recognition, emotional memory",
    color: "#5BD4FF",
    basePos: { x: 0.75, y: -0.1, z: 0.1 },
    clusterRadius: 0.25,
    nodeCount: 12,
  },
  {
    id: "occipital",
    name: "Occipital Lobe",
    description: "Visual processing, color recognition, spatial orientation",
    color: "#0F5FD6",
    basePos: { x: 0, y: 0.2, z: -0.85 },
    clusterRadius: 0.25,
    nodeCount: 14,
  },
  {
    id: "cerebellum",
    name: "Cerebellum",
    description: "Motor coordination, balance, timing, procedural memory",
    color: "#10AC84",
    basePos: { x: 0, y: -0.55, z: -0.7 },
    clusterRadius: 0.3,
    nodeCount: 16,
  },
  {
    id: "brainstem",
    name: "Brain Stem",
    description: "Breathing, heart rate, consciousness, sleep/wake cycles",
    color: "#0A7D5E",
    basePos: { x: 0, y: -0.8, z: -0.3 },
    clusterRadius: 0.15,
    nodeCount: 8,
  },
  {
    id: "amygdala",
    name: "Amygdala",
    description: "Fear processing, emotional responses, threat detection",
    color: "#9B2BFF",
    basePos: { x: 0, y: -0.2, z: 0.3 },
    clusterRadius: 0.12,
    nodeCount: 8,
  },
  {
    id: "hippocampus",
    name: "Hippocampus",
    description: "Memory formation, spatial memory, learning, navigation",
    color: "#D864FF",
    basePos: { x: 0, y: -0.3, z: 0.15 },
    clusterRadius: 0.14,
    nodeCount: 10,
  },
  {
    id: "thalamus",
    name: "Thalamus",
    description: "Sensory relay station, attention regulation, consciousness",
    color: "#00D88A",
    basePos: { x: 0, y: 0.0, z: 0.0 },
    clusterRadius: 0.12,
    nodeCount: 8,
  },
  {
    id: "motor_cortex",
    name: "Motor Cortex",
    description: "Voluntary movement initiation, fine motor control",
    color: "#FFB84D",
    basePos: { x: 0, y: 0.7, z: 0.15 },
    clusterRadius: 0.22,
    nodeCount: 12,
  },
];

const REGION_GROUPS = [
  {
    id: "cognition",
    label: "Higher Cognition",
    subtitle: "Thinking, planning, deliberate action",
    regionIds: ["prefrontal", "frontal", "parietal", "motor_cortex"],
  },
  {
    id: "sensory",
    label: "Sensory Processing",
    subtitle: "How the outside world gets in",
    regionIds: ["occipital", "temporal_left", "temporal_right"],
  },
  {
    id: "limbic",
    label: "Memory + Emotion",
    subtitle: "Feeling and remembering",
    regionIds: ["amygdala", "hippocampus"],
  },
  {
    id: "regulation",
    label: "Regulation + Relay",
    subtitle: "Keeping the lights on, routing signals",
    regionIds: ["thalamus", "cerebellum", "brainstem"],
  },
];

// Modifiers alter the brain's resting state and how it responds to scenarios.
// Only one can be active at a time. baselineOffsets add resting glow to
// regions; regionMultipliers scale scenario activations on top of baseline.
const MODIFIERS = [
  {
    id: "caffeine",
    name: "Caffeine",
    shortName: "Caffeine",
    description:
      "Adenosine blocked, norepinephrine up. Alert, faster, more focused.",
    color: "#22FFA0",
    baselineOffsets: {
      prefrontal: 0.2,
      frontal: 0.15,
      parietal: 0.1,
      temporal_left: 0.08,
      temporal_right: 0.08,
      thalamus: 0.15,
      brainstem: 0.12,
      motor_cortex: 0.08,
      amygdala: 0.05,
      hippocampus: 0.05,
      occipital: 0.05,
      cerebellum: 0.05,
    },
    regionMultipliers: {
      prefrontal: 1.3,
      frontal: 1.25,
      parietal: 1.15,
      temporal_left: 1.1,
      temporal_right: 1.1,
      thalamus: 1.2,
      brainstem: 1.15,
      motor_cortex: 1.05,
      amygdala: 1.0,
      hippocampus: 1.0,
      occipital: 1.05,
      cerebellum: 1.0,
    },
  },
  {
    id: "sleep_deprivation",
    name: "Sleep Deprivation",
    shortName: "No Sleep",
    description:
      "24+ hours awake. Prefrontal offline, amygdala hyperreactive, memory falters.",
    color: "#60D8FF",
    baselineOffsets: {
      prefrontal: -0.08,
      frontal: -0.05,
      parietal: -0.03,
      temporal_left: 0.0,
      temporal_right: 0.0,
      thalamus: -0.05,
      brainstem: 0.1,
      motor_cortex: -0.03,
      amygdala: 0.2,
      hippocampus: -0.08,
      occipital: -0.02,
      cerebellum: -0.02,
    },
    regionMultipliers: {
      prefrontal: 0.4,
      frontal: 0.55,
      parietal: 0.75,
      temporal_left: 0.8,
      temporal_right: 0.8,
      thalamus: 0.6,
      brainstem: 1.1,
      motor_cortex: 0.7,
      amygdala: 1.5,
      hippocampus: 0.45,
      occipital: 0.8,
      cerebellum: 0.75,
    },
  },
  {
    id: "acute_stress",
    name: "Acute Stress",
    shortName: "Stress",
    description:
      "Fight-or-flight. Amygdala hijack, body primed, deliberation suppressed.",
    color: "#FF3A5C",
    baselineOffsets: {
      prefrontal: -0.05,
      frontal: 0.05,
      parietal: 0.1,
      temporal_left: 0.0,
      temporal_right: 0.05,
      thalamus: 0.15,
      brainstem: 0.25,
      motor_cortex: 0.2,
      amygdala: 0.3,
      hippocampus: -0.05,
      occipital: 0.1,
      cerebellum: 0.1,
    },
    regionMultipliers: {
      prefrontal: 0.6,
      frontal: 0.8,
      parietal: 1.2,
      temporal_left: 0.8,
      temporal_right: 1.1,
      thalamus: 1.3,
      brainstem: 1.4,
      motor_cortex: 1.4,
      amygdala: 1.6,
      hippocampus: 0.5,
      occipital: 1.2,
      cerebellum: 1.2,
    },
  },
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Produce the visual activations for a given modifier in the resting state
// (no scenario running). Negative offsets clamp to 0 — we can't dim below
// dormant, only add glow.
function baselineActivationsFor(modifier) {
  if (!modifier) return {};
  const out = {};
  Object.entries(modifier.baselineOffsets).forEach(([id, off]) => {
    if (off > 0) out[id] = clamp01(off);
  });
  return out;
}

// Apply a modifier to a set of scenario activations. Each region's final
// value is: clamp(baselineOffset + scenarioIntensity * regionMultiplier).
function applyModifierToStep(stepRegions, modifier) {
  if (!modifier) {
    const out = {};
    Object.entries(stepRegions).forEach(([id, data]) => {
      out[id] = data.intensity;
    });
    return out;
  }
  const out = {};
  // Start with baseline offsets so every region that has a baseline glow is
  // represented, not just regions the LLM mentioned.
  Object.entries(modifier.baselineOffsets).forEach(([id, off]) => {
    if (off > 0) out[id] = off;
  });
  Object.entries(stepRegions).forEach(([id, data]) => {
    const offset = modifier.baselineOffsets[id] || 0;
    const mult = modifier.regionMultipliers[id] ?? 1;
    out[id] = clamp01(offset + data.intensity * mult);
  });
  return out;
}

function generateClusterNodes(region) {
  const nodes = [];
  for (let i = 0; i < region.nodeCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = region.clusterRadius * (0.3 + Math.random() * 0.7);
    nodes.push({
      x: region.basePos.x + r * Math.sin(phi) * Math.cos(theta),
      y: region.basePos.y + r * Math.sin(phi) * Math.sin(theta),
      z: region.basePos.z + r * Math.cos(phi),
      regionId: region.id,
      pulseOffset: Math.random() * Math.PI * 2,
      baseSize: 0.015 + Math.random() * 0.012,
    });
  }
  return nodes;
}

function generateConnections(allNodes) {
  const connections = [];
  const regionNodes = {};

  allNodes.forEach((node, i) => {
    if (!regionNodes[node.regionId]) regionNodes[node.regionId] = [];
    regionNodes[node.regionId].push(i);
  });

  Object.values(regionNodes).forEach((indices) => {
    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        if (Math.random() < 0.3) {
          connections.push([indices[i], indices[j], "intra"]);
        }
      }
    }
  });

  const regionIds = Object.keys(regionNodes);
  for (let i = 0; i < regionIds.length; i++) {
    for (let j = i + 1; j < regionIds.length; j++) {
      const nodesA = regionNodes[regionIds[i]];
      const nodesB = regionNodes[regionIds[j]];
      const connCount = Math.floor(Math.random() * 3) + 1;
      for (let c = 0; c < connCount; c++) {
        const a = nodesA[Math.floor(Math.random() * nodesA.length)];
        const b = nodesB[Math.floor(Math.random() * nodesB.length)];
        connections.push([a, b, "inter"]);
      }
    }
  }

  return connections;
}

// Shader that fades opacity based on distance from camera — faces on the near
// (front) side of the head become nearly transparent, while the far (back)
// side stays opaque. Produces an X-ray cutaway effect that reveals the brain
// clusters inside from the camera's current viewpoint.
const HEAD_VERTEX_SHADER = `
  varying float vViewZ;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewZ = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const HEAD_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uNearZ;
  uniform float uFarZ;
  uniform float uMinOp;
  uniform float uMaxOp;
  varying float vViewZ;
  void main() {
    float t = smoothstep(uNearZ, uFarZ, vViewZ);
    float op = mix(uMinOp, uMaxOp, t);
    gl_FragColor = vec4(uColor, op);
  }
`;

// Build LineSegments vertex pairs tracing the facial features — eye sockets,
// brow ridge, nose bridge, mouth, and jawline. Coordinates are placed on the
// front-facing surface of the head so they sit on the face plane.
// Generate a dense cloud of points spread across a head-shaped surface.
// Uses the same asymmetric slice geometry we originally used for the mesh
// head, but samples random points across each triangle between adjacent
// slices. Produces a fine-grained dot texture that reads as a head from
// any angle, with density doing the work of shape definition.
function buildHeadDotCloud(pointsPerTriangle = 24) {
  const slices = [
    { y: -1.55, rx: 0.22, rzF: 0.24, rzB: 0.24, nose: 0 },
    { y: -1.30, rx: 0.32, rzF: 0.36, rzB: 0.36, nose: 0 },
    { y: -1.05, rx: 0.55, rzF: 0.62, rzB: 0.60, nose: 0 },
    { y: -0.85, rx: 0.78, rzF: 0.90, rzB: 0.80, nose: 0 },
    { y: -0.65, rx: 0.90, rzF: 1.00, rzB: 0.90, nose: 0 },
    { y: -0.45, rx: 1.00, rzF: 1.06, rzB: 0.98, nose: 0.4 },
    { y: -0.25, rx: 1.06, rzF: 1.12, rzB: 1.04, nose: 1.0 },
    { y: -0.05, rx: 1.10, rzF: 1.14, rzB: 1.10, nose: 0.7 },
    { y: 0.15,  rx: 1.12, rzF: 1.14, rzB: 1.14, nose: 0 },
    { y: 0.35,  rx: 1.14, rzF: 1.12, rzB: 1.18, nose: 0 },
    { y: 0.55,  rx: 1.12, rzF: 1.02, rzB: 1.20, nose: 0 },
    { y: 0.75,  rx: 1.05, rzF: 0.88, rzB: 1.16, nose: 0 },
    { y: 0.95,  rx: 0.90, rzF: 0.72, rzB: 1.00, nose: 0 },
    { y: 1.12,  rx: 0.65, rzF: 0.52, rzB: 0.75, nose: 0 },
    { y: 1.25,  rx: 0.35, rzF: 0.28, rzB: 0.42, nose: 0 },
  ];

  const segments = 32;

  // Compute a vertex for a given slice index and segment index.
  const vertexAt = (sliceIdx, segIdx) => {
    const { y, rx, rzF, rzB, nose } = slices[sliceIdx];
    const theta = (segIdx / segments) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const rz = sinT >= 0 ? rzF : rzB;
    let px = rx * cosT;
    let pz = rz * sinT;
    if (nose > 0 && sinT > 0.4) {
      const front = Math.pow((sinT - 0.4) / 0.6, 2);
      const narrow = Math.exp(-Math.pow(cosT * 3.5, 2));
      pz += 0.22 * nose * front * narrow;
    }
    return [px, y, pz];
  };

  const positions = [];

  // For each pair of adjacent slice rings, for each segment around the ring,
  // scatter random points across the two triangles that make up that quad.
  for (let s = 0; s < slices.length - 1; s++) {
    for (let i = 0; i < segments; i++) {
      const a = vertexAt(s, i);
      const b = vertexAt(s, (i + 1) % segments);
      const c = vertexAt(s + 1, i);
      const d = vertexAt(s + 1, (i + 1) % segments);
      for (let p = 0; p < pointsPerTriangle * 2; p++) {
        // Random point inside the quad via bilinear interpolation
        const u = Math.random();
        const v = Math.random();
        const x = (1 - u) * (1 - v) * a[0] + u * (1 - v) * b[0] + (1 - u) * v * c[0] + u * v * d[0];
        const y = (1 - u) * (1 - v) * a[1] + u * (1 - v) * b[1] + (1 - u) * v * c[1] + u * v * d[1];
        const z = (1 - u) * (1 - v) * a[2] + u * (1 - v) * b[2] + (1 - u) * v * c[2] + u * v * d[2];
        positions.push(x, y, z);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

function buildFacialLandmarkPairs() {
  const pairs = [];
  const addPolyline = (curve) => {
    for (let i = 0; i < curve.length - 1; i++) {
      pairs.push(curve[i], curve[i + 1]);
    }
  };

  const eyeOval = (cx, cy, cz) => {
    const pts = [];
    const segs = 14;
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          cx + 0.14 * Math.cos(t),
          cy + 0.055 * Math.sin(t),
          cz
        )
      );
    }
    return pts;
  };
  addPolyline(eyeOval(-0.34, 0.0, 1.16));
  addPolyline(eyeOval(0.34, 0.0, 1.16));

  // Two separate eyebrows. Each arches upward in the middle and has tapered
  // ends; positioned just above the corresponding eye.
  const brow = (cx, flip) => {
    const pts = [];
    const segs = 10;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      // Arc along the x axis with a sin bump for the arch
      const localX = -0.22 + t * 0.44;
      const arch = Math.sin(t * Math.PI) * 0.04;
      const x = cx + (flip ? -localX : localX);
      const y = 0.14 + arch;
      const z = 1.14;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  };
  addPolyline(brow(-0.34, false));
  addPolyline(brow(0.34, false));

  addPolyline([
    new THREE.Vector3(0, 0.12, 1.16),
    new THREE.Vector3(0, 0.02, 1.2),
    new THREE.Vector3(0, -0.12, 1.26),
    new THREE.Vector3(0, -0.26, 1.32),
  ]);

  addPolyline([
    new THREE.Vector3(-0.08, -0.28, 1.3),
    new THREE.Vector3(0, -0.32, 1.32),
    new THREE.Vector3(0.08, -0.28, 1.3),
  ]);

  addPolyline([
    new THREE.Vector3(-0.26, -0.55, 1.03),
    new THREE.Vector3(-0.12, -0.58, 1.06),
    new THREE.Vector3(0, -0.58, 1.07),
    new THREE.Vector3(0.12, -0.58, 1.06),
    new THREE.Vector3(0.26, -0.55, 1.03),
  ]);

  // Chin/jaw curve — long, low U that runs almost all the way out to the
  // sides of the head before a short, abrupt ramus angles up to the ear.
  const jaw = [];
  const jawPts = [
    [-0.82, -0.78, 0.42],
    [-0.66, -0.88, 0.6],
    [-0.48, -0.94, 0.76],
    [-0.28, -0.97, 0.86],
    [-0.1, -0.98, 0.9],
    [0, -0.98, 0.91],
    [0.1, -0.98, 0.9],
    [0.28, -0.97, 0.86],
    [0.48, -0.94, 0.76],
    [0.66, -0.88, 0.6],
    [0.82, -0.78, 0.42],
  ];
  for (const [x, y, z] of jawPts) jaw.push(new THREE.Vector3(x, y, z));
  addPolyline(jaw);

  // Mandibular ramus — short, abrupt angle up from the jaw endpoint to
  // just below the ear. Only about 20% of the total jaw line length.
  const ramus = (side) => [
    new THREE.Vector3(side * 0.82, -0.78, 0.42),
    new THREE.Vector3(side * 0.88, -0.18, 0.22),
  ];
  addPolyline(ramus(-1));
  addPolyline(ramus(1));

  // Ear crescents — C-shaped curves on the sides of the head. The concave
  // side bows outward (away from the face) so the bulge points toward the
  // head center and the opening faces the outer edge.
  const ear = (side) => {
    const pts = [];
    const segs = 12;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const angle = Math.PI * (0.62 + t * 0.76); // ~112° to ~248°
      const localX = Math.cos(angle) * 0.09;
      const y = Math.sin(angle) * 0.16;
      // Invert the x offset so the middle of the curve bows outward instead
      // of inward — the concave now opens away from the face.
      const x = side * 0.98 - side * localX;
      const z = 0.12;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  };
  addPolyline(ear(-1));
  addPolyline(ear(1));

  // Base-of-skull chevron — very shallow V behind the ears, bottom point
  // at center, tails angling slightly upward and out toward the ears but
  // stopping well short of them.
  addPolyline([
    new THREE.Vector3(-0.48, -0.52, -0.35),
    new THREE.Vector3(0, -0.6, -0.5),
    new THREE.Vector3(0.48, -0.52, -0.35),
  ]);

  // Scalp-to-occiput contour line. Midline arc by default, with optional
  // tilt around the z-axis to produce lateral copies that run over the
  // sides of the skull parallel to the midline.
  const scalpContour = (
    tiltDeg = 0,
    tMax = 0.82,
    tMin = 0.18,
    flatness = 1,
    xOffset = 0
  ) => {
    const pts = [];
    const segs = 28;
    const theta = (tiltDeg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    for (let i = 0; i <= segs; i++) {
      const t = tMin + (i / segs) * (tMax - tMin);
      const angle = Math.PI * t;
      const yRaw = 0.22 + Math.sin(angle) * 1.25 - t * 0.75;
      // Flatten the arc shape (vertical compression) without shrinking the
      // distance to the centerline — apply flatness to a copy that's only
      // used for the lateral (rx) component so the side arcs sit where we
      // want them, just with a less curved profile.
      const yFlat = yRaw * flatness;
      const cosA = Math.cos(angle);
      const z = (cosA >= 0 ? 1.3 : 0.85) * cosA - 0.1;
      const rx = -yRaw * sinT + xOffset * Math.sign(-sinT || 1);
      const ry = yFlat * cosT;
      pts.push(new THREE.Vector3(rx, ry, z));
    }
    return pts;
  };
  addPolyline(scalpContour(0, 0.82, 0.18));
  addPolyline(scalpContour(-35, 0.72, 0.18));
  addPolyline(scalpContour(35, 0.72, 0.18));
  addPolyline(scalpContour(-55, 0.68, 0.2, 0.5, 0));
  addPolyline(scalpContour(55, 0.68, 0.2, 0.5, 0));

  return pairs;
}

const EXAMPLE_SCENARIOS = [
  "Someone throws a baseball at me",
  "I smell fresh coffee brewing in the morning",
  "I hear my favorite song from childhood",
  "I'm solving a complex math problem",
  "I touch a hot stove by accident",
  "I'm remembering my first day of school",
  "I see a spider on the wall",
  "I'm playing piano from sheet music",
  "I'm having a deep conversation with a friend",
  "I taste something unexpectedly sour",
  "I lock eyes with a stranger across a crowded room",
  "I'm caught in a sudden thunderstorm without an umbrella",
  "I'm lost in a city I've never visited before",
  "I hear my name called in a quiet library",
  "I'm riding a roller coaster as it crests the first drop",
  "I'm reading a novel I can't put down",
  "I'm giving a presentation to a room of executives",
  "I catch a whiff of a perfume my grandmother used to wear",
  "I'm meditating in complete silence",
  "I watch the sunset paint the sky orange and pink",
  "I'm trying to remember where I left my keys",
  "I feel a mosquito bite on my arm",
  "I'm learning to ride a bike for the first time",
  "I walk barefoot through wet grass",
  "I'm holding a newborn baby",
  "I hear a car horn blare right behind me",
  "I'm dancing alone in my kitchen",
  "I taste my favorite childhood meal again",
  "I'm doing a difficult yoga pose and losing balance",
  "I'm writing a letter to someone I miss",
];

export default function BrainViz() {
  const mountRef = useRef(null);
  const resizeBrainRef = useRef(null);
  const headObjRef = useRef(null);
  const landmarkLinesRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const nodesRef = useRef([]);
  const connectionsRef = useRef([]);
  const nodeMeshesRef = useRef([]);
  const connectionLinesRef = useRef([]);
  const headPointsRef = useRef(null);
  const timeRef = useRef(0);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0.3, y: 0 });
  const targetRotation = useRef({ x: 0.3, y: 0 });
  const brainGroupRef = useRef(null);

  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activations, setActivations] = useState({});
  const [activationSteps, setActivationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [scenarioText, setScenarioText] = useState("");
  const [callouts, setCallouts] = useState([]);
  const LEGEND_BREAKPOINT = 880;
  const [windowWide, setWindowWide] = useState(true);
  const [manualOverride, setManualOverride] = useState(null);

  // Track the viewport width. When the window is too narrow for both the
  // brain scene and the 340px panel to coexist, the guide force-closes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setWindowWide(window.innerWidth >= LEGEND_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // If the user toggles manually, remember it, but clear the override when
  // they cross the breakpoint in either direction so resize keeps winning.
  const prevWideRef = useRef(true);
  useEffect(() => {
    if (prevWideRef.current !== windowWide) {
      setManualOverride(null);
    }
    prevWideRef.current = windowWide;
  }, [windowWide]);

  // Effective state: manual override if set, otherwise auto from width.
  const showLegend = manualOverride !== null ? manualOverride : windowWide;

  const toggleLegend = useCallback((next) => {
    setManualOverride(next);
  }, []);

  // When the guide opens or closes, the brain viewport's width changes. Ask
  // the Three.js renderer to re-measure so the canvas doesn't hold the flex
  // layout open with a stale pixel size.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.requestAnimationFrame(() => {
      if (resizeBrainRef.current) resizeBrainRef.current();
    });
    return () => window.cancelAnimationFrame(id);
  }, [showLegend]);
  const [stepDuration, setStepDuration] = useState(3000);
  const [errorMsg, setErrorMsg] = useState("");
  const [groupOverride, setGroupOverride] = useState({});
  const [processingDots, setProcessingDots] = useState(0);
  // activeModifierId is wired up via useState but the setter is intentionally
  // unused for now — the STATE row is frozen/dimmed until we figure out the
  // final modifier UX. Keeping the state itself so the resting-state preview
  // and modifier pipeline stay functional.
  const [activeModifierId] = useState(null);
  const activeModifier =
    MODIFIERS.find((m) => m.id === activeModifierId) || null;
  const [presetSheetOpen, setPresetSheetOpen] = useState(false);

  // When the active modifier changes, update the visible activations.
  // If a scenario step is currently showing, re-apply the modifier math to
  // it; otherwise show the modifier's resting-state baseline (or empty).
  useEffect(() => {
    if (currentStep >= 0 && activationSteps[currentStep]) {
      setActivations(
        applyModifierToStep(activationSteps[currentStep].regions, activeModifier)
      );
    } else {
      setActivations(baselineActivationsFor(activeModifier));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModifierId]);

  useEffect(() => {
    if (!isProcessing) {
      setProcessingDots(0);
      return;
    }
    const id = setInterval(() => {
      setProcessingDots((d) => (d + 1) % 4);
    }, 400);
    return () => clearInterval(id);
  }, [isProcessing]);

  const playTimerRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.15);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0.3, 3.0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a12, 1);
    // Explicitly style the canvas to fill its parent. We use setSize(..., false)
    // below so Three.js only updates the drawing buffer and never touches
    // these CSS dimensions. This is the correct Three.js + flexbox pattern.
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.setSize(width, height, false);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const brainGroup = new THREE.Group();
    scene.add(brainGroup);
    brainGroupRef.current = brainGroup;

    // Brain sits inside a sub-group offset back (-z) and up (+y) relative to
    // the head, so clusters sit higher in the skull and away from the face.
    const brainContentGroup = new THREE.Group();
    brainContentGroup.position.set(0, 0.34, -0.4);
    brainContentGroup.scale.setScalar(0.9);
    brainGroup.add(brainContentGroup);

    const ambient = new THREE.AmbientLight(0x334466, 0.5);
    scene.add(ambient);

    const allNodes = [];
    BRAIN_REGIONS.forEach((region) => {
      const clusterNodes = generateClusterNodes(region);
      allNodes.push(...clusterNodes);
    });
    nodesRef.current = allNodes;

    const conns = generateConnections(allNodes);
    connectionsRef.current = conns;

    const nodeMeshes = [];
    allNodes.forEach((node) => {
      const region = BRAIN_REGIONS.find((r) => r.id === node.regionId);
      const geo = new THREE.SphereGeometry(node.baseSize, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(region.color),
        transparent: true,
        opacity: 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(node.x, node.y, node.z);
      brainContentGroup.add(mesh);
      nodeMeshes.push(mesh);
    });
    nodeMeshesRef.current = nodeMeshes;

    const connectionLines = [];
    conns.forEach(([a, b, type]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(allNodes[a].x, allNodes[a].y, allNodes[a].z),
        new THREE.Vector3(allNodes[b].x, allNodes[b].y, allNodes[b].z),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: 0x334455,
        transparent: true,
        opacity: type === "intra" ? 0.04 : 0.02,
      });
      const line = new THREE.Line(geo, mat);
      brainContentGroup.add(line);
      connectionLines.push({ line, a, b, type });
    });
    connectionLinesRef.current = connectionLines;

    // Head shell and wireframe overlay are intentionally disabled — only the
    // facial landmark lines (eyes, brows, nose, mouth, jaw, ears) render.
    headPointsRef.current = null;

    // Facial landmarks — eye sockets, brow, nose bridge, mouth, jawline.
    // Uses an inverted opacity ramp (high at near, low at far) so the
    // landmarks are visible on whichever side of the head faces the camera
    // and fade away on the side turned away.
    // Dense dot cloud covering the entire head surface. Uses a uniform low
    // opacity so you can see front and back at the same time — density is
    // what carries the shape, not brightness.
    const headDotGeo = buildHeadDotCloud(18);
    const headDotMat = new THREE.PointsMaterial({
      color: 0xaecbe8,
      size: 0.006,
      transparent: true,
      opacity: 0.22,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const headDotCloud = new THREE.Points(headDotGeo, headDotMat);
    headDotCloud.renderOrder = 0;
    headDotCloud.position.set(0, -0.12, -0.65);
    headDotCloud.scale.setScalar(1.344);
    brainGroup.add(headDotCloud);

    // Load the real head mesh from /public/models/head.obj. When it arrives,
    // hide the placeholder dot cloud and landmark lines so we're only seeing
    // the real head. If loading fails, the placeholders stay visible so the
    // scene never looks empty.
    const objLoader = new OBJLoader();
    objLoader.load(
      "/models/head.obj",
      (obj) => {
        // Traverse all meshes in the loaded group and apply our material.
        // BackSide rendering means only the interior-facing polygons draw,
        // so the front of the skull is invisible and you see into the brain.
        const headMat = new THREE.MeshBasicMaterial({
          color: 0xaecbe8,
          transparent: true,
          opacity: 0.35,
          wireframe: true,
          side: THREE.BackSide,
          depthWrite: false,
        });
        // Hide the eyeballs — the creator exported them as a separate
        // mesh called "eyeball_m", so we can drop them without editing the
        // OBJ. Walk the tree, remove anything matching that name.
        obj.traverse((child) => {
          if (child.isMesh) {
            const n = (child.name || "").toLowerCase();
            if (n.includes("eye")) {
              child.visible = false;
              return;
            }
            child.material = headMat;
          }
        });

        // Measure only the head (now that eyes are hidden) so the auto-fit
        // scale isn't skewed by stray eyeball geometry.
        const box = new THREE.Box3();
        obj.traverse((child) => {
          if (child.isMesh && child.visible) box.expandByObject(child);
        });
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const targetHeight = 7.8;
        const fitScale = targetHeight / size.y;
        obj.scale.setScalar(fitScale);
        obj.position.set(
          -center.x * fitScale,
          -center.y * fitScale,
          -center.z * fitScale
        );

        obj.renderOrder = 0;
        brainGroup.add(obj);
        headObjRef.current = obj;

        // Hide placeholders now that the real head is in.
        headDotCloud.visible = false;
        if (landmarkLinesRef.current) {
          landmarkLinesRef.current.visible = false;
        }
      },
      undefined,
      (err) => {
        console.warn("Head OBJ failed to load, keeping placeholders:", err);
      }
    );

    const landmarkPairs = buildFacialLandmarkPairs();
    const landmarkGeo = new THREE.BufferGeometry().setFromPoints(landmarkPairs);
    const landmarkMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xaecbe8) },
        uNearZ: { value: 1.8 },
        uFarZ: { value: 4.2 },
        uMinOp: { value: 0.4 },
        uMaxOp: { value: 0.9 },
      },
      vertexShader: HEAD_VERTEX_SHADER,
      fragmentShader: HEAD_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    });
    const landmarkLines = new THREE.LineSegments(landmarkGeo, landmarkMat);
    landmarkLines.renderOrder = 5;
    landmarkLines.position.set(0, -0.12, -0.65);
    landmarkLines.scale.setScalar(1.344);
    brainGroup.add(landmarkLines);
    landmarkLinesRef.current = landmarkLines;

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    window.addEventListener("resize", handleResize);
    resizeBrainRef.current = handleResize;

    // Use ResizeObserver on the mount element so the canvas reflows whenever
    // its parent container changes size — even when the window itself didn't
    // resize (e.g. legend panel opening/closing reshuffles the flex layout).
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(mountRef.current);

    const mountEl = mountRef.current;
    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
      cancelAnimationFrame(frameRef.current);
      if (mountEl && renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.016;
      const t = timeRef.current;

      if (!brainGroupRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      rotation.current.x += (targetRotation.current.x - rotation.current.x) * 0.08;
      rotation.current.y += (targetRotation.current.y - rotation.current.y) * 0.08;

      if (!isDragging.current) {
        targetRotation.current.y += 0.002;
      }

      brainGroupRef.current.rotation.x = rotation.current.x;
      brainGroupRef.current.rotation.y = rotation.current.y;

      const nodes = nodesRef.current;
      const meshes = nodeMeshesRef.current;

      meshes.forEach((mesh, i) => {
        const node = nodes[i];
        const activation = activations[node.regionId] || 0;

        const baseBrightness = 0.35;
        const activeBrightness = 0.75 + activation * 0.25;
        const pulse = Math.sin(t * 3 + node.pulseOffset) * 0.5 + 0.5;
        const brightness = activation > 0
          ? activeBrightness + pulse * activation * 0.2
          : baseBrightness + pulse * 0.1;

        mesh.material.opacity = brightness;

        const baseScale = 1;
        const activeScale = 1 + activation * 0.8 + pulse * activation * 0.4;
        const scale = activation > 0 ? activeScale : baseScale;
        mesh.scale.setScalar(scale);
      });

      connectionLinesRef.current.forEach(({ line, a, b, type }) => {
        const regionA = nodes[a].regionId;
        const regionB = nodes[b].regionId;
        const actA = activations[regionA] || 0;
        const actB = activations[regionB] || 0;
        const avgAct = (actA + actB) / 2;

        if (avgAct > 0) {
          const regionObjA = BRAIN_REGIONS.find((r) => r.id === regionA);
          const regionObjB = BRAIN_REGIONS.find((r) => r.id === regionB);
          const color = new THREE.Color(regionObjA.color).lerp(
            new THREE.Color(regionObjB.color),
            0.5
          );
          line.material.color = color;
          line.material.opacity = 0.25 + avgAct * 0.6;
        } else {
          line.material.color = new THREE.Color(0x6a7a90);
          line.material.opacity = type === "intra" ? 0.2 : 0.12;
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();

    return () => cancelAnimationFrame(frameRef.current);
  }, [activations]);

  const handlePointerDown = useCallback((e) => {
    isDragging.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    lastMouse.current = { x: clientX, y: clientY };
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - lastMouse.current.x;
    const dy = clientY - lastMouse.current.y;
    targetRotation.current.y += dx * 0.005;
    targetRotation.current.x += dy * 0.005;
    targetRotation.current.x = Math.max(-1.2, Math.min(1.2, targetRotation.current.x));
    lastMouse.current = { x: clientX, y: clientY };
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const processScenario = async () => {
    if (!inputText.trim() || isProcessing) return;

    setIsProcessing(true);
    setErrorMsg("");
    setScenarioText(inputText.trim());
    setActivations(baselineActivationsFor(activeModifier));
    setActivationSteps([]);
    setCurrentStep(-1);
    setIsPlaying(false);
    setCallouts([]);
    if (playTimerRef.current) clearTimeout(playTimerRef.current);

    try {
      const response = await fetch("/api/process-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: inputText.trim(),
          modifier: activeModifier ? activeModifier.id : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMsg(data.error || `Error ${response.status}`);
        setIsProcessing(false);
        return;
      }

      const { steps } = await response.json();
      setActivationSteps(steps);
      setCurrentStep(0);

      if (steps.length > 0) {
        setActivations(applyModifierToStep(steps[0].regions, activeModifier));
        setCallouts(
          Object.entries(steps[0].regions).map(([id, data]) => ({
            regionId: id,
            reason: data.reason,
            intensity: data.intensity,
          }))
        );
      }
    } catch (err) {
      setErrorMsg("Network error");
    }

    setIsProcessing(false);
  };

  const goToStep = useCallback(
    (stepIndex) => {
      if (stepIndex < 0 || stepIndex >= activationSteps.length) return;
      setCurrentStep(stepIndex);
      const step = activationSteps[stepIndex];
      setActivations(applyModifierToStep(step.regions, activeModifier));
      setCallouts(
        Object.entries(step.regions).map(([id, data]) => ({
          regionId: id,
          reason: data.reason,
          intensity: data.intensity,
        }))
      );
    },
    [activationSteps, activeModifier]
  );

  useEffect(() => {
    if (!isPlaying || activationSteps.length === 0) return;

    const duration = stepDuration / playbackSpeed;
    playTimerRef.current = setTimeout(() => {
      const nextStep = currentStep + 1;
      if (nextStep < activationSteps.length) {
        goToStep(nextStep);
      } else {
        setIsPlaying(false);
      }
    }, duration);

    return () => clearTimeout(playTimerRef.current);
  }, [isPlaying, currentStep, activationSteps, playbackSpeed, stepDuration, goToStep]);

  const togglePlay = () => {
    if (currentStep >= activationSteps.length - 1) {
      goToStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const fontStack = "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const displayFont = "var(--font-instrument-serif), Georgia, serif";

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#0a0a12",
        color: "#e8ecf2",
        fontFamily: fontStack,
        fontSize: "13px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "20px" }}>
          <span
            style={{
              fontFamily: displayFont,
              fontSize: "56px",
              color: "#ffffff",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Neural Cascade
          </span>
          <span style={{ color: "#e8ecf2", fontSize: "15px", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>
            Brain Activity Visualizer
          </span>
        </div>
        {!showLegend && (
          <button
            onClick={() => toggleLegend(true)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#c0c8d8",
              padding: "6px 14px",
              borderRadius: "14px",
              cursor: "pointer",
              fontFamily: fontStack,
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.04em",
            }}
          >
            Open Brain Region Guide
          </button>
        )}
      </div>

      {/* White header row — conditional, only appears once a scenario is
          running or has run. Spans the viewport + legend columns. */}
      {(scenarioText || isProcessing || activationSteps.length > 0) && (
      <div
        style={{
          display: "flex",
          background: "#ffffff",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "10px 24px",
            minHeight: "46px",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: "14px",
              lineHeight: 1.4,
              letterSpacing: "-0.005em",
              fontFamily: fontStack,
            }}
          >
            <span style={{ color: "#8a95a8", fontWeight: 500 }}>
              Running scenario:
            </span>{" "}
            <span style={{ color: "#0a0a12", fontWeight: 600 }}>
              {scenarioText || "—"}
            </span>
          </div>
          {isProcessing && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexShrink: 0,
                paddingLeft: "16px",
                borderLeft: "1px solid rgba(10,10,18,0.15)",
              }}
            >
              <span
                style={{
                  color: "#0a0a12",
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  opacity: 0.7,
                }}
              >
                PROCESSING{".".repeat(processingDots)}
              </span>
              <span
                style={{
                  color: "#0a0a12",
                  fontSize: "11px",
                  opacity: 0.45,
                  fontWeight: 500,
                }}
              >
                (approx. 15 sec)
              </span>
            </div>
          )}
          {activationSteps.length > 0 && !isProcessing && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexShrink: 0,
                paddingLeft: "14px",
                borderLeft: "1px solid rgba(10,10,18,0.15)",
              }}
            >
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{
                  background: "#0a0a12",
                  border: "none",
                  color: "#ffffff",
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontFamily: fontStack,
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {isPlaying ? (
                  <span style={{ display: "flex", gap: "2px" }}>
                    <span style={{ width: "3px", height: "10px", background: "#ffffff", display: "inline-block" }} />
                    <span style={{ width: "3px", height: "10px", background: "#ffffff", display: "inline-block" }} />
                  </span>
                ) : (
                  <span
                    style={{
                      width: 0,
                      height: 0,
                      borderTop: "6px solid transparent",
                      borderBottom: "6px solid transparent",
                      borderLeft: "9px solid #ffffff",
                      marginLeft: "2px",
                    }}
                  />
                )}
              </button>

              <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                {activationSteps.map((step, i) => {
                  const isCurrent = i === currentStep;
                  const isPast = i < currentStep;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setIsPlaying(false);
                        goToStep(i);
                      }}
                      style={{
                        width: isCurrent ? "18px" : "6px",
                        height: "6px",
                        borderRadius: "3px",
                        background: isCurrent
                          ? "#0a0a12"
                          : isPast
                          ? "rgba(10,10,18,0.45)"
                          : "rgba(10,10,18,0.15)",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        padding: 0,
                      }}
                      title={step.time_label}
                      aria-label={`Step ${i + 1}`}
                    />
                  );
                })}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "4px" }}>
                <span
                  style={{
                    color: "#0a0a12",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    opacity: 0.45,
                    marginRight: "2px",
                  }}
                >
                  SPEED
                </span>
                {[0.5, 1, 2, 4].map((speed) => {
                  const isActive = playbackSpeed === speed;
                  return (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      style={{
                        background: isActive ? "#0a0a12" : "transparent",
                        border: `1px solid ${isActive ? "#0a0a12" : "rgba(10,10,18,0.25)"}`,
                        color: isActive ? "#ffffff" : "#0a0a12",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontFamily: fontStack,
                        fontSize: "10px",
                        fontWeight: 600,
                        lineHeight: 1,
                        minWidth: "26px",
                      }}
                    >
                      {speed}×
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span
                  style={{
                    color: "#0a0a12",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    opacity: 0.45,
                    marginRight: "2px",
                  }}
                >
                  DUR
                </span>
                {[1500, 3000, 5000, 8000].map((dur) => {
                  const isActive = stepDuration === dur;
                  return (
                    <button
                      key={dur}
                      onClick={() => setStepDuration(dur)}
                      style={{
                        background: isActive ? "#0a0a12" : "transparent",
                        border: `1px solid ${isActive ? "#0a0a12" : "rgba(10,10,18,0.25)"}`,
                        color: isActive ? "#ffffff" : "#0a0a12",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontFamily: fontStack,
                        fontSize: "10px",
                        fontWeight: 600,
                        lineHeight: 1,
                        minWidth: "26px",
                      }}
                    >
                      {dur / 1000}s
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minWidth: 0 }}>
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <div
            ref={mountRef}
            style={{ width: "100%", height: "100%", cursor: "grab" }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />

          {false && (
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                background: "#ffffff",
                borderBottom: "1px solid rgba(255,255,255,0.15)",
                padding: "10px 24px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: "14px",
                  lineHeight: 1.4,
                  letterSpacing: "-0.005em",
                  fontFamily: fontStack,
                }}
              >
                <span
                  style={{
                    color: "#0a0a12",
                    fontWeight: 700,
                  }}
                >
                  Running scenario:
                </span>{" "}
                <span
                  style={{
                    color: "#4a5568",
                    fontWeight: 500,
                  }}
                >
                  {scenarioText || "—"}
                </span>
              </div>
              {activeModifier && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexShrink: 0,
                    paddingLeft: "16px",
                    borderLeft: "1px solid rgba(10,10,18,0.15)",
                  }}
                >
                  <span
                    style={{
                      color: "#0a0a12",
                      fontSize: "11px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      opacity: 0.55,
                    }}
                  >
                    STATE
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: activeModifier.color,
                      boxShadow: `0 0 8px ${activeModifier.color}`,
                    }}
                  />
                  <span
                    style={{
                      color: "#0a0a12",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {activeModifier.name}
                  </span>
                </div>
              )}
              {isProcessing && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexShrink: 0,
                    paddingLeft: "16px",
                    borderLeft: "1px solid rgba(10,10,18,0.15)",
                  }}
                >
                  <span
                    style={{
                      color: "#0a0a12",
                      fontSize: "11px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      opacity: 0.7,
                    }}
                  >
                    PROCESSING{".".repeat(processingDots)}
                  </span>
                  <span
                    style={{
                      color: "#0a0a12",
                      fontSize: "11px",
                      opacity: 0.45,
                      fontWeight: 500,
                    }}
                  >
                    (approx. 15 sec)
                  </span>
                </div>
              )}
              {activationSteps.length > 0 && !isProcessing && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexShrink: 0,
                    paddingLeft: "14px",
                    borderLeft: "1px solid rgba(10,10,18,0.15)",
                  }}
                >
                  <button
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    style={{
                      background: "#0a0a12",
                      border: "none",
                      color: "#ffffff",
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      fontFamily: fontStack,
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    {isPlaying ? (
                      <span style={{ display: "flex", gap: "2px" }}>
                        <span style={{ width: "3px", height: "10px", background: "#ffffff", display: "inline-block" }} />
                        <span style={{ width: "3px", height: "10px", background: "#ffffff", display: "inline-block" }} />
                      </span>
                    ) : (
                      <span
                        style={{
                          width: 0,
                          height: 0,
                          borderTop: "6px solid transparent",
                          borderBottom: "6px solid transparent",
                          borderLeft: "9px solid #ffffff",
                          marginLeft: "2px",
                        }}
                      />
                    )}
                  </button>

                  <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                    {activationSteps.map((step, i) => {
                      const isCurrent = i === currentStep;
                      const isPast = i < currentStep;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setIsPlaying(false);
                            goToStep(i);
                          }}
                          style={{
                            width: isCurrent ? "18px" : "6px",
                            height: "6px",
                            borderRadius: "3px",
                            background: isCurrent
                              ? "#0a0a12"
                              : isPast
                              ? "rgba(10,10,18,0.45)"
                              : "rgba(10,10,18,0.15)",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            padding: 0,
                          }}
                          title={step.time_label}
                          aria-label={`Step ${i + 1}`}
                        />
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginLeft: "4px",
                    }}
                  >
                    <span
                      style={{
                        color: "#0a0a12",
                        fontSize: "9px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        opacity: 0.45,
                        marginRight: "2px",
                      }}
                    >
                      SPEED
                    </span>
                    {[0.5, 1, 2, 4].map((speed) => {
                      const isActive = playbackSpeed === speed;
                      return (
                        <button
                          key={speed}
                          onClick={() => setPlaybackSpeed(speed)}
                          style={{
                            background: isActive ? "#0a0a12" : "transparent",
                            border: `1px solid ${isActive ? "#0a0a12" : "rgba(10,10,18,0.25)"}`,
                            color: isActive ? "#ffffff" : "#0a0a12",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontFamily: fontStack,
                            fontSize: "10px",
                            fontWeight: 600,
                            lineHeight: 1,
                            minWidth: "26px",
                          }}
                        >
                          {speed}×
                        </button>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        color: "#0a0a12",
                        fontSize: "9px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        opacity: 0.45,
                        marginRight: "2px",
                      }}
                    >
                      DUR
                    </span>
                    {[1500, 3000, 5000, 8000].map((dur) => {
                      const isActive = stepDuration === dur;
                      return (
                        <button
                          key={dur}
                          onClick={() => setStepDuration(dur)}
                          style={{
                            background: isActive ? "#0a0a12" : "transparent",
                            border: `1px solid ${isActive ? "#0a0a12" : "rgba(10,10,18,0.25)"}`,
                            color: isActive ? "#ffffff" : "#0a0a12",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontFamily: fontStack,
                            fontSize: "10px",
                            fontWeight: 600,
                            lineHeight: 1,
                            minWidth: "26px",
                          }}
                        >
                          {dur / 1000}s
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Model attribution — CC-BY 4.0 requires visible credit. Kept
              small, dim, and in the bottom-right so it doesn't compete with
              the brain scene but is always visible. */}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: "absolute",
              bottom: "6px",
              right: "10px",
              color: "#6a7a90",
              fontSize: "10px",
              letterSpacing: "0.04em",
              fontFamily: fontStack,
              textDecoration: "none",
              opacity: 0.7,
              zIndex: 5,
              pointerEvents: "auto",
            }}
          >
            Head model: male_base by Hedy Magroun · CC BY 4.0
          </a>

          {callouts.length > 0 && (
            <div
              className="no-scrollbar"
              style={{
                position: "absolute",
                bottom: "0",
                left: "0",
                right: "0",
                padding: "12px 18px",
                display: "flex",
                gap: "8px",
                overflowX: "auto",
                background: "linear-gradient(to top, rgba(10,10,18,0.95) 40%, rgba(10,10,18,0) 100%)",
              }}
            >
              {callouts
                .filter((c) => c.intensity > 0.3)
                .map((callout, i) => {
                  const region = BRAIN_REGIONS.find((r) => r.id === callout.regionId);
                  if (!region) return null;
                  return (
                    <div
                      key={i}
                      style={{
                        background: "rgba(10,10,18,0.92)",
                        border: `1px solid ${region.color}55`,
                        borderRadius: "6px",
                        padding: "8px 12px",
                        minWidth: "220px",
                        maxWidth: "260px",
                        backdropFilter: "blur(8px)",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: region.color,
                            boxShadow: `0 0 8px ${region.color}`,
                          }}
                        />
                        <span style={{ color: region.color, fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {region.name}
                        </span>
                        <span
                          style={{
                            color: "#ffffff",
                            fontSize: "13px",
                            marginLeft: "auto",
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                          aria-label="active"
                        >
                          ✓
                        </span>
                        <span style={{ color: "#c0c8d8", fontSize: "12px", fontWeight: 500 }}>
                          {Math.round(callout.intensity * 100)}%
                        </span>
                      </div>
                      <div style={{ color: "#d0d7e2", fontSize: "13px", lineHeight: 1.4 }}>
                        {callout.reason}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {activationSteps.length > 0 && currentStep >= 0 && (
            <div
              style={{
                position: "absolute",
                top: "80px",
                left: "16px",
                background: "rgba(10,10,18,0.85)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "6px",
                padding: "10px 14px",
                maxWidth: "280px",
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ color: "#FFC312", fontSize: "14px", fontWeight: 500 }}>
                  {activationSteps[currentStep]?.time_label}
                </span>
                <span style={{ color: "#8a95a8", fontSize: "13px" }}>
                  Step {currentStep + 1}/{activationSteps.length}
                </span>
              </div>
              <div style={{ color: "#e8ecf2", fontSize: "14px", lineHeight: 1.45 }}>
                {activationSteps[currentStep]?.description}
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(237,76,103,0.15)",
                border: "1px solid rgba(237,76,103,0.3)",
                borderRadius: "6px",
                padding: "8px 12px",
                color: "#ED4C67",
                fontSize: "13px",
                maxWidth: "280px",
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        {showLegend && (
          <div
            className="thin-scroll"
            style={{
              width: "340px",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              padding: "18px 16px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  color: "#e0e4ea",
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Brain Region Guide
              </span>
              <button
                onClick={() => toggleLegend(false)}
                aria-label="Close guide"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#c0c8d8",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontFamily: fontStack,
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                }}
              >
                Close <span aria-hidden="true">✕</span>
              </button>
            </div>
            {REGION_GROUPS.map((group) => {
              const groupRegions = group.regionIds
                .map((id) => BRAIN_REGIONS.find((r) => r.id === id))
                .filter(Boolean);
              const groupAnyActive = groupRegions.some(
                (r) => (activations[r.id] || 0) > 0
              );
              const isExpanded =
                group.id in groupOverride
                  ? groupOverride[group.id]
                  : groupAnyActive;

              const toggleGroup = () => {
                setGroupOverride((prev) => ({
                  ...prev,
                  [group.id]: !isExpanded,
                }));
              };

              return (
                <div
                  key={group.id}
                  style={{
                    marginBottom: "12px",
                    background: groupAnyActive
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(255,255,255,0.025)",
                    border: `1px solid ${
                      groupAnyActive
                        ? "rgba(255,255,255,0.14)"
                        : "rgba(255,255,255,0.07)"
                    }`,
                    borderRadius: "8px",
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                  }}
                >
                  <button
                    onClick={toggleGroup}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      padding: "14px 14px 14px 8px",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      display: "block",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          display: "inline-block",
                          position: "relative",
                          flexShrink: 0,
                          transform: isExpanded
                            ? "rotate(90deg)"
                            : "rotate(0deg)",
                          transformOrigin: "center center",
                          transition: "transform 0.2s ease",
                        }}
                        aria-hidden="true"
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            width: 0,
                            height: 0,
                            marginTop: "-8px",
                            marginLeft: "-5px",
                            borderTop: "8px solid transparent",
                            borderBottom: "8px solid transparent",
                            borderLeft: "11px solid #e0e4ea",
                          }}
                        />
                      </span>
                      <span
                        style={{
                          color: groupAnyActive ? "#ffffff" : "#f0f3f8",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          flex: 1,
                        }}
                      >
                        {group.label}
                      </span>
                    </div>
                    <div
                      style={{
                        color: "#a5adbd",
                        fontSize: "11px",
                        marginTop: "3px",
                        marginLeft: "24px",
                        lineHeight: 1.4,
                      }}
                    >
                      {group.subtitle}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        marginTop: "10px",
                        marginLeft: "24px",
                      }}
                    >
                      {groupRegions.map((region) => {
                        const act = activations[region.id] || 0;
                        return (
                          <div
                            key={region.id}
                            title={region.name}
                            style={{
                              width: "52px",
                              height: "18px",
                              borderRadius: "3px",
                              background: region.color,
                              opacity: act > 0 ? 1 : 0.65,
                              boxShadow: act > 0
                                ? `0 0 10px ${region.color}`
                                : "none",
                              transition: "all 0.5s ease",
                              flexShrink: 0,
                            }}
                          />
                        );
                      })}
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        padding: "4px 14px 14px 32px",
                      }}
                    >
                      {groupRegions.map((region) => {
                        const act = activations[region.id] || 0;
                        return (
                          <div
                            key={region.id}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "4px",
                              background: act > 0
                                ? `${region.color}18`
                                : "rgba(255,255,255,0.02)",
                              border: `1px solid ${
                                act > 0
                                  ? region.color + "55"
                                  : "rgba(255,255,255,0.05)"
                              }`,
                              transition: "all 0.5s ease",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  width: "10px",
                                  height: "10px",
                                  borderRadius: "50%",
                                  background: region.color,
                                  opacity: act > 0 ? 0.85 + act * 0.15 : 0.55,
                                  boxShadow: act > 0
                                    ? `0 0 10px ${region.color}`
                                    : "none",
                                  transition: "all 0.5s ease",
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  color: act > 0 ? region.color : "#e0e4ea",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  transition: "color 0.5s ease",
                                  lineHeight: 1.2,
                                }}
                              >
                                {region.name}
                              </span>
                              {act > 0 && (
                                <div
                                  style={{
                                    marginLeft: "auto",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "#ffffff",
                                      fontSize: "13px",
                                      fontWeight: 700,
                                      lineHeight: 1,
                                    }}
                                    aria-hidden="true"
                                  >
                                    ✓
                                  </span>
                                  <span
                                    style={{
                                      color: "#ffffff",
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      letterSpacing: "0.12em",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    ACTIVE
                                  </span>
                                  <span
                                    style={{
                                      color: "#c0c8d8",
                                      fontSize: "12px",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {Math.round(act * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <div
                              style={{
                                color: "#b0b8c8",
                                fontSize: "13px",
                                marginTop: "5px",
                                lineHeight: 1.4,
                                paddingLeft: "18px",
                              }}
                            >
                              {region.description}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          flexShrink: 0,
          background: "rgba(10,10,18,0.95)",
        }}
      >
        {/* Frozen / dimmed STATE row — functionality preserved but visually
            de-emphasized and non-interactive for now. Centered above the
            primary scenario input. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            opacity: 0.2,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <span
            style={{
              color: "#c0c8d8",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            STATE
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            {MODIFIERS.map((mod) => (
              <div
                key={mod.id}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#c0c8d8",
                  padding: "4px 10px 4px 8px",
                  borderRadius: "14px",
                  fontFamily: fontStack,
                  fontSize: "11px",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: mod.color,
                    flexShrink: 0,
                  }}
                />
                {mod.name}
              </div>
            ))}
          </div>
        </div>

        {/* Primary scenario input: centered 80%, textarea + reversed-out
            button attached on the right, preset trigger floating below. */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "4px 0",
          }}
        >
          <div
            style={{
              width: "80%",
              maxWidth: "900px",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                background: "rgba(255,255,255,0.04)",
                border: "2px solid rgba(255,255,255,0.55)",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    processScenario();
                  }
                }}
                placeholder="Describe a scenario… e.g. 'Someone throws a baseball at me'"
                rows={2}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  padding: "14px 18px",
                  color: "#ffffff",
                  fontFamily: fontStack,
                  fontSize: "16px",
                  outline: "none",
                  resize: "none",
                  lineHeight: 1.4,
                }}
              />
              <button
                onClick={processScenario}
                disabled={isProcessing || !inputText.trim()}
                style={{
                  background: isProcessing || !inputText.trim()
                    ? "rgba(255,255,255,0.3)"
                    : "#ffffff",
                  border: "none",
                  color: "#0a0a12",
                  padding: "0 22px",
                  cursor:
                    isProcessing || !inputText.trim()
                      ? "default"
                      : "pointer",
                  fontFamily: fontStack,
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexShrink: 0,
                  transition: "background 0.2s ease",
                }}
              >
                {isProcessing ? "PROCESSING" : "RUN SCENARIO"}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "#0a0a12",
                    color: "#ffffff",
                    fontSize: "14px",
                    lineHeight: 1,
                  }}
                  aria-hidden="true"
                >
                  ↑
                </span>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "8px",
              }}
            >
              <button
                onClick={() => setPresetSheetOpen(true)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#c0c8d8",
                  padding: "6px 14px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  fontFamily: fontStack,
                  fontSize: "12px",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Browse Preset Scenarios
                <span aria-hidden="true" style={{ fontSize: "14px" }}>
                  →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Scenarios side sheet — slides from the right, overlays
          the legend. Click outside (backdrop) or the X closes without
          making a selection. Clicking a scenario populates the input
          and closes the sheet (user still must press RUN SCENARIO). */}
      {presetSheetOpen && (
        <>
          <div
            onClick={() => setPresetSheetOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              zIndex: 50,
            }}
          />
          <div
            className="thin-scroll"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "30%",
              minWidth: "360px",
              maxWidth: "520px",
              background: "#0f0f18",
              borderLeft: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
              zIndex: 51,
              padding: "24px 24px 32px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: displayFont,
                    fontSize: "28px",
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  Preset Scenarios
                </div>
                <div
                  style={{
                    color: "#c0c8d8",
                    fontSize: "13px",
                    marginTop: "6px",
                    lineHeight: 1.45,
                    maxWidth: "360px",
                  }}
                >
                  Each of these is a small, specific moment. Pick one and
                  watch the cascade.
                </div>
              </div>
              <button
                onClick={() => setPresetSheetOpen(false)}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#e0e4ea",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontFamily: fontStack,
                  fontSize: "12px",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                }}
              >
                Close
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginTop: "4px",
              }}
            >
              {EXAMPLE_SCENARIOS.map((scenario, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputText(scenario);
                    setPresetSheetOpen(false);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#e0e4ea",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontFamily: fontStack,
                    fontSize: "14px",
                    textAlign: "left",
                    lineHeight: 1.4,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.025)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.07)";
                  }}
                >
                  {scenario}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
