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
    basePos: { x: 0, y: 0.3, z: 0.55 },
    clusterRadius: 0.35,
    nodeCount: 18,
  },
  {
    id: "prefrontal",
    name: "Prefrontal Cortex",
    description: "Complex planning, social behavior, impulse control, working memory",
    color: "#FF3B30",
    basePos: { x: 0, y: 0.5, z: 0.68 },
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
    basePos: { x: -0.6, y: -0.1, z: 0.1 },
    clusterRadius: 0.25,
    nodeCount: 12,
  },
  {
    id: "temporal_right",
    name: "Temporal Lobe (Right)",
    description: "Music perception, face recognition, emotional memory",
    color: "#5BD4FF",
    basePos: { x: 0.6, y: -0.1, z: 0.1 },
    clusterRadius: 0.25,
    nodeCount: 12,
  },
  {
    id: "occipital",
    name: "Occipital Lobe",
    description: "Visual processing, color recognition, spatial orientation",
    color: "#0F5FD6",
    basePos: { x: 0, y: 0.2, z: -0.77 },
    clusterRadius: 0.25,
    nodeCount: 14,
  },
  {
    id: "cerebellum",
    name: "Cerebellum",
    description: "Motor coordination, balance, timing, procedural memory",
    color: "#4ED968",
    basePos: { x: 0, y: -0.55, z: -0.63 },
    clusterRadius: 0.3,
    nodeCount: 16,
  },
  {
    id: "brainstem",
    name: "Brain Stem",
    description: "Breathing, heart rate, consciousness, sleep/wake cycles",
    color: "#8FD649",
    basePos: { x: 0, y: -0.8, z: -0.27 },
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
    color: "#00E5A8",
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
  {
    id: "thc",
    name: "THC",
    shortName: "THC",
    description:
      "CB1 receptors engaged. Sensory enhancement, time dilation, working memory dulled, emotional reactivity shifted.",
    color: "#6DE38A",
    baselineOffsets: {
      prefrontal: -0.08,
      frontal: -0.04,
      parietal: 0.05,
      temporal_left: 0.05,
      temporal_right: 0.12,
      thalamus: 0.05,
      brainstem: 0.02,
      motor_cortex: -0.05,
      amygdala: -0.05,
      hippocampus: -0.12,
      occipital: 0.1,
      cerebellum: 0.08,
    },
    regionMultipliers: {
      prefrontal: 0.65,
      frontal: 0.8,
      parietal: 1.15,
      temporal_left: 1.1,
      temporal_right: 1.2,
      thalamus: 1.05,
      brainstem: 1.0,
      motor_cortex: 0.8,
      amygdala: 0.75,
      hippocampus: 0.5,
      occipital: 1.25,
      cerebellum: 1.15,
    },
  },
  {
    id: "lsd",
    name: "LSD",
    shortName: "LSD",
    description:
      "5-HT2A agonism. Cross-modal sensory blending, dissolved self-other boundaries, default mode network unraveled.",
    color: "#C6A0FF",
    baselineOffsets: {
      prefrontal: 0.05,
      frontal: 0.05,
      parietal: 0.18,
      temporal_left: 0.12,
      temporal_right: 0.18,
      thalamus: 0.2,
      brainstem: 0.05,
      motor_cortex: 0.0,
      amygdala: 0.1,
      hippocampus: 0.05,
      occipital: 0.25,
      cerebellum: 0.05,
    },
    regionMultipliers: {
      prefrontal: 0.7,
      frontal: 0.85,
      parietal: 1.4,
      temporal_left: 1.3,
      temporal_right: 1.5,
      thalamus: 1.5,
      brainstem: 1.0,
      motor_cortex: 0.95,
      amygdala: 1.2,
      hippocampus: 1.0,
      occipital: 1.6,
      cerebellum: 1.05,
    },
  },
  {
    id: "alcohol",
    name: "Alcohol",
    shortName: "Alcohol",
    description:
      "GABA potentiated, glutamate suppressed. Cortical inhibition lifted, motor + balance dulled, judgment relaxed.",
    color: "#FFC97A",
    baselineOffsets: {
      prefrontal: -0.15,
      frontal: -0.1,
      parietal: -0.05,
      temporal_left: -0.05,
      temporal_right: 0.0,
      thalamus: -0.05,
      brainstem: -0.02,
      motor_cortex: -0.1,
      amygdala: 0.05,
      hippocampus: -0.15,
      occipital: -0.05,
      cerebellum: -0.18,
    },
    regionMultipliers: {
      prefrontal: 0.45,
      frontal: 0.6,
      parietal: 0.85,
      temporal_left: 0.85,
      temporal_right: 0.9,
      thalamus: 0.85,
      brainstem: 0.95,
      motor_cortex: 0.65,
      amygdala: 1.1,
      hippocampus: 0.5,
      occipital: 0.9,
      cerebellum: 0.55,
    },
  },
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Crude but instant scenario summarizer used by the loading toast.
// Strips out filler / function words, takes the first few significant
// content words, and title-cases the result. The goal is a 2–4 word
// label that reads as "we got the gist" before the slow LLM response
// arrives — e.g. "I'm meditating in complete silence" → "Meditating
// Complete Silence". Imperfect but feels responsive and signals intent.
const SCENARIO_STOP_WORDS = new Set([
  "i", "im", "ive", "the", "a", "an", "and", "or", "of", "in", "on",
  "at", "to", "for", "with", "as", "is", "are", "was", "were", "be",
  "been", "being", "my", "me", "myself", "mine", "your", "you", "very",
  "really", "just", "again", "still", "also", "even", "yet", "into",
  "onto", "from", "by", "about", "out", "up", "down", "off", "over",
  "under", "but", "so", "that", "this", "these", "those", "it", "its",
  "had", "has", "have", "do", "does", "did", "not",
]);

function summarizeScenario(text) {
  if (!text) return "";
  const words = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[\s,.!?;:]+/)
    .filter(Boolean);
  const kept = words.filter((w) => !SCENARIO_STOP_WORDS.has(w));
  const slice = kept.length > 0 ? kept.slice(0, 4) : words.slice(0, 4);
  return slice
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Per-region target colors used by the brain dot animation. Three states:
//   resting     — no scenario loaded, baseline mid-shaded look
//   active      — region IS in the current step, brighter and vivid
//   desaturated — region is NOT in the current step, greyer and duller
// Module-level so both the scene-init effect and the animation effect
// can reference them without re-running closures.
const REGION_RESTING_COLORS = {};
const REGION_ACTIVE_COLORS = {};
const REGION_DESAT_COLORS = {};
const REGION_ACTIVE_EMISSIVE = {};
const REGION_DESAT_EMISSIVE = new THREE.Color(0x000000);
BRAIN_REGIONS.forEach((r) => {
  const c = new THREE.Color(r.color);
  REGION_RESTING_COLORS[r.id] = c.clone().multiplyScalar(0.45);
  REGION_ACTIVE_COLORS[r.id] = c.clone().multiplyScalar(0.85);
  REGION_ACTIVE_EMISSIVE[r.id] = c.clone();
  // Fully desaturated AND darkened — strip all chroma, then drop
  // lightness so the inactive dots recede into a dim gray. Each region
  // is darkened relative to its own base lightness so brighter colors
  // step down proportionally with darker ones.
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  REGION_DESAT_COLORS[r.id] = new THREE.Color().setHSL(
    0,
    0,
    hsl.l * 0.18
  );
});

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
  // Regions that sit on the midline (x≈0) were piling up in a thin vertical
  // stripe. Give them an extra lateral stretch so they breathe out toward
  // the ears instead of stacking on top of each other. The defaults
  // also stretch — bigger envelopes mean adjacent clusters overlap and
  // fill the negative space between regions.
  const isCenterline = Math.abs(region.basePos.x) < 0.2;
  const xStretch = isCenterline ? 1.95 : 1.32;
  const yStretch = 1.22;
  const zStretch = 1.25;
  // ~3.2× the configured node count per region — denser clusters carry
  // the shape of each region without needing inter-region threads.
  const targetCount = Math.floor(region.nodeCount * 3.2);
  for (let i = 0; i < targetCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    // Bias radius outward AND extend the upper bound, so each cluster
    // pushes into its neighbors instead of holding a tight ball.
    const r = region.clusterRadius * (0.55 + Math.random() * 0.6);
    nodes.push({
      x: region.basePos.x + r * Math.sin(phi) * Math.cos(theta) * xStretch,
      y: region.basePos.y + r * Math.sin(phi) * Math.sin(theta) * yStretch,
      z: region.basePos.z + r * Math.cos(phi) * zStretch,
      regionId: region.id,
      pulseOffset: Math.random() * Math.PI * 2,
      baseSize: 0.012 + Math.random() * 0.022,
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

// World-Y vertical fade for the head mesh. Keeps the top of the head at full
// (already low) opacity and falls off as we move down through the neck and
// shoulders, so the lower body is barely a whisper. Uses the raw model-space
// Y so the fade stays anchored to the head as it rotates.
const HEAD_VFADE_VERTEX_SHADER = `
  varying float vLocalY;
  void main() {
    vLocalY = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HEAD_VFADE_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  uniform float uBottomOp;
  uniform float uTopOp;
  varying float vLocalY;
  void main() {
    float t = smoothstep(uFadeStart, uFadeEnd, vLocalY);
    float op = mix(uBottomOp, uTopOp, t);
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
  "Someone throws me a baseball",
  "I smell fresh coffee brewing in the morning",
  "I hear my favorite song from childhood",
  "I'm solving a complex math problem",
  "I accidentally touch a hot stove",
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
  "I'm trying to remember where I parked",
  "I feel a mosquito land on my arm",
  "I'm learning to ride a bike for the first time",
  "I walk barefoot through wet grass",
  "I'm holding a newborn baby",
  "A car horn blares right behind me",
  "I'm dancing alone in my kitchen",
  "I taste my favorite childhood meal again",
  "I lose my balance in a difficult yoga pose",
  "I'm writing a letter to someone I miss",
];

export default function BrainViz() {
  const mountRef = useRef(null);
  const resizeBrainRef = useRef(null);
  const headObjRef = useRef(null);
  const envGroupRef = useRef(null);
  // Region currently highlighted by the per-step card cycle. Animation
  // loop reads this every frame to give the highlighted region's nodes
  // an extra pulse on top of their normal activation level.
  const highlightedRegionIdRef = useRef(null);
  // Outer glow sprite per node. Same order as nodeMeshesRef so the
  // animation loop can iterate them in lockstep.
  const nodeGlowsRef = useRef([]);
  // Per-region "highlight weight" 0..1 — lerps toward 1 when a region
  // is the current highlight, toward 0 when it's not. The animation
  // loop multiplies the highlight pulse amplitude by this weight, so
  // an outgoing region's fast pulse fades naturally while an incoming
  // region's pulse fades in — creating an overlap rather than a hard
  // hand-off between cards.
  const regionWeightsRef = useRef({});
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
  // Time the active card highlight lingers on each card before advancing
  // to the next within a step. Independent of step duration. Stored in ms.
  const [playbackSpeed, setPlaybackSpeed] = useState(3000);
  const [scenarioText, setScenarioText] = useState("");
  const [callouts, setCallouts] = useState([]);
  const LEGEND_BREAKPOINT = 880;
  const [windowWide, setWindowWide] = useState(true);
  // Brain Region Guide is now hidden by default — the walkthrough is the
  // primary surface. Users open the guide explicitly via the header
  // toggle. At narrow widths it force-closes regardless.
  const [legendOpenRequested, setLegendOpenRequested] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setWindowWide(window.innerWidth >= LEGEND_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const showLegend = windowWide && legendOpenRequested;

  const toggleLegend = useCallback((next) => {
    setLegendOpenRequested(next);
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
  // Time each step holds before auto-advancing to the next. Stored in ms.
  const [stepDuration, setStepDuration] = useState(10000);
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsAnchorRef = useRef(null);
  const presetAnchorRef = useRef(null);

  // Multi-select Altered States picker. The selection is held in state but
  // not yet wired into the LLM prompt — UI shell first, behavior later.
  const [selectedStateIds, setSelectedStateIds] = useState([]);
  const [statesPickerOpen, setStatesPickerOpen] = useState(false);
  const statesAnchorRef = useRef(null);

  // Close popovers when clicking outside them.
  useEffect(() => {
    if (!settingsOpen && !statesPickerOpen && !presetSheetOpen) return;
    const onDocClick = (e) => {
      if (
        settingsOpen &&
        settingsAnchorRef.current &&
        !settingsAnchorRef.current.contains(e.target)
      ) {
        setSettingsOpen(false);
      }
      if (
        statesPickerOpen &&
        statesAnchorRef.current &&
        !statesAnchorRef.current.contains(e.target)
      ) {
        setStatesPickerOpen(false);
      }
      if (
        presetSheetOpen &&
        presetAnchorRef.current &&
        !presetAnchorRef.current.contains(e.target)
      ) {
        setPresetSheetOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [settingsOpen, statesPickerOpen, presetSheetOpen]);

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
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.032);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0.3, 2.4);
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
    brainContentGroup.position.set(0, 0.14, -0.4);
    brainContentGroup.scale.setScalar(0.81);
    brainGroup.add(brainContentGroup);

    // Balanced lighting so every sphere shows a clear lit side, mid
    // tone, and shadow side at all times — even active/highlighted dots
    // don't blow out into a flat blob.
    const ambient = new THREE.AmbientLight(0x2a3a55, 0.4);
    scene.add(ambient);

    // Key light from upper-front-left.
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);

    // Cool fill from the opposite side keeps the shadow side from
    // collapsing into pure black so the mid-tones survive.
    const fillLight = new THREE.DirectionalLight(0x6a88c4, 0.5);
    fillLight.position.set(4, -1, -2);
    scene.add(fillLight);

    const allNodes = [];
    BRAIN_REGIONS.forEach((region) => {
      const clusterNodes = generateClusterNodes(region);
      allNodes.push(...clusterNodes);
    });
    nodesRef.current = allNodes;

    const conns = generateConnections(allNodes);
    connectionsRef.current = conns;

    // Shared soft radial-gradient texture for the outer-glow sprites.
    // One canvas, one THREE.CanvasTexture, reused by every glow.
    const glowTexture = (() => {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.32)");
      gradient.addColorStop(0.3, "rgba(255,255,255,0.18)");
      gradient.addColorStop(0.65, "rgba(255,255,255,0.05)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(canvas);
    })();

    const nodeMeshes = [];
    const nodeGlows = [];
    allNodes.forEach((node) => {
      const region = BRAIN_REGIONS.find((r) => r.id === node.regionId);
      const geo = new THREE.SphereGeometry(node.baseSize, 16, 16);
      const baseColor = new THREE.Color(region.color);
      const litBase = baseColor.clone().multiplyScalar(0.45);
      const mat = new THREE.MeshStandardMaterial({
        color: litBase.clone(),
        emissive: baseColor,
        emissiveIntensity: 0.08,
        roughness: 0.5,
        metalness: 0.05,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(node.x, node.y, node.z);
      brainContentGroup.add(mesh);
      nodeMeshes.push(mesh);

      // Outer glow sprite: billboard quad additively blended, tinted to
      // the region color. Starts invisible; animation loop fades it in
      // for regions in the current step and expands it with the
      // highlighted region's pulse.
      const glowMat = new THREE.SpriteMaterial({
        map: glowTexture,
        color: baseColor.clone(),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Sprite(glowMat);
      const glowBase = node.baseSize * 6;
      glow.userData.baseScale = glowBase;
      glow.scale.set(glowBase, glowBase, 1);
      glow.position.set(node.x, node.y, node.z);
      brainContentGroup.add(glow);
      nodeGlows.push(glow);
    });
    nodeMeshesRef.current = nodeMeshes;
    nodeGlowsRef.current = nodeGlows;

    const connectionLines = [];
    conns.forEach(([a, b, type]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(allNodes[a].x, allNodes[a].y, allNodes[a].z),
        new THREE.Vector3(allNodes[b].x, allNodes[b].y, allNodes[b].z),
      ]);
      // Intra-region lines use the region's own color so each cluster's
      // internal mesh reads as a tinted web. Inter-region lines stay
      // grey but get hidden — they tangle the picture across regions.
      const isIntra = type === "intra";
      const intraRegion = isIntra
        ? BRAIN_REGIONS.find((r) => r.id === allNodes[a].regionId)
        : null;
      const mat = new THREE.LineBasicMaterial({
        color: intraRegion ? new THREE.Color(intraRegion.color) : 0x334455,
        transparent: true,
        opacity: isIntra ? 0.09 : 0.01,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = isIntra;
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
    // Hidden by default — only shown if the OBJ head fails to load, so the
    // placeholder dot cloud never flashes in during the normal loading path.
    headDotCloud.visible = false;
    brainGroup.add(headDotCloud);

    // Load the real head mesh from /public/models/head.obj. When it arrives,
    // hide the placeholder dot cloud and landmark lines so we're only seeing
    // the real head. If loading fails, the placeholders stay visible so the
    // scene never looks empty.
    const objLoader = new OBJLoader();
    objLoader.load(
      "/models/head.obj",
      (obj) => {
        // BackSide wireframe with a broad world-Y fade: the top of the head
        // sits at the base opacity (~0.04) and the neck/shoulders dissolve
        // gently toward transparent, so the lower body is just a hint.
        // uFadeStart/uFadeEnd are in the OBJ's local model-space units —
        // measured below from the box bounds so it works regardless of the
        // auto-fit scale.
        const headMat = new THREE.ShaderMaterial({
          uniforms: {
            uColor: { value: new THREE.Color(0xaecbe8) },
            uFadeStart: { value: 0 },
            uFadeEnd: { value: 0 },
            uBottomOp: { value: 0.0024 },
            uTopOp: { value: 0.054 },
          },
          vertexShader: HEAD_VFADE_VERTEX_SHADER,
          fragmentShader: HEAD_VFADE_FRAGMENT_SHADER,
          transparent: true,
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
        const targetHeight = 4.68;
        const fitScale = targetHeight / size.y;
        obj.scale.setScalar(fitScale);

        // Set the world-Y fade band for the head shader. Values are in
        // local model-space Y because the shader reads raw `position.y`.
        // Fade goes from the very bottom (shoulders, nearly invisible) to
        // roughly the chin/jaw (~65% up), where the head reaches full
        // opacity. Broad and slow by design.
        const minY = box.min.y;
        const maxY = box.max.y;
        const range = maxY - minY;
        headMat.uniforms.uFadeStart.value = minY;
        headMat.uniforms.uFadeEnd.value = minY + range * 1.1;
        // Nudge the head so the cranium wraps the brain clusters cleanly.
        // Y: negative lift drops the skull down around the brain.
        // Z: negative shift moves the head backward so the occiput covers
        // the rear edge of the brain nodes.
        const headYLift = -1.1;
        const headZShift = -0.45;
        obj.position.set(
          -center.x * fitScale,
          -center.y * fitScale + headYLift,
          -center.z * fitScale + headZShift
        );

        obj.renderOrder = 0;
        brainGroup.add(obj);
        headObjRef.current = obj;

        // === Distant heads surrounding the main head ===
        // Clones of the loaded head scattered around the primary head on
        // its OWN plane (same Y / shoulder line), spread across a wide
        // 360° ring so they appear in every direction as the scene rotates.
        // Added to brainGroup so they rotate in lockstep with the main
        // head — they always face forward with it. Uses a separate
        // ShaderMaterial clone with dramatically reduced opacity (~15%
        // of the main head's values) so they read as ghostly silhouettes.
        // Battlezone-style CRT environment: ground grid + horizon line
        // + jagged mountain silhouettes. All parented to envGroup at
        // scene level so only Y rotation is inherited (horizon stays
        // level regardless of brain tilt).
        const envGroup = new THREE.Group();
        scene.add(envGroup);
        envGroupRef.current = envGroup;

        const distantY = -13;
        const crtGreen = 0x55ff7a;
        const crtMatBright = new THREE.LineBasicMaterial({
          color: crtGreen,
          transparent: false,
          opacity: 1,
        });

        // === Ground grid ===
        // GridHelper gives us a square grid mapping the plane. Using the
        // same color for both the center line and the outer cells so it
        // reads as uniform vector-CRT lines.
        // Grid gets a desaturated version of the CRT green so it reads
        // as "ground" rather than competing with the horizon's vivid line.
        const gridGreen = 0x88a894;
        const grid = new THREE.GridHelper(120, 40, gridGreen, gridGreen);
        grid.position.y = distantY;
        grid.material.transparent = true;
        grid.material.opacity = 0.324;
        envGroup.add(grid);

        // === Horizon line ===
        // Four cardinal segments forming a square around the scene so
        // there's always one segment across whichever way you face.
        const horizonReach = 60;
        const horizonCardinals = [
          [new THREE.Vector3(-horizonReach, distantY, -horizonReach), new THREE.Vector3(horizonReach, distantY, -horizonReach)],
          [new THREE.Vector3(-horizonReach, distantY, horizonReach), new THREE.Vector3(horizonReach, distantY, horizonReach)],
          [new THREE.Vector3(-horizonReach, distantY, -horizonReach), new THREE.Vector3(-horizonReach, distantY, horizonReach)],
          [new THREE.Vector3(horizonReach, distantY, -horizonReach), new THREE.Vector3(horizonReach, distantY, horizonReach)],
        ];
        horizonCardinals.forEach((pair) => {
          const geo = new THREE.BufferGeometry().setFromPoints(pair);
          const line = new THREE.Line(geo, crtMatBright);
          line.renderOrder = 10;
          envGroup.add(line);
        });

      },
      undefined,
      (err) => {
        console.warn("Head OBJ failed to load, showing placeholders:", err);
        headDotCloud.visible = true;
        if (landmarkLinesRef.current) {
          landmarkLinesRef.current.visible = true;
        }
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
    landmarkLines.visible = false;
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

      // Environment (grid + horizon) locks to both axes of the brain's
      // rotation so tilting forward/back carries the ground plane too.
      if (envGroupRef.current) {
        envGroupRef.current.rotation.x = rotation.current.x;
        envGroupRef.current.rotation.y = rotation.current.y;
      }

      // Gentle elliptical drift of the whole assembly. Non-repeating because
      // the X and Y periods are coprime, so the motion never settles into a
      // visible loop. Subtle amplitude on purpose.
      // Constant rightward offset on top of the lazy ellipse drift, so
      // the head sits a touch right-of-center.
      brainGroupRef.current.position.x = 0.45 + Math.sin(t * 0.13) * 0.18;
      // Constant downward offset so the head/brain sit lower in the canvas
      // and don't crowd the top header bar.
      brainGroupRef.current.position.y = -0.38 + Math.cos(t * 0.1) * 0.09;
      // Constant z offset pushing the whole assembly (and its drift
      // ellipse) away from the camera, so even at the closest point of
      // the ebb the brain still clears the foreground UI.
      brainGroupRef.current.position.z = -0.6;

      const nodes = nodesRef.current;
      const meshes = nodeMeshesRef.current;

      // Lerp every known region's highlight weight toward its target
      // (1 if it's the current highlight, 0 otherwise). The lerp factor
      // controls the overlap window — small enough that an outgoing
      // region's fast pulse continues for a beat after the next region
      // takes over, fading as the incoming one ramps up.
      const highlightedRegionId = highlightedRegionIdRef.current;
      const weights = regionWeightsRef.current;
      const lerpRate = 0.045;
      BRAIN_REGIONS.forEach((r) => {
        const target = highlightedRegionId === r.id ? 1 : 0;
        const current = weights[r.id] || 0;
        weights[r.id] = current + (target - current) * lerpRate;
      });

      // Pick the per-region target color, target emissive, and target
      // emissive intensity for THIS frame. The emissive channel is what
      // was leaking chroma onto the inactive spheres — zeroing it for
      // inactive regions lets the dark gray diffuse + lighting do the
      // work, so they read as dark gray with visible highlights.
      // Match the card threshold: any region the LLM returned below
      // 0.3 is treated as inactive for the visualization too, so the
      // brain and the cards stay in sync. The LLM often tags supporting
      // regions at 0.1–0.2 which would otherwise light up without ever
      // appearing on a card.
      const ACTIVE_THRESHOLD = 0.3;
      const stepLoaded = Object.values(activations).some(
        (v) => v > ACTIVE_THRESHOLD
      );
      const colorTargets = {};
      const emissiveTargets = {};
      const emissiveIntensityTargets = {};
      BRAIN_REGIONS.forEach((r) => {
        const a = activations[r.id] || 0;
        if (!stepLoaded) {
          colorTargets[r.id] = REGION_RESTING_COLORS[r.id];
          emissiveTargets[r.id] = REGION_ACTIVE_EMISSIVE[r.id];
          emissiveIntensityTargets[r.id] = 0.08;
        } else if (a > ACTIVE_THRESHOLD) {
          colorTargets[r.id] = REGION_ACTIVE_COLORS[r.id];
          emissiveTargets[r.id] = REGION_ACTIVE_EMISSIVE[r.id];
          emissiveIntensityTargets[r.id] = 0.1;
        } else {
          colorTargets[r.id] = REGION_DESAT_COLORS[r.id];
          emissiveTargets[r.id] = REGION_DESAT_EMISSIVE;
          emissiveIntensityTargets[r.id] = 0;
        }
      });

      const glows = nodeGlowsRef.current;
      meshes.forEach((mesh, i) => {
        const node = nodes[i];
        const activation = activations[node.regionId] || 0;
        const w = weights[node.regionId] || 0;

        const slowPulse01 =
          Math.sin(t * 3 + node.pulseOffset) * 0.5 + 0.5;
        // Symmetric fast oscillation (-1..1) so the highlighted region
        // shrinks below baseline AND blooms above it on each beat.
        const fastOsc = Math.sin(t * 7.5 + node.pulseOffset);

        // Smoothly lerp the diffuse color toward its target for this
        // frame — active regions ramp toward bright, inactive regions
        // ramp toward fully-desaturated dark gray, both over ~0.5s.
        mesh.material.color.lerp(colorTargets[node.regionId], 0.05);
        // Lerp the emissive color too — the constant 8% colored glow
        // is what was leaking chroma onto inactive spheres. Inactive
        // regions ramp emissive toward black so the chroma fades.
        mesh.material.emissive.lerp(emissiveTargets[node.regionId], 0.05);
        // Lerp emissive intensity toward the per-state target (0 for
        // inactive regions, low resting baseline otherwise).
        const targetIntensity = emissiveIntensityTargets[node.regionId];
        const intensityWithPulse =
          targetIntensity > 0 ? targetIntensity + slowPulse01 * 0.03 : 0;
        mesh.material.emissiveIntensity =
          mesh.material.emissiveIntensity +
          (intensityWithPulse - mesh.material.emissiveIntensity) * 0.05;
        // When a step is running: active dots stay fully visible (their
        // bright color carries them), EXCEPT the currently highlighted
        // region — those dots fade out with the highlight weight so
        // the glow orb can be the whole visual while it pulses.
        // Inactive dots (not in the current step) fade completely to
        // zero and hard-cull. When no scenario is loaded, everything
        // sits at full opacity (resting state).
        const isActive = activation > ACTIVE_THRESHOLD;
        const meshTargetOpacity = stepLoaded
          ? isActive
            ? 1 - w
            : 0
          : 1;
        mesh.material.opacity =
          mesh.material.opacity +
          (meshTargetOpacity - mesh.material.opacity) * 0.08;
        // Hard-cull from rendering when the mesh is essentially gone —
        // transparent meshes can still punch depth-buffer holes even
        // with depthWrite off, so flip visibility entirely below a
        // threshold. This kills the "black hole" artifact.
        mesh.visible = mesh.material.opacity > 0.02;

        // Scale = baseline + slow normal pulse (always present when
        // active) + fast highlight pulse (amplitude weighted by w, so
        // it eases in for the incoming region and eases out for the
        // outgoing one — creating the overlap the user asked for).
        const baseSize = 1;
        const activeOffset = activation * 0.5;
        const normalPulse =
          (slowPulse01 - 0.5) * 2 * activation * 0.3;
        const highlightPulse = fastOsc * 0.7 * w;
        mesh.scale.setScalar(
          baseSize + activeOffset + normalPulse + highlightPulse
        );

        // Outer glow: ONLY shows for the region currently highlighted
        // by the card cycle. Non-highlighted in-step regions lean on
        // their bright color alone; the glow is reserved as the
        // embellishment that rides with the pulse. Opacity is driven
        // by the highlight weight (w) so it eases in/out smoothly as
        // the card cycle advances.
        const glow = glows[i];
        if (glow) {
          const targetOpacity = w * 0.45;
          glow.material.opacity =
            glow.material.opacity +
            (targetOpacity - glow.material.opacity) * 0.08;
          const glowBase = glow.userData.baseScale;
          const pulse01 = (fastOsc + 1) * 0.5;
          const highlightSwell = Math.pow(1 + pulse01 * 1.75, 2) * w;
          const glowMul = 1 + highlightSwell;
          glow.scale.set(glowBase * glowMul, glowBase * glowMul, 1);
        }
      });

      connectionLinesRef.current.forEach(({ line, a, type }) => {
        // Inter-region lines stay hidden + we don't bother updating them.
        if (type !== "intra") return;
        const regionId = nodes[a].regionId;
        // Match the dot color/opacity logic so the intra-region web
        // tracks each region's resting / active / desaturated state.
        const targetColor = colorTargets[regionId];
        line.material.color.lerp(targetColor, 0.06);
        // Hide the web entirely for the region currently highlighted
        // by the card cycle — the pulsing orbs carry the visual alone.
        const isHighlightedRegion = highlightedRegionId === regionId;
        const stateOpacity = isHighlightedRegion
          ? 0
          : !stepLoaded
          ? 0.09
          : (activations[regionId] || 0) > ACTIVE_THRESHOLD
          ? 0.15
          : 0;
        line.material.opacity =
          line.material.opacity +
          (stateOpacity - line.material.opacity) * 0.06;
        line.visible = line.material.opacity > 0.02;
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

    playTimerRef.current = setTimeout(() => {
      const nextStep = currentStep + 1;
      if (nextStep < activationSteps.length) {
        goToStep(nextStep);
      } else {
        setIsPlaying(false);
      }
    }, stepDuration);

    return () => clearTimeout(playTimerRef.current);
  }, [isPlaying, currentStep, activationSteps, stepDuration, goToStep]);

  const togglePlay = () => {
    if (currentStep >= activationSteps.length - 1) {
      goToStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
    // Resume region cycling if it was paused.
    setRegionCyclePaused(false);
  };

  // === Region cycling within a step ===
  // Filtered + sorted list of cards visible at the current step. Highest
  // intensity first. Both the rendered cards and the cycle index map onto
  // this same array.
  const activeCallouts = callouts
    .filter((c) => c.intensity > 0.3)
    .slice()
    .sort((a, b) => b.intensity - a.intensity);

  const [highlightedRegionIdx, setHighlightedRegionIdx] = useState(0);
  const [regionCyclePaused, setRegionCyclePaused] = useState(false);
  // Cards stagger in on every step transition. The highlight cycle
  // doesn't start until they've finished entering, so the user sees the
  // construction first, then the highlight begins.
  const [cardsEntered, setCardsEntered] = useState(false);

  // Flash bang on every step transition. Increment a counter on step
  // change and use it as the React key for the overlay so the CSS
  // animation re-fires every time, even if the previous flash is still
  // running.
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => {
    if (currentStep < 0) return;
    setFlashKey((k) => k + 1);
  }, [currentStep]);

  // Reset cycle whenever the step changes — start from the dominant card,
  // hold cards-entered false, and flip it true after the stagger completes.
  useEffect(() => {
    setHighlightedRegionIdx(0);
    setRegionCyclePaused(false);
    setCardsEntered(false);
    if (currentStep < 0 || activationSteps.length === 0) return;
    const cardCount = activeCallouts.length || 1;
    const totalStagger = 570 + (cardCount - 1) * 165;
    const t = setTimeout(() => setCardsEntered(true), totalStagger + 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Mirror the highlighted region ID into a ref so the animation loop
  // (which captures by closure) can read it without re-subscribing.
  useEffect(() => {
    const c = activeCallouts[highlightedRegionIdx];
    highlightedRegionIdRef.current = c ? c.regionId : null;
  }, [highlightedRegionIdx, activeCallouts]);

  // Auto-cycle the highlighted card. Cadence is the user-set Region
  // Highlight duration (independent of step length). Pauses when the
  // user clicks any card. Waits until cards have finished their
  // entrance stagger so the construction reads first.
  useEffect(() => {
    if (!cardsEntered) return;
    if (regionCyclePaused) return;
    if (activeCallouts.length <= 1) return;
    const t = setTimeout(() => {
      setHighlightedRegionIdx(
        (prev) => (prev + 1) % activeCallouts.length
      );
    }, playbackSpeed);
    return () => clearTimeout(t);
  }, [
    highlightedRegionIdx,
    regionCyclePaused,
    activeCallouts.length,
    playbackSpeed,
    cardsEntered,
  ]);

  const fontStack = "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const displayFont = "var(--font-instrument-serif), Georgia, serif";


  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        minHeight: "100vh",
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
      {/* Bottom-edge bloom: a small, concentrated red on the bottom-left and
          a broader, softer purple on the bottom-right. Pointer-events off
          so it never intercepts clicks on the controls above it. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "12px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.12)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          zIndex: 6,
        }}
      >
        {/* Left: stacked wordmark — title sits on top, "Brain Activity
            Visualizer" subtitle slots underneath. Title size tuned so the
            two lines form a tidy block of roughly equal width. */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0, userSelect: "none", WebkitUserSelect: "none" }}>
          <span
            style={{
              position: "relative",
              display: "inline-block",
              fontFamily: displayFont,
              fontSize: "44px",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {/* Base layer — bottom ~10% coverage, always visible. */}
            <span
              className="nc-wordmark"
              style={{
                display: "inline-block",
                // Oranges, yellows, and purples bumped to full alpha so they
                // pull their weight against the reds/greens/blues.
                backgroundImage: `
                  radial-gradient(ellipse 25% 80% at 4% 108%, rgba(255,106,61,0.84) 0%, transparent 55%),
                  radial-gradient(ellipse 20% 95% at 11% 92%, rgba(255,159,67,0.96) 0%, transparent 55%),
                  radial-gradient(ellipse 28% 75% at 19% 105%, rgba(255,184,77,0.96) 0%, transparent 55%),
                  radial-gradient(ellipse 22% 90% at 27% 88%, rgba(0,216,138,0.54) 0%, transparent 55%),
                  radial-gradient(ellipse 25% 80% at 36% 102%, rgba(46,156,255,0.51) 0%, transparent 55%),
                  radial-gradient(ellipse 22% 95% at 44% 90%, rgba(15,95,214,0.48) 0%, transparent 55%),
                  radial-gradient(ellipse 25% 80% at 53% 105%, rgba(216,100,255,0.6) 0%, transparent 55%),
                  radial-gradient(ellipse 22% 85% at 62% 90%, rgba(255,159,67,0.96) 0%, transparent 55%),
                  radial-gradient(ellipse 25% 80% at 71% 105%, rgba(0,216,138,0.51) 0%, transparent 55%),
                  radial-gradient(ellipse 22% 95% at 80% 88%, rgba(46,156,255,0.51) 0%, transparent 55%),
                  radial-gradient(ellipse 25% 80% at 89% 102%, rgba(155,43,255,0.6) 0%, transparent 55%),
                  radial-gradient(ellipse 25% 80% at 97% 90%, rgba(255,184,77,0.96) 0%, transparent 55%),
                  linear-gradient(#ffffff, #ffffff)
                `,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              Neural Cascade
            </span>
            {/* Bloom layer — color blooms are taller and anchored higher,
                so they cover ~40% of each letter. Fades in/out over the
                same 22s cycle so the wordmark "ebbs" up and back down. */}
            <span
              aria-hidden
              className="nc-wordmark-bloom"
              style={{
                backgroundImage: `
                  radial-gradient(ellipse 25% 110% at 4% 135%, rgba(255,59,48,0.57) 0%, transparent 60%),
                  radial-gradient(ellipse 20% 130% at 11% 120%, rgba(255,159,67,0.6) 0%, transparent 60%),
                  radial-gradient(ellipse 28% 110% at 19% 135%, rgba(255,184,77,0.6) 0%, transparent 60%),
                  radial-gradient(ellipse 22% 125% at 27% 115%, rgba(0,216,138,0.57) 0%, transparent 60%),
                  radial-gradient(ellipse 25% 115% at 36% 130%, rgba(46,156,255,0.54) 0%, transparent 60%),
                  radial-gradient(ellipse 22% 130% at 44% 118%, rgba(15,95,214,0.51) 0%, transparent 60%),
                  radial-gradient(ellipse 25% 115% at 53% 132%, rgba(216,100,255,0.6) 0%, transparent 60%),
                  radial-gradient(ellipse 22% 120% at 62% 118%, rgba(255,159,67,0.6) 0%, transparent 60%),
                  radial-gradient(ellipse 25% 115% at 71% 132%, rgba(0,216,138,0.54) 0%, transparent 60%),
                  radial-gradient(ellipse 22% 130% at 80% 115%, rgba(46,156,255,0.54) 0%, transparent 60%),
                  radial-gradient(ellipse 25% 115% at 89% 130%, rgba(155,43,255,0.6) 0%, transparent 60%),
                  radial-gradient(ellipse 25% 115% at 97% 118%, rgba(255,184,77,0.6) 0%, transparent 60%),
                  linear-gradient(transparent, transparent)
                `,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              Neural Cascade
            </span>
          </span>
          <span style={{ color: "#e8ecf2", fontSize: "9.5px", letterSpacing: "0.36em", textTransform: "uppercase", fontWeight: 500, lineHeight: 1, marginTop: "-5px" }}>
            Brain Activity Visualizer
          </span>
        </div>

        {/* Center: step navigation. Only renders once a scenario is loaded.
            Two stacked rows — prev/counter/next on top, description (with
            italic time label) underneath. */}
        {activationSteps.length > 0 && currentStep >= 0 ? (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              maxWidth: "640px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <button
                onClick={() => {
                  if (currentStep > 0) {
                    if (isPlaying) setIsPlaying(false);
                    goToStep(currentStep - 1);
                  }
                }}
                disabled={currentStep <= 0}
                aria-label="Previous step"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color:
                    currentStep <= 0 ? "rgba(255,255,255,0.2)" : "#e8ecf2",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor: currentStep <= 0 ? "default" : "pointer",
                  fontFamily: fontStack,
                  fontSize: "19px",
                  fontWeight: 600,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  padding: 0,
                }}
              >
                ❮
              </button>
              <div
                style={{
                  fontFamily: displayFont,
                  fontSize: "31px",
                  color: "#ffffff",
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              >
                Step {currentStep + 1} of {activationSteps.length}
              </div>
              <button
                onClick={() => {
                  if (currentStep < activationSteps.length - 1) {
                    if (isPlaying) setIsPlaying(false);
                    goToStep(currentStep + 1);
                  }
                }}
                disabled={currentStep >= activationSteps.length - 1}
                aria-label="Next step"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color:
                    currentStep >= activationSteps.length - 1
                      ? "rgba(255,255,255,0.2)"
                      : "#e8ecf2",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor:
                    currentStep >= activationSteps.length - 1
                      ? "default"
                      : "pointer",
                  fontFamily: fontStack,
                  fontSize: "19px",
                  fontWeight: 600,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  padding: 0,
                }}
              >
                ❯
              </button>
            </div>
            <div
              style={{
                color: "#e8ecf2",
                fontSize: "13px",
                lineHeight: 1.35,
                textAlign: "center",
                fontFamily: fontStack,
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {activationSteps[currentStep]?.description}{" "}
              <span
                style={{
                  color: "#8892a4",
                  fontStyle: "italic",
                  fontWeight: 400,
                  marginLeft: "4px",
                }}
              >
                {activationSteps[currentStep]?.time_label}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }} />
        )}

        {/* Right: Brain Region Guide button (always pinned to top-right
            with empty placeholder space below). Play/gear sit in the
            reserved row when a scenario is loaded; otherwise the row
            stays empty so the guide button doesn't reflow. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "6px",
            flexShrink: 0,
            minWidth: "230px",
          }}
        >
          <div style={{ minHeight: "30px", display: "flex", alignItems: "center" }}>
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              >
                {activationSteps.length > 0 && (
                  <span
                    aria-hidden="true"
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "#ffffff",
                      color: "#0a0a12",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: 800,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                )}
                Open Brain Region Guide
              </button>
            )}
          </div>
          <div
            style={{
              minHeight: "32px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {activationSteps.length > 0 && currentStep >= 0 && (
              <>
                <button
                  onClick={togglePlay}
                  style={{
                    background: "#ffffff",
                    border: "none",
                    color: "#0a0a12",
                    padding: "8px 16px 8px 12px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontFamily: fontStack,
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    lineHeight: 1,
                    flexShrink: 0,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                  }}
                >
                  {isPlaying ? (
                    <span style={{ display: "flex", gap: "3px" }}>
                      <span style={{ width: "3px", height: "10px", background: "#0a0a12", display: "inline-block" }} />
                      <span style={{ width: "3px", height: "10px", background: "#0a0a12", display: "inline-block" }} />
                    </span>
                  ) : (
                    <span
                      style={{
                        width: 0,
                        height: 0,
                        borderTop: "6px solid transparent",
                        borderBottom: "6px solid transparent",
                        borderLeft: "9px solid #0a0a12",
                      }}
                    />
                  )}
                  {isPlaying ? "Pause Walkthrough" : "Play Walkthrough"}
                </button>
                <div
                  ref={settingsAnchorRef}
                  style={{ position: "relative", flexShrink: 0 }}
                >
                  <button
                    onClick={() => setSettingsOpen((v) => !v)}
                    aria-label="Playback settings"
                    style={{
                      background: settingsOpen
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                      border: "1px solid rgba(255,255,255,0.18)",
                      color: "#e8ecf2",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      fontSize: "22px",
                      lineHeight: 1,
                      transition: "background 0.15s ease",
                    }}
                  >
                    <span style={{ display: "block", transform: "translateY(-2px)" }}>⚙</span>
                  </button>
                  {settingsOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        background: "#ffffff",
                        border: "1px solid rgba(10,10,18,0.15)",
                        borderRadius: "10px",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                        padding: "14px 16px",
                        minWidth: "240px",
                        zIndex: 30,
                      }}
                    >
                      <div style={{ color: "#0a0a12", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, opacity: 0.55, marginBottom: "8px" }}>
                        REGION HIGHLIGHT
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                        {[3000, 5000, 8000, 12000].map((dur) => {
                          const isActive = playbackSpeed === dur;
                          return (
                            <button
                              key={dur}
                              onClick={() => setPlaybackSpeed(dur)}
                              style={{
                                flex: 1,
                                background: isActive ? "#0a0a12" : "transparent",
                                border: `1px solid ${isActive ? "#0a0a12" : "rgba(10,10,18,0.25)"}`,
                                color: isActive ? "#ffffff" : "#0a0a12",
                                padding: "6px 0",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontFamily: fontStack,
                                fontSize: "12px",
                                fontWeight: 600,
                                lineHeight: 1,
                              }}
                            >
                              {dur / 1000}s
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ color: "#0a0a12", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, opacity: 0.55, marginBottom: "8px" }}>
                        TIME BETWEEN STEPS
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {[5000, 10000, 15000, 30000].map((dur) => {
                          const isActive = stepDuration === dur;
                          return (
                            <button
                              key={dur}
                              onClick={() => setStepDuration(dur)}
                              style={{
                                flex: 1,
                                background: isActive ? "#0a0a12" : "transparent",
                                border: `1px solid ${isActive ? "#0a0a12" : "rgba(10,10,18,0.25)"}`,
                                color: isActive ? "#ffffff" : "#0a0a12",
                                padding: "6px 0",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontFamily: fontStack,
                                fontSize: "12px",
                                fontWeight: 600,
                                lineHeight: 1,
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* DELETED: white header row — replaced by the top toast (during
          processing only) and the in-Step-Header playback controls. */}
      {false && (
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
            padding: "5px 24px",
            minHeight: "36px",
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
                gap: "12px",
                flexShrink: 0,
                paddingLeft: "16px",
                borderLeft: "1px solid rgba(10,10,18,0.15)",
                position: "relative",
              }}
            >
              <button
                onClick={togglePlay}
                style={{
                  background: "#0a0a12",
                  border: "none",
                  color: "#ffffff",
                  padding: "8px 16px 8px 12px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontFamily: fontStack,
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  lineHeight: 1,
                }}
              >
                {isPlaying ? (
                  <span style={{ display: "flex", gap: "3px" }}>
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
                    }}
                  />
                )}
                {isPlaying ? "Pause Walkthrough" : "Play Walkthrough"}
              </button>

              <div ref={settingsAnchorRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setSettingsOpen((v) => !v)}
                  aria-label="Playback settings"
                  style={{
                    background: settingsOpen ? "rgba(10,10,18,0.08)" : "transparent",
                    border: "1px solid rgba(10,10,18,0.2)",
                    color: "#0a0a12",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    fontSize: "32px",
                    lineHeight: 1,
                    transition: "background 0.15s ease",
                  }}
                >
                  <span style={{ display: "block", transform: "translateY(-3px)" }}>⚙</span>
                </button>
                {settingsOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid rgba(10,10,18,0.15)",
                      borderRadius: "10px",
                      boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                      padding: "14px 16px",
                      minWidth: "240px",
                      zIndex: 30,
                    }}
                  >
                    <div
                      style={{
                        color: "#0a0a12",
                        fontSize: "10px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        opacity: 0.55,
                        marginBottom: "8px",
                      }}
                    >
                      REGION HIGHLIGHT
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                      {[3000, 5000, 8000, 12000].map((dur) => {
                        const isActive = playbackSpeed === dur;
                        return (
                          <button
                            key={dur}
                            onClick={() => setPlaybackSpeed(dur)}
                            style={{
                              flex: 1,
                              background: isActive ? "#0a0a12" : "transparent",
                              border: `1px solid ${isActive ? "#0a0a12" : "rgba(10,10,18,0.25)"}`,
                              color: isActive ? "#ffffff" : "#0a0a12",
                              padding: "6px 0",
                              borderRadius: "5px",
                              cursor: "pointer",
                              fontFamily: fontStack,
                              fontSize: "12px",
                              fontWeight: 600,
                              lineHeight: 1,
                            }}
                          >
                            {dur / 1000}s
                          </button>
                        );
                      })}
                    </div>
                    <div
                      style={{
                        color: "#0a0a12",
                        fontSize: "10px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        opacity: 0.55,
                        marginBottom: "8px",
                      }}
                    >
                      TIME BETWEEN STEPS
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {[5000, 10000, 15000, 30000].map((dur) => {
                        const isActive = stepDuration === dur;
                        return (
                          <button
                            key={dur}
                            onClick={() => setStepDuration(dur)}
                            style={{
                              flex: 1,
                              background: isActive ? "#0a0a12" : "transparent",
                              border: `1px solid ${isActive ? "#0a0a12" : "rgba(10,10,18,0.25)"}`,
                              color: isActive ? "#ffffff" : "#0a0a12",
                              padding: "6px 0",
                              borderRadius: "5px",
                              cursor: "pointer",
                              fontFamily: fontStack,
                              fontSize: "12px",
                              fontWeight: 600,
                              lineHeight: 1,
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
        </div>

      </div>
      )}

      {/* DELETED Step Header block — its contents (prev/counter/next,
          description, play button, gear) have all moved into the top
          header bar above. */}
      {false && activationSteps.length > 0 && currentStep >= 0 && (
        <div
          style={{
            background: "rgba(10,12,20,0.6)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "12px 24px 14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            flexShrink: 0,
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              width: "100%",
              position: "relative",
            }}
          >
            {/* Center step nav — absolutely positioned so the play+gear
                cluster on the right doesn't push the step counter off-axis. */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => {
                  if (currentStep > 0) {
                    if (isPlaying) setIsPlaying(false);
                    goToStep(currentStep - 1);
                  }
                }}
                disabled={currentStep <= 0}
                aria-label="Previous step"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color:
                    currentStep <= 0 ? "rgba(255,255,255,0.2)" : "#e8ecf2",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor: currentStep <= 0 ? "default" : "pointer",
                  fontFamily: fontStack,
                  fontSize: "20px",
                  fontWeight: 600,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                ❮
              </button>
              <div
                style={{
                  fontFamily: displayFont,
                  fontSize: "30px",
                  color: "#ffffff",
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                Step {currentStep + 1} of {activationSteps.length}
              </div>
              <button
                onClick={() => {
                  if (currentStep < activationSteps.length - 1) {
                    if (isPlaying) setIsPlaying(false);
                    goToStep(currentStep + 1);
                  }
                }}
                disabled={currentStep >= activationSteps.length - 1}
                aria-label="Next step"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color:
                    currentStep >= activationSteps.length - 1
                      ? "rgba(255,255,255,0.2)"
                      : "#e8ecf2",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor:
                    currentStep >= activationSteps.length - 1
                      ? "default"
                      : "pointer",
                  fontFamily: fontStack,
                  fontSize: "20px",
                  fontWeight: 600,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                ❯
              </button>
            </div>

            {/* Play / Pause Walkthrough — far right, in normal flex flow
                so it doesn't disturb the centered step counter. */}
            <button
              onClick={togglePlay}
              style={{
                background: "#ffffff",
                border: "none",
                color: "#0a0a12",
                padding: "8px 16px 8px 12px",
                borderRadius: "20px",
                cursor: "pointer",
                fontFamily: fontStack,
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {isPlaying ? (
                <span style={{ display: "flex", gap: "3px" }}>
                  <span style={{ width: "3px", height: "10px", background: "#0a0a12", display: "inline-block" }} />
                  <span style={{ width: "3px", height: "10px", background: "#0a0a12", display: "inline-block" }} />
                </span>
              ) : (
                <span
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: "6px solid transparent",
                    borderBottom: "6px solid transparent",
                    borderLeft: "9px solid #0a0a12",
                  }}
                />
              )}
              {isPlaying ? "Pause Walkthrough" : "Play Walkthrough"}
            </button>

            {/* Gear icon — playback settings popover. */}
            <div
              ref={settingsAnchorRef}
              style={{ position: "relative", flexShrink: 0 }}
            >
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                aria-label="Playback settings"
                style={{
                  background: settingsOpen
                    ? "rgba(255,255,255,0.08)"
                    : "transparent",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#e8ecf2",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  fontSize: "22px",
                  lineHeight: 1,
                  transition: "background 0.15s ease",
                }}
              >
                <span style={{ display: "block", transform: "translateY(-2px)" }}>⚙</span>
              </button>
              {settingsOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "#ffffff",
                    border: "1px solid rgba(10,10,18,0.15)",
                    borderRadius: "10px",
                    boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                    padding: "14px 16px",
                    minWidth: "240px",
                    zIndex: 30,
                  }}
                >
                  <div
                    style={{
                      color: "#0a0a12",
                      fontSize: "10px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      opacity: 0.55,
                      marginBottom: "8px",
                    }}
                  >
                    REGION HIGHLIGHT
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                    {[3000, 5000, 8000, 12000].map((dur) => {
                      const isActive = playbackSpeed === dur;
                      return (
                        <button
                          key={dur}
                          onClick={() => setPlaybackSpeed(dur)}
                          style={{
                            flex: 1,
                            background: isActive ? "#0a0a12" : "transparent",
                            border: `1px solid ${isActive ? "#0a0a12" : "rgba(10,10,18,0.25)"}`,
                            color: isActive ? "#ffffff" : "#0a0a12",
                            padding: "6px 0",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontFamily: fontStack,
                            fontSize: "12px",
                            fontWeight: 600,
                            lineHeight: 1,
                          }}
                        >
                          {dur / 1000}s
                        </button>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      color: "#0a0a12",
                      fontSize: "10px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      opacity: 0.55,
                      marginBottom: "8px",
                    }}
                  >
                    TIME BETWEEN STEPS
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[5000, 10000, 15000, 30000].map((dur) => {
                      const isActive = stepDuration === dur;
                      return (
                        <button
                          key={dur}
                          onClick={() => setStepDuration(dur)}
                          style={{
                            flex: 1,
                            background: isActive ? "#0a0a12" : "transparent",
                            border: `1px solid ${isActive ? "#0a0a12" : "rgba(10,10,18,0.25)"}`,
                            color: isActive ? "#ffffff" : "#0a0a12",
                            padding: "6px 0",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontFamily: fontStack,
                            fontSize: "12px",
                            fontWeight: 600,
                            lineHeight: 1,
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
          <div
            style={{
              color: "#e8ecf2",
              fontSize: "15px",
              lineHeight: 1.4,
              maxWidth: "640px",
              textAlign: "center",
              fontFamily: fontStack,
              marginTop: "2px",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {activationSteps[currentStep]?.description}{" "}
            <span
              style={{
                color: "#8892a4",
                fontStyle: "italic",
                fontWeight: 400,
                marginLeft: "4px",
              }}
            >
              {activationSteps[currentStep]?.time_label}
            </span>
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
          {/* Step transition flash. Re-mounted on every step change via
              the flashKey so the CSS animation re-fires every time, even
              if the previous flash was still in flight. */}
          {flashKey > 0 && (
            <div
              key={flashKey}
              className="nc-flashbang"
              aria-hidden="true"
            />
          )}

          {/* Top toast — appears only while a scenario is being processed.
              Spinner on top, processing line just below, scenario text
              tucked underneath with a bit of breathing room. Disappears
              the moment activationSteps arrive. */}
          {(scenarioText || isProcessing) && isProcessing && (
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#ffffff",
                color: "#0a0a12",
                padding: "16px 24px 18px",
                borderRadius: "12px",
                boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                zIndex: 12,
                maxWidth: "min(70%, 640px)",
                fontFamily: fontStack,
              }}
            >
              <div className="nc-spinner" aria-hidden="true">
                <span
                  className="nc-spinner-dot"
                  style={{
                    background:
                      "radial-gradient(circle at 32% 28%, #ffd9d4 0%, #FF6A3D 35%, #b2210f 100%)",
                  }}
                />
                <span
                  className="nc-spinner-dot"
                  style={{
                    background:
                      "radial-gradient(circle at 32% 28%, #d4f0ff 0%, #2E9CFF 35%, #0a4d96 100%)",
                  }}
                />
                <span
                  className="nc-spinner-dot"
                  style={{
                    background:
                      "radial-gradient(circle at 32% 28%, #d2f7e3 0%, #10AC84 35%, #064d3a 100%)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    color: "#0a0a12",
                    fontSize: "11px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    opacity: 0.75,
                  }}
                >
                  Processing
                </span>
                <span
                  style={{
                    color: "#0a0a12",
                    fontSize: "11px",
                    opacity: 0.45,
                    fontWeight: 500,
                  }}
                >
                  approx. 15 seconds
                </span>
              </div>
              <div
                style={{
                  fontSize: "14px",
                  lineHeight: 1.4,
                  textAlign: "center",
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(10,10,18,0.08)",
                  width: "100%",
                }}
              >
                <span style={{ color: "#8a95a8", fontWeight: 500 }}>
                  Processing scenario:
                </span>{" "}
                <span style={{ color: "#0a0a12", fontWeight: 600 }}>
                  {summarizeScenario(scenarioText) || "—"}
                </span>
              </div>
            </div>
          )}

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
              small, dim, and pinned just above the bottom controls bar so
              it doesn't get covered by the translucent overlay. */}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: "absolute",
              bottom: "100px",
              right: "14px",
              color: "#6a7a90",
              fontSize: "10px",
              letterSpacing: "0.04em",
              fontFamily: fontStack,
              textDecoration: "none",
              opacity: 0.7,
              zIndex: 7,
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
                top: "120px",
                bottom: "120px",
                left: "16px",
                width: "260px",
                padding: "12px 6px 0 0",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                overflowY: "auto",
                pointerEvents: "auto",
                zIndex: 4,
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              {activeCallouts.map((callout, i) => {
                  const region = BRAIN_REGIONS.find(
                    (r) => r.id === callout.regionId
                  );
                  if (!region) return null;
                  // Tier label from raw intensity. Hierarchy is also
                  // visible via left-to-right card order, so the tag is
                  // just a quick reinforcement.
                  const tier =
                    callout.intensity >= 0.7
                      ? "DRIVING"
                      : callout.intensity >= 0.45
                      ? "ENGAGED"
                      : "TRACE";
                  const isHighlighted = i === highlightedRegionIdx;
                  return (
                    <div
                      key={`${currentStep}-${i}`}
                      className="nc-region-card"
                      onClick={() => {
                        setHighlightedRegionIdx(i);
                        setRegionCyclePaused(true);
                      }}
                      style={{
                        position: "relative",
                        background: isHighlighted
                          ? "rgba(20,22,32,0.96)"
                          : "rgba(10,10,18,0.92)",
                        border: `1px solid ${
                          isHighlighted ? region.color : region.color + "55"
                        }`,
                        boxShadow: isHighlighted
                          ? `0 0 18px ${region.color}55, inset 0 0 0 1px ${region.color}aa`
                          : "none",
                        borderRadius: "6px",
                        padding: "10px 14px 10px 14px",
                        width: "100%",
                        backdropFilter: "blur(8px)",
                        flexShrink: 0,
                        cursor: "pointer",
                        animationDelay: `${i * 165}ms`,
                        transition:
                          "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
                      }}
                    >
                      {/* Tier tag pinned to upper-right, sitting astride
                          the border with a slight tilt so it doesn't quite
                          cover the corner. */}
                      <span
                        style={{
                          position: "absolute",
                          top: "-7px",
                          right: "10px",
                          background: region.color,
                          color: "#0a0a12",
                          fontSize: "9px",
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          padding: "3px 6px 2px",
                          borderRadius: "3px",
                          lineHeight: 1,
                          display: "inline-block",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
                        }}
                      >
                        {tier}
                      </span>
                      <div
                        style={{
                          marginBottom: "4px",
                          paddingRight: "60px",
                        }}
                      >
                        <span
                          style={{
                            color: region.color,
                            fontSize: "12px",
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                        >
                          {region.name}
                        </span>
                      </div>
                      <div
                        style={{
                          color: "#d0d7e2",
                          fontSize: "13px",
                          lineHeight: 1.4,
                        }}
                      >
                        {callout.reason}
                      </div>
                    </div>
                  );
                })}
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
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "340px",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.12)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              zIndex: 20,
            }}
          >
            {/* Pinned header — stays put while the groups list scrolls.
                Tall + opaque enough to fully cover the "Open Brain Region
                Guide" button in the top header bar that sits behind it. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "32px 16px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.85)",
                flexShrink: 0,
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
            {/* Scrollable groups list. */}
            <div
              className="thin-scroll"
              style={{
                flex: 1,
                padding: "14px 16px",
                overflowY: "auto",
              }}
            >
            {REGION_GROUPS.map((group) => {
              const groupRegions = group.regionIds
                .map((id) => BRAIN_REGIONS.find((r) => r.id === id))
                .filter(Boolean);
              const groupAnyActive = groupRegions.some(
                (r) => (activations[r.id] || 0) > 0
              );
              // Default: every group starts collapsed when the guide
              // opens. The user discovers details by expanding groups
              // themselves — the swatch row with checkmarks already
              // tells them which regions are active.
              const isExpanded =
                group.id in groupOverride ? groupOverride[group.id] : false;

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
                      ? "rgba(0,0,0,0.55)"
                      : "rgba(0,0,0,0.42)",
                    border: `1px solid ${
                      groupAnyActive
                        ? "rgba(255,255,255,0.16)"
                        : "rgba(255,255,255,0.08)"
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
                        }}
                        aria-hidden="true"
                      >
                        {/* Horizontal bar — always visible. The bars are
                            insetted so the icon occupies an 18px box (which
                            keeps alignment with the group subtitle below)
                            while the actual glyph stays visually ~14px. */}
                        <span
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "2px",
                            right: "2px",
                            height: "2px",
                            marginTop: "-1px",
                            background: "#7d8ba8",
                            borderRadius: "1px",
                          }}
                        />
                        {/* Vertical bar — rotates 90° on expand so it lies
                            flat over the horizontal, turning + into −. */}
                        <span
                          style={{
                            position: "absolute",
                            top: "2px",
                            bottom: "2px",
                            left: "50%",
                            width: "2px",
                            marginLeft: "-1px",
                            background: "#7d8ba8",
                            borderRadius: "1px",
                            transform: isExpanded
                              ? "rotate(90deg)"
                              : "rotate(0deg)",
                            transformOrigin: "center center",
                            transition: "transform 0.25s ease",
                          }}
                        />
                      </span>
                      <span
                        style={{
                          color: groupAnyActive ? "#ffffff" : "#7d8ba8",
                          fontSize: "14px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          flex: 1,
                          transition: "color 0.3s ease",
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
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {act > 0 && (
                              <span
                                aria-hidden="true"
                                style={{
                                  width: "12px",
                                  height: "12px",
                                  borderRadius: "50%",
                                  background: "#ffffff",
                                  color: "#0a0a12",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "8px",
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
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
                                ? `${region.color}33`
                                : "rgba(255,255,255,0.02)",
                              border: `1px solid ${
                                act > 0
                                  ? region.color + "cc"
                                  : "rgba(255,255,255,0.05)"
                              }`,
                              boxShadow:
                                act > 0
                                  ? `0 0 14px ${region.color}55, inset 0 0 0 1px ${region.color}66`
                                  : "none",
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
                                  color: act > 0 ? region.color : "#7d8ba8",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  transition: "color 0.5s ease",
                                  lineHeight: 1.2,
                                }}
                              >
                                {region.name}
                              </span>
                              {act > 0 && (
                                <span
                                  aria-label="active"
                                  style={{
                                    marginLeft: "auto",
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    background: "#ffffff",
                                    color: "#0a0a12",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    boxShadow: `0 0 10px ${region.color}99`,
                                    flexShrink: 0,
                                  }}
                                >
                                  ✓
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                color: "#7d8ba8",
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
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 24px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          background: "rgba(0,0,0,0.12)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 6,
        }}
      >
        {/* Red + purple bloom — contained inside the bottom bar so it
            can't leak above the top border. Gradients are absolutely
            positioned to fill the bar, then masked upward to fade. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              radial-gradient(ellipse 62% 140% at 4% 118%, rgba(255,59,48,0.22) 0%, transparent 75%),
              radial-gradient(ellipse 62% 135% at 90% 118%, rgba(155,43,255,0.144) 0%, transparent 70%)
            `,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Primary scenario input: centered 80%, textarea + reversed-out
            button attached on the right, preset trigger floating below. */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "0",
          }}
        >
          <div
            style={{
              width: "72%",
              maxWidth: "780px",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                position: "relative",
              }}
            >
              {/* Frosted dark glass panel per the glass-field-dev-spec:
                  - Dark tinted fill (~65% opacity)
                  - backdrop-filter blurs whatever is behind it (the red +
                    purple bottom-edge blooms show through softly)
                  - Thin bright border
                  - Diagonal light sweep from upper-left via backgroundImage
                  - 1px top + left edge highlights via inset box-shadow */}
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  zIndex: 1,
                  backgroundImage: `
                    linear-gradient(160deg,
                      rgba(255, 255, 255, 0.09) 0%,
                      rgba(255, 255, 255, 0.02) 25%,
                      transparent 50%
                    )
                  `,
                  backdropFilter: "blur(30px) saturate(1.2)",
                  WebkitBackdropFilter: "blur(30px) saturate(1.2)",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRight: "none",
                  borderRadius: "14px 0 0 14px",
                  overflow: "hidden",
                  boxShadow:
                    "inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 1px 0 0 rgba(255, 255, 255, 0.06)",
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
                  placeholder="Describe a scenario… e.g. 'Someone throws me a baseball'"
                  rows={1}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "38px",
                    background: "transparent",
                    border: "none",
                    padding: "10px 44px 10px 18px",
                    color: "#ffffff",
                    fontFamily: fontStack,
                    fontSize: "15px",
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.2,
                    textShadow: "1px 1px 2px rgba(12, 14, 22, 0.85)",
                  }}
                />
              </div>
              <button
                onClick={processScenario}
                disabled={isProcessing || !inputText.trim()}
                style={{
                  position: "relative",
                  zIndex: 2,
                  marginLeft: "-1px",
                  height: "38px",
                  minWidth: "186px",
                  background: isProcessing || !inputText.trim()
                    ? "rgba(255,255,255,0.3)"
                    : "#ffffff",
                  border: "none",
                  color: "#0a0a12",
                  padding: "0 22px",
                  justifyContent: "center",
                  userSelect: "none",
                  WebkitUserSelect: "none",
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
                  borderRadius: "0 14px 14px 0",
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
                gap: "10px",
                marginTop: "8px",
              }}
            >
              {/* Altered States multi-select. Selection shown inline in
                  the label. UI shell only — selection is not yet wired
                  into the LLM prompt. */}
              <div ref={statesAnchorRef} style={{ position: "relative" }}>
                <button
                  disabled
                  aria-disabled="true"
                  onClick={() => {}}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(192,200,216,0.35)",
                    padding: "6px 42px",
                    borderRadius: "14px",
                    cursor: "not-allowed",
                    fontFamily: fontStack,
                    fontSize: "12px",
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    maxWidth: "360px",
                  }}
                >
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Altered States:{" "}
                    <span style={{ color: "rgba(255,255,255,0.18)", fontWeight: 400, fontStyle: "italic" }}>
                      disabled
                    </span>
                  </span>
                </button>
                {statesPickerOpen && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "rgba(14,16,24,0.98)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
                      padding: "10px 6px 10px",
                      minWidth: "220px",
                      zIndex: 30,
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 10px 8px",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStateIds([]);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#7d8ba8",
                          fontFamily: fontStack,
                          fontSize: "10px",
                          fontWeight: 500,
                          cursor: "pointer",
                          padding: 0,
                          letterSpacing: "0.02em",
                        }}
                      >
                        clear
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatesPickerOpen(false);
                        }}
                        aria-label="Close"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#7d8ba8",
                          fontFamily: fontStack,
                          fontSize: "11px",
                          cursor: "pointer",
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    {MODIFIERS.map((mod) => {
                      const isSelected = selectedStateIds.includes(mod.id);
                      return (
                        <button
                          key={mod.id}
                          onClick={() => {
                            setSelectedStateIds((prev) =>
                              prev.includes(mod.id)
                                ? prev.filter((id) => id !== mod.id)
                                : [...prev, mod.id]
                            );
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            color: "#e0e6ef",
                            padding: "8px 12px",
                            fontFamily: fontStack,
                            fontSize: "13px",
                            fontWeight: 500,
                            cursor: "pointer",
                            textAlign: "left",
                            borderRadius: "5px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span
                            style={{
                              width: "14px",
                              height: "14px",
                              border: "1px solid rgba(255,255,255,0.4)",
                              borderRadius: "3px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              background: isSelected
                                ? "#ffffff"
                                : "transparent",
                              color: "#0a0a12",
                              fontSize: "11px",
                              fontWeight: 800,
                              lineHeight: 1,
                            }}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                          {mod.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div ref={presetAnchorRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setPresetSheetOpen((v) => !v)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "#c0c8d8",
                    padding: "6px 42px",
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
                </button>
                {presetSheetOpen && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "rgba(14,16,24,0.98)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                      boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
                      width: "340px",
                      maxHeight: "440px",
                      display: "flex",
                      flexDirection: "column",
                      zIndex: 30,
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                    }}
                  >
                    {/* Fixed header with title + close X */}
                    <div
                      style={{
                        padding: "12px 14px 10px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "10px",
                        flexShrink: 0,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                            marginBottom: "2px",
                          }}
                        >
                          Preset Scenarios
                        </div>
                        <div
                          style={{
                            color: "#7d8ba8",
                            fontSize: "11px",
                            lineHeight: 1.35,
                          }}
                        >
                          Pick one to load it into the input.
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPresetSheetOpen(false);
                        }}
                        aria-label="Close"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#7d8ba8",
                          fontFamily: fontStack,
                          fontSize: "12px",
                          cursor: "pointer",
                          padding: 0,
                          lineHeight: 1,
                          marginTop: "2px",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    {/* Scrollable list */}
                    <div
                      className="thin-scroll"
                      style={{
                        padding: "6px 6px 8px",
                        overflowY: "auto",
                        flex: 1,
                      }}
                    >
                      {EXAMPLE_SCENARIOS.map((scenario) => (
                        <button
                          key={scenario}
                          onClick={() => {
                            setInputText(scenario);
                            setPresetSheetOpen(false);
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            color: "#e0e6ef",
                            padding: "8px 12px",
                            fontFamily: fontStack,
                            fontSize: "13px",
                            fontWeight: 500,
                            cursor: "pointer",
                            textAlign: "left",
                            borderRadius: "5px",
                            lineHeight: 1.35,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {scenario}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DELETED: Preset Scenarios side sheet — replaced by the
          inline popover above the Browse Preset button. */}
      {false && presetSheetOpen && (
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
