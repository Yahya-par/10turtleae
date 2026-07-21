import fs from "fs";

const TARGET_NAMES = new Set(["carboady.001", "carbody.001"]);

function readGlb(modelPath) {
  const buf = fs.readFileSync(modelPath);
  if (buf.toString("utf8", 0, 4) !== "glTF") throw new Error("Not a GLB file");
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));
  let bin = Buffer.alloc(0);
  let o = 20 + jsonLen;
  if (o + 8 <= buf.length && buf.readUInt32LE(o + 4) === 0x004e4942) {
    const len = buf.readUInt32LE(o);
    bin = buf.slice(o + 8, o + 8 + len);
  }
  return { json, bin };
}

function readVec3Accessor(json, bin, accessorIndex) {
  const acc = json.accessors?.[accessorIndex];
  if (!acc || acc.type !== "VEC3") {
    throw new Error(`Accessor ${accessorIndex} is not VEC3`);
  }
  if (acc.componentType !== 5126) {
    if (acc.min && acc.max) {
      return { min: acc.min.slice(), max: acc.max.slice(), fromAccessorBounds: true };
    }
    throw new Error(`Unsupported componentType ${acc.componentType} on accessor ${accessorIndex}`);
  }
  const bv = json.bufferViews[acc.bufferView];
  const base = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const stride = bv.byteStride ?? 12;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < acc.count; i++) {
    const off = base + i * stride;
    const x = bin.readFloatLE(off);
    const y = bin.readFloatLE(off + 4);
    const z = bin.readFloatLE(off + 8);
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;
  }
  return { min, max, fromAccessorBounds: false };
}

function mergeBounds(a, b) {
  return {
    min: [
      Math.min(a.min[0], b.min[0]),
      Math.min(a.min[1], b.min[1]),
      Math.min(a.min[2], b.min[2]),
    ],
    max: [
      Math.max(a.max[0], b.max[0]),
      Math.max(a.max[1], b.max[1]),
      Math.max(a.max[2], b.max[2]),
    ],
  };
}

function nodeTransform(node) {
  const t = {
    name: node.name,
    translation: node.translation ?? [0, 0, 0],
    rotation: node.rotation ?? [0, 0, 0, 1],
    scale: node.scale ?? [1, 1, 1],
  };
  if (node.matrix) t.matrix = node.matrix;
  return t;
}

const modelPath = process.argv[2] ?? "public/Models/mymodel.glb";
const { json, bin } = readGlb(modelPath);

const nodeIndex = (json.nodes ?? []).findIndex((n) => TARGET_NAMES.has(n.name ?? ""));
if (nodeIndex < 0) {
  console.error(`No node named ${[...TARGET_NAMES].join(" or ")} found.`);
  console.error("Nodes containing car/body:");
  for (const n of json.nodes ?? []) {
    if (/car|body/i.test(n.name ?? "")) console.error(" ", n.name);
  }
  process.exit(1);
}

const node = json.nodes[nodeIndex];
const meshIndex = node.mesh;
if (meshIndex === undefined) {
  console.error(`Node "${node.name}" has no mesh.`);
  process.exit(1);
}

const mesh = json.meshes[meshIndex];
let bounds = null;
const primitiveInfo = [];

for (let pi = 0; pi < (mesh.primitives ?? []).length; pi++) {
  const prim = mesh.primitives[pi];
  const posIdx = prim.attributes?.POSITION;
  if (posIdx === undefined) continue;
  const b = readVec3Accessor(json, bin, posIdx);
  bounds = bounds ? mergeBounds(bounds, b) : b;
  primitiveInfo.push({ primitive: pi, positionAccessor: posIdx, usedAccessorMinMax: b.fromAccessorBounds });
}

if (!bounds) {
  console.error("Mesh has no POSITION attributes.");
  process.exit(1);
}

const size = [
  bounds.max[0] - bounds.min[0],
  bounds.max[1] - bounds.min[1],
  bounds.max[2] - bounds.min[2],
];

const fmt = (v) => v.map((n) => Number(n.toFixed(6)));

console.log(JSON.stringify({
  model: modelPath,
  nodeName: node.name,
  nodeIndex,
  meshIndex,
  primitives: primitiveInfo,
  localBoundingBox: {
    min: { x: bounds.min[0], y: bounds.min[1], z: bounds.min[2] },
    max: { x: bounds.max[0], y: bounds.max[1], z: bounds.max[2] },
    size: { x: size[0], y: size[1], z: size[2] },
  },
  localBoundingBoxFormatted: {
    min: fmt(bounds.min),
    max: fmt(bounds.max),
    size: fmt(size),
  },
  nodeTransform: nodeTransform(node),
}, null, 2));
