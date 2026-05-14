/**
 * Wakfu Anm2 Engine – Faithful JS port of the decompiled Java code.
 *
 * Sources ported:
 *   ExtendedDataInputStream  → BinaryReader (LITTLE-ENDIAN, null-terminated strings)
 *   AnmHeader                → parseHeader
 *   AnmIndex                 → parseAnmIndex
 *   AnmShapeDefinition       → parseShapes
 *   AnmTransformDataTable    → parseTransformDataTable
 *   SpriteDefinition.*       → parseSpriteDefinitions (types 1-4)
 *   AnmFrameData             → AnmFrameData class
 *   AnmFrameProcessor        → processFrameEntry (bitmask dispatch)
 *   AnmTransform             → AnmTransform class
 *   AnmInstance.processFrame → AnmEngine.processFrame (recursive)
 */

'use strict';

// ──── Java String.hashCode() ────────────────────────────────────────────────
function javaHashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++)
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

// ──── Color slot constants (matching the game client custom color indices) ───
const ANM_COLOR_SLOT = {
  NONE: 0,
  SKIN: 1,
  HAIR: 2,
  SYMBOL_BG: 3,
  SYMBOL_FG: 4,
  SYMBOL_BORDER: 5,
  COLOR_1: 6,
  COLOR_2: 7,
  PUPIL: 8,
  CLOTHES: 9,
};
window.ANM_COLOR_SLOT = ANM_COLOR_SLOT;

// Part groups mirrored from AnmPartHelper in the Wakfu client.
const ANM_PART_GROUPS = Object.freeze({
  CHEVEUXCUSTOM: Object.freeze([
    'Barbe', 'Chapeau', 'CheveuxBas', 'CheveuxHaut', 'CheveuxArriere',
    'CheveuxNatteBasse', 'CheuveuxNatteHaute', 'Oei02', 'Oeil01', 'Oeil02',
    'Oeil03', 'Oeil04', 'Oeil05', 'Oeil06', 'Oeil07', 'Oeil08', 'Oeil09',
    'Oeil10', 'Oeil11', 'Oeil12', 'Oeil13', 'Oeil14', 'Oeil15', 'Oeil16',
    'Pupille01', 'Pupille02', 'Pupille03', 'Sourcil01', 'Sourcil02',
    'Sourcil03', 'Crane', 'Oreille', 'BassinPeau', 'BrasPeau', 'EpaulePeau',
    'JambePeau', 'PiedPeau01', 'PiedPeau02', 'TroncPeau', 'Nez02Peau',
    'CorpsPeau', 'CuissePeau', 'Main_01', 'Main_02', 'Main_03', 'Main_04',
    'Main_05', 'Main_Doigt_01', 'Main_Doigt_02', 'Main_Doigt_03',
    'Main_doigt_04', 'Main_doigt_05', 'Main_doigt_06', 'Main_doigt_07',
    'Main_doigt_08', 'Main_doigt_09', 'Main_doigt_10', 'Main_doigt_11',
    'Main_doigt_12', 'Main_doigt_13', 'Main_Paume_01', 'Main_Paume_02',
    'Main_Paume_03', 'Main_Paume_04', 'Main_Paume_05', 'Main_pouce_01',
    'Main_pouce_02', 'Main_pouce_03', 'Main_pouce_04', 'Main_pouce_05',
    'Main_pouce_06', 'Main_pouce_07', 'Main_pouce_08', 'Main_pouce_09',
    'Main_pouce_10', 'Main_pouce_11', 'Main_pouce_12', 'Main_pouce_13',
    'Main_pouce_14',
  ]),
  VETEMENTCUSTOM: Object.freeze([
    'EliatropeCoiffeBas', 'EliatropeCoiffeHaut', 'Barbe', 'CuisseHabit',
    'JambeHabit', 'PiedHabit01', 'PiedHabit02', 'Chapeau', 'Epaulette-D',
    'Epaulette-G', 'CorpsHabit', 'BrasVetement', 'EpauleVetement',
    'TroncVetement', 'Jupe2Vetement', 'JupeVetement', 'CorpsVetement',
    'BassinVetement', 'CuisseVetement', 'JambeVetement', 'Cape', 'CapeBas',
    'CheveuxBas',
  ]),
});

function normalizePartSelection(partsOrGroup) {
  if (!partsOrGroup) return null;
  const partNames = Array.isArray(partsOrGroup)
    ? partsOrGroup
    : (ANM_PART_GROUPS[partsOrGroup] || [partsOrGroup]);
  return new Set(partNames.map(name => javaHashCode(name)));
}

function isFlippableAnimationDefinitionName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.indexOf('_Anim') !== 1) return false;
  const direction = name.charAt(0);
  return direction === '3' || direction === '4' || direction === '7';
}

// ──── BinaryReader (LITTLE-ENDIAN, null-terminated strings) ──────────────────
class BinaryReader {
  constructor(buffer) { this.v = new DataView(buffer); this.pos = 0; }
  readI8()  { return this.v.getInt8(this.pos++); }
  readU8()  { return this.v.getUint8(this.pos++); }
  readI16() { const v = this.v.getInt16(this.pos, true); this.pos += 2; return v; }
  readU16() { const v = this.v.getUint16(this.pos, true); this.pos += 2; return v; }
  readI32() { const v = this.v.getInt32(this.pos, true); this.pos += 4; return v; }
  readF32() { const v = this.v.getFloat32(this.pos, true); this.pos += 4; return v; }
  /** Null-terminated UTF-8 string (matches ExtendedDataInputStream.readString) */
  readStr() {
    const bytes = new Uint8Array(this.v.buffer);
    let end = this.pos;
    while (end < bytes.length && bytes[end] !== 0) end++;
    const str = new TextDecoder().decode(bytes.slice(this.pos, end));
    this.pos = end + 1;
    return str;
  }
  readI16s(n)  { const a = new Int16Array(n);   for (let i=0;i<n;i++) a[i]=this.readI16();  return a; }
  readI32s(n)  { const a = new Int32Array(n);   for (let i=0;i<n;i++) a[i]=this.readI32();  return a; }
  readF32s(n)  { const a = new Float32Array(n); for (let i=0;i<n;i++) a[i]=this.readF32();  return a; }
  readU8s(n)   { const a = new Uint8Array(n);   for (let i=0;i<n;i++) a[i]=this.readU8();   return a; }
  skip(n)      { this.pos += n; }
  get eof()    { return this.pos >= this.v.buffer.byteLength; }
}

// ──── AnmTransform ──────────────────────────────────────────────────────────
class AnmTransform {
  constructor() { this.reset(); }
  reset() {
    this.rx0 = 1; this.ry0 = 0; this.rx1 = 0; this.ry1 = 1; // rotation/skew matrix
    this.tx = 0;  this.ty = 0;                                // translation
    this.rotId = true;  this.transId = true;                   // identity flags
    this.r = 1; this.g = 1; this.b = 1; this.a = 1;           // color
    this.colorIdx = 0;                                         // custom color slot
  }
}

// ──── AnmFrameData ──────────────────────────────────────────────────────────
class AnmFrameData {
  constructor(type, data) { this.type = type; this.data = data; this.cur = 0; }
  begin(offset) { this.cur = offset; }
  read() { return this.data[this.cur++]; }
  static create(r) {
    const type = r.readU8();
    const size = r.readI32();
    if (size === 0) return new AnmFrameData(type, []);
    switch (type) {
      case 1:  return new AnmFrameData(1, r.readU8s(size));
      case 2:  return new AnmFrameData(2, r.readU16 ? r.readI16s(size).map(v => v & 0xFFFF) : r.readI16s(size));
      case 4:  return new AnmFrameData(4, r.readI32s(size));
      default: return new AnmFrameData(type, []);
    }
  }
}
// Fix: for type 2 we need unsigned short values
AnmFrameData.create = function(r) {
  const type = r.readU8();
  const size = r.readI32();
  if (size === 0) return new AnmFrameData(type, new Uint8Array(0));
  let data;
  switch (type) {
    case 1: data = r.readU8s(size); break;
    case 2: {
      const raw = r.readI16s(size);
      data = new Uint16Array(raw.length);
      for (let i = 0; i < raw.length; i++) data[i] = raw[i] & 0xFFFF;
      break;
    }
    case 4: data = r.readI32s(size); break;
    default: data = new Uint8Array(0); break;
  }
  return new AnmFrameData(type, data);
};

// ──── AnmFrameProcessor (bitmask: 1=R, 2=T, 4=MultColor, 8=AddColor) ───────
const PROC_R = 1, PROC_T = 2, PROC_M = 4, PROC_A = 8;

function processFrameEntry(type, fd, table, parent, result) {
  // ── Color ──
  if ((type & PROC_A) && (type & PROC_M)) {
    // MultAdd
    const oA = fd.read(), oM = fd.read();
    const c = table.colors;
    result.r = parent.r * c[oM] + c[oA];
    result.g = parent.g * c[oM+1] + c[oA+1];
    result.b = parent.b * c[oM+2] + c[oA+2];
    result.a = parent.a * c[oM+3] + c[oA+3];
  } else if (type & PROC_A) {
    const o = fd.read();
    const c = table.colors;
    result.r = parent.r + c[o]; result.g = parent.g + c[o+1];
    result.b = parent.b + c[o+2]; result.a = parent.a + c[o+3];
  } else if (type & PROC_M) {
    const o = fd.read();
    const c = table.colors;
    result.r = parent.r * c[o]; result.g = parent.g * c[o+1];
    result.b = parent.b * c[o+2]; result.a = parent.a * c[o+3];
  } else {
    result.r = parent.r; result.g = parent.g; result.b = parent.b; result.a = parent.a;
  }

  // ── Rotation + Translation ──
  if ((type & PROC_R) && (type & PROC_T)) {
    const oR = fd.read(), oT = fd.read();
    const rot = table.rotations, tr = table.translations;
    const rx0 = rot[oR], ry0 = rot[oR+1], rx1 = rot[oR+2], ry1 = rot[oR+3];
    const ttx = tr[oT], tty = tr[oT+1];
    result.rotId = false;
    result.transId = false;
    if (parent.rotId) {
      result.rx0 = rx0; result.ry0 = ry0; result.rx1 = rx1; result.ry1 = ry1;
      result.tx = ttx + parent.tx; result.ty = tty + parent.ty;
    } else {
      result.rx0 = rx0*parent.rx0 + ry0*parent.rx1;
      result.ry0 = rx0*parent.ry0 + ry0*parent.ry1;
      result.rx1 = rx1*parent.rx0 + ry1*parent.rx1;
      result.ry1 = rx1*parent.ry0 + ry1*parent.ry1;
      result.tx = ttx*parent.rx0 + tty*parent.rx1 + parent.tx;
      result.ty = ttx*parent.ry0 + tty*parent.ry1 + parent.ty;
    }
  } else if (type & PROC_R) {
    const oR = fd.read();
    const rot = table.rotations;
    const rx0 = rot[oR], ry0 = rot[oR+1], rx1 = rot[oR+2], ry1 = rot[oR+3];
    result.rotId = false;
    if (parent.rotId) {
      result.rx0 = rx0; result.ry0 = ry0; result.rx1 = rx1; result.ry1 = ry1;
    } else {
      result.rx0 = rx0*parent.rx0 + ry0*parent.rx1;
      result.ry0 = rx0*parent.ry0 + ry0*parent.ry1;
      result.rx1 = rx1*parent.rx0 + ry1*parent.rx1;
      result.ry1 = rx1*parent.ry0 + ry1*parent.ry1;
    }
    result.transId = parent.transId; result.tx = parent.tx; result.ty = parent.ty;
  } else if (type & PROC_T) {
    const oT = fd.read();
    const tr = table.translations;
    const ttx = tr[oT], tty = tr[oT+1];
    result.transId = false;
    if (parent.rotId) {
      result.tx = ttx + parent.tx; result.ty = tty + parent.ty;
    } else {
      result.tx = ttx*parent.rx0 + tty*parent.rx1 + parent.tx;
      result.ty = ttx*parent.ry0 + tty*parent.ry1 + parent.ty;
    }
    result.rotId = parent.rotId; result.rx0 = parent.rx0; result.ry0 = parent.ry0;
    result.rx1 = parent.rx1; result.ry1 = parent.ry1;
  } else {
    result.rotId = parent.rotId; result.rx0 = parent.rx0; result.ry0 = parent.ry0;
    result.rx1 = parent.rx1; result.ry1 = parent.ry1;
    result.transId = parent.transId; result.tx = parent.tx; result.ty = parent.ty;
  }
}

// ──── Parsing ───────────────────────────────────────────────────────────────

function parseAnm(buffer) {
  const r = new BinaryReader(buffer);

  // ── Header (AnmHeader.load) ──
  const flags = r.readI8();
  r.readI16(); // reserved
  const frameRate = r.readU8() || 25;
  const useAtlas       = (flags & 1)  !== 0;
  const useLocalIndex  = (flags & 2)  !== 0;
  const optimized      = (flags & 8)  !== 0;
  const useTransIdx    = (flags & 16) !== 0;

  // ── AnmIndex ──
  let indexData = null;
  if (useLocalIndex) {
    indexData = parseAnmIndex(r);
  }

  // ── Texture reference ──
  const numTex = r.readU16();
  let textureName = null, textureCRC = 0;
  for (let i = 0; i < numTex; i++) {
    textureName = r.readStr();
    textureCRC  = r.readI32();
  }

  // ── Shape definitions (AnmShapeDefinition) ──
  const numShapes = r.readU16();
  const shapes = new Map();
  for (let i = 0; i < numShapes; i++) {
    const id     = r.readI16();
    const texIdx = r.readI16();
    const top    = r.readU16() / 65535.0;
    const left   = r.readU16() / 65535.0;
    const bottom = r.readU16() / 65535.0;
    const right  = r.readU16() / 65535.0;
    const w      = r.readI16();
    const h      = r.readI16();
    const offX   = r.readF32();
    const offY   = r.readF32();
    shapes.set(id, { id, texIdx, left, top, right, bottom, w, h, offX, offY });
  }

  // ── Transform data table ──
  let table = null;
  if (useTransIdx) {
    table = parseTransformDataTable(r);
  }

  // ── Sprite definitions ──
  const numSprites = r.readU16();
  const spritesById = new Map();
  const spritesByCRC = new Map();
  const useFlip = indexData ? ((indexData.flags & 0x10) === 0) : true;
  for (let i = 0; i < numSprites; i++) {
    const sd = parseSpriteDefinition(r, table);
    if (sd) {
      if (useFlip && isFlippableAnimationDefinitionName(sd.name)) {
        continue;
      }
      spritesById.set(sd.id, sd);
      if (sd.nameCRC !== 0) spritesByCRC.set(sd.nameCRC, sd);
    }
  }

  // ── Imports ──
  const importsById = new Map();
  if (!r.eof && r.pos + 2 <= r.v.buffer.byteLength) {
    try {
      const numImports = r.readU16();
      for (let i = 0; i < numImports; i++) {
        const impId = r.readI16();
        const impName = r.readStr();
        r.readI32();
        importsById.set(impId, {
          id: impId,
          name: impName,
          crc: javaHashCode(impName),
        });
      }
    } catch (e) { /* no imports */ }
  }

  return {
    frameRate, useAtlas, useLocalIndex, optimized, useTransIdx,
    index: indexData, textureName, textureCRC,
    shapes, table, spritesById, spritesByCRC, importsById,
    useFlip,
    scale: indexData?.scale ?? 1.0,
  };
}

function parseAnmIndex(r) {
  const flags = r.readU8();
  let scale = 1.0, renderRadius = 1.0;
  const fileNames = [];
  const hiddenParts = [];   // HiddingPart[] — base ANM only: (crcKey, crcToHide)
  const canHideParts = [];  // CanHidePart[] — equipment ANM only: (itemName, crcKey)
  const animRecords = [];

  if (flags & 0x01) scale = r.readF32();
  if (flags & 0x08) renderRadius = r.readF32();
  if (flags & 0x02) {
    const nf = r.readU16();
    for (let i = 0; i < nf; i++) fileNames.push(r.readStr());
  }
  if (flags & 0x04) {
    const np = r.readU8();
    for (let i = 0; i < np; i++) { hiddenParts.push({ crcKey: r.readI32(), crcToHide: r.readI32() }); }
  }
  if (flags & 0x40) {
    const np = r.readU8();
    for (let i = 0; i < np; i++) {
      const itemName = r.readStr();
      const crcKey   = r.readI32();
      canHideParts.push({ itemName, crcKey });
    }
  }
  if (flags & 0x80) {
    const ef = r.readI32();
    if (ef & 1) { const c = r.readU16(); r.skip(c * 5); }
    if (ef & 2) r.skip(12);
  }
  const nRecs = r.readU16();
  for (let i = 0; i < nRecs; i++) {
    const name = r.readStr();
    const crc  = r.readI32();
    const fileIndex = r.readI16();
    animRecords.push({ name, crc, fileIndex });
  }
  return { flags, scale, renderRadius, fileNames, hiddenParts, canHideParts, animRecords };
}

function parseTransformDataTable(r) {
  const nc = r.readI32(); const colors     = nc > 0 ? r.readF32s(nc) : new Float32Array(0);
  const nr = r.readI32(); const rotations  = nr > 0 ? r.readF32s(nr) : new Float32Array(0);
  const nt = r.readI32(); const translations = nt > 0 ? r.readF32s(nt) : new Float32Array(0);
  const na = r.readI32();
  // Read actions per-type (matching decompiled AnmAction subclasses)
  for (let i = 0; i < na; i++) {
    const aid = r.readU8(), pc = r.readU8();
    switch (aid) {
      case 1: r.readStr(); if (pc===2) r.readI8(); break;
      case 2: break;
      case 3: r.readStr(); break;
      case 4: {
        if (pc===0) break;
        const f=r.readStr();
        if (f==='#optimized') { const c=(pc-1)/2|0; for(let j=0;j<c;j++) r.readStr(); r.skip(c); }
        else { for (let j=1;j<pc;j++) r.readStr(); }
        break;
      }
      case 8: { const ic=(pc-1)/2|0; for(let j=0;j<ic;j++){r.readStr();r.readStr();} if(pc%2===1)r.readStr(); break; }
      case 9: r.readI32(); if(pc===3)r.skip(4); else if(pc===4)r.skip(6); break;
      case 10: r.readI8(); break;
      default: break;
    }
  }
  return { colors, rotations, translations };
}

function parseSpriteDefinition(r, table) {
  // SpriteDefinition.createFrom: read type byte, then dispatch
  const subType = r.readU8();

  // SpriteDefinition base (super.load)
  const id = r.readI16();
  const flags = r.readU8();
  const isLoop  = (flags & 0x80) !== 0;
  const hasName = (flags & 0x40) !== 0;
  const colorIndex = flags & 0x3F;
  let name = null, nameCRC = 0, baseNameCRC = 0;
  if (hasName) {
    name = r.readStr();
    nameCRC = javaHashCode(name);
    const underIdx = name.indexOf('_');
    baseNameCRC = (underIdx >= 0) ? javaHashCode(name.substring(underIdx + 1)) : nameCRC;
  }
  r.readI32(); r.readI32(); // 2 reserved ints

  const base = { subType, id, flags, isLoop, colorIndex, name, nameCRC, baseNameCRC };

  switch (subType) {
    case 1: return parseSingle(r, table, base);
    case 2: return parseSingleNoAction(r, table, base);
    case 3: return parseSingleFrame(r, table, base);
    case 4: return parseIndexed(r, table, base);
    default: console.warn(`Unknown sprite subType ${subType}`); return null;
  }
}

function parseSingle(r, table, base) {
  const spriteId = r.readI16();
  const actionCount = r.readU16();
  const actionInfo = actionCount > 0 ? r.readI16s(actionCount) : null;
  const frameData = AnmFrameData.create(r);
  return {
    ...base, type: 'single', spriteId, actionInfo, frameData,
    getFrameCount: () => 1,
    hasOnlyOneSprite: () => true,
    firstSpriteId: () => spriteId,
    beginProcessFrame(idx) { frameData.begin(0); return 1; },
    process(parent, result) {
      const t = frameData.read();
      processFrameEntry(t, frameData, table, parent, result);
      return spriteId;
    },
  };
}

function parseSingleNoAction(r, table, base) {
  const spriteId = r.readI16();
  const frameData = AnmFrameData.create(r);
  return {
    ...base, type: 'singleNoAction', spriteId, frameData,
    getFrameCount: () => 1,
    hasOnlyOneSprite: () => true,
    firstSpriteId: () => spriteId,
    beginProcessFrame(idx) { frameData.begin(0); return 1; },
    process(parent, result) {
      const t = frameData.read();
      processFrameEntry(t, frameData, table, parent, result);
      return spriteId;
    },
  };
}

function parseSingleFrame(r, table, base) {
  const spriteCount = r.readU16();
  const spriteIds = spriteCount > 0 ? r.readI16s(spriteCount) : new Int16Array(0);
  const actionCount = r.readU16();
  const actionInfo = actionCount > 0 ? r.readI16s(actionCount) : null;
  const frameData = AnmFrameData.create(r);
  let curSprite = -1;
  return {
    ...base, type: 'singleFrame', spriteIds, actionInfo, frameData,
    getFrameCount: () => 1,
    hasOnlyOneSprite: () => false,
    firstSpriteId: () => { throw new Error('singleFrame has no single sprite'); },
    beginProcessFrame(idx) { frameData.begin(0); curSprite = -1; return spriteIds.length; },
    nextSprite() { curSprite++; },
    process(parent, result) {
      const t = frameData.read();
      processFrameEntry(t, frameData, table, parent, result);
      return spriteIds[curSprite];
    },
  };
}

function parseIndexed(r, table, base) {
  const fpCount = r.readU16();
  const framePos = r.readI32s(fpCount);
  const siCount = r.readU16();
  const spriteInfo = r.readI16s(siCount);
  const aiCount = r.readU16();
  const actionInfo = aiCount > 0 ? r.readI16s(aiCount) : null;
  const frameData = AnmFrameData.create(r);

  const stride = actionInfo ? 3 : 2;
  let curSprite = -1;

  return {
    ...base, type: 'indexed', framePos, spriteInfo, actionInfo, frameData,
    getFrameCount: () => Math.floor(fpCount / stride),
    hasOnlyOneSprite: () => false,
    firstSpriteId: () => { throw new Error('indexed has no single sprite'); },
    beginProcessFrame(idx) {
      const i = idx * stride;
      frameData.begin(framePos[i]);
      curSprite = framePos[i + 1];
      return spriteInfo[curSprite];
    },
    nextSprite() { curSprite++; },
    process(parent, result) {
      const t = frameData.read();
      processFrameEntry(t, frameData, table, parent, result);
      return spriteInfo[curSprite];
    },
  };
}

// ──── AnmEngine (load + render) ─────────────────────────────────────────────
// Supports multiple layered .anm assets (base skin + equipment overlays).
// Each layer shares the same animation name (e.g. "5_AnimStatique") but
// resolves its own shapes against its own atlas.
class AnmEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.ctx.imageSmoothingEnabled = false;
    this.layers = [];          // [{id, anm, atlas}]
    this.anm = null;           // primary (first) layer convenience ref
    this.atlasImg = null;      // primary atlas convenience ref
    this.customColors = [];    // float[4][] indexed by slot
    this._transforms = [];     // pool of AnmTransform for nesting levels
    for (let i = 0; i < 64; i++) this._transforms.push(new AnmTransform());
    this._quads = [];          // collected quads per frame (shared across layers per render)
    this._baseLayer = null;
    this._equipOverrideMap = new Map();
    // Base-sprite suppression: set of baseNameCRCs whose sprites should be
    // skipped entirely during rendering (mimics HMI type-11 "SetPartVisible false"
    // actions — used e.g. for costumes that don't define CorpsHabit but need to
    // hide the base skin torso so it doesn't bleed through the costume seam).
    this._hiddenBaseNameCRCs = new Set();
    // Cache stable bounding boxes (computed across all frames) so the viewport
    // doesn't shake as the character animates.  Keyed by animName+layerIds.
    this._stableBoundsCache = new Map();
    // Tint cache: avoids running getImageData/putImageData every frame for the
    // same (atlas-region, color) tuple. Cleared on load/reload and color change.
    this._tintCache = new Map();
    this._tintCacheLimit = 512;
  }

  _isKnownArtifactShape(layerId, shapeId) {
    const artifactShapes = {
      // Thin stray strips present in specific Huppermage equipment overlays.
      // Filter only these exact quads so we keep the real asset pipeline intact.
      // -5268 is the curled teal strip emitted from 3_Chapeau; it renders
      // detached next to the face instead of as part of the hat.
      '211910100': new Set([-5268, -5230, -5224, -5214]),
      '211910101': new Set([-5398, -5401, -5283]),
    };
    return artifactShapes[layerId]?.has(shapeId) || false;
  }

  /** Layers: [{ id, anmPath, atlasPath }]. First layer is the primary base. */
  async load(layers) {
    // Default manifest for Huppermage female:
    //  - 191: base skin skeleton (full idle anims in-file)
    //  - 193: outfit skeleton/overlay (also has its own in-file anims)
    //  - 201910001: hair sprite library (imported via CRC from 191/193)
    //  - 211910100: outfit sprite library (imported via CRC)
    // Default manifest for Huppermage female:
    //  - 191: base skin skeleton (nude peach body)
    //  - 201910001 + 211910100: equipment libraries. Any named sprite they
    //    define overrides the same-named sprite in 191's skeleton, and renders
    //    from the equipment's own atlas.
    const manifest = Array.isArray(layers) && layers.length ? layers : [
      { id: '191',       anmPath: '191.anm',       atlasPath: 'hupper/191_0.png',        role: 'base' },
      { id: '211910100', anmPath: '211910100.anm', atlasPath: 'hupper/211910100_0.png',  role: 'equipment', partGroup: 'VETEMENTCUSTOM' },
      { id: '201910001', anmPath: '201910001.anm', atlasPath: 'hupper/201910001_0.png',  role: 'equipment', partGroup: 'CHEVEUXCUSTOM' },
    ];

    this.layers = [];
    this._stableBoundsCache.clear();
    if (this._tintCache) this._tintCache.clear();
    for (const spec of manifest) {
      try {
        const [buf, img] = await Promise.all([
          fetch(spec.anmPath).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} ${spec.anmPath}`); return r.arrayBuffer(); }),
          spec.atlasPath ? this._loadImage(spec.atlasPath) : Promise.resolve(null),
        ]);
        const anm = parseAnm(buf);
        const atlas = img;
        this.layers.push({
          id: spec.id,
          anm,
          atlas,
          role: spec.role || (this.layers.length === 0 ? 'base' : 'equipment'),
          allowedBaseNameCRCs: normalizePartSelection(spec.parts || spec.partGroup),
          suppressedBaseNameCRCs: spec.suppressedBaseNameCRCs || null,
          isCostume: spec.isCostume || false,
          preservePlayerHair: spec.preservePlayerHair || false,
        });
      } catch (err) {
        console.warn(`[AnmEngine] Failed to load layer "${spec.id}":`, err.message || err);
      }
    }

    if (!this.layers.length) {
      throw new Error('[AnmEngine] No layers loaded');
    }

    this.anm      = this.layers[0].anm;
    this.atlasImg = this.layers[0].atlas;
    this._rebuildEquipmentOverrides();

    if (this.anm.index) {
      const names = this.anm.index.animRecords.map(r => r.name);

    }
  }

  /**
   * Reload with a new layer manifest (outfit / hairstyle switch).
   * Clears the current layers then calls load(), preserving the canvas and
   * custom-color state so colours don't need to be re-applied.
   */
  async reload(layers) {
    this.layers = [];
    this.anm = null;
    this.atlasImg = null;
    this._equipOverrideMap.clear();
    this._stableBoundsCache.clear();
    if (this._tintCache) this._tintCache.clear();
    await this.load(layers);
  }

  _rebuildEquipmentOverrides() {
    this._equipOverrideMap.clear();
    this._hiddenBaseNameCRCs.clear();

    // ── Canonical hide-part computation (mirrors AnmInstance.updateHiddenParts) ──
    // 1. Base layer's ANM index carries HiddingPart[] = (crcKey, crcToHide).
    // 2. Each equipment ANM index carries CanHidePart[] = (itemName, crcKey).
    // 3. For every equipment sprite whose name CONTAINS one of its layer's
    //    CanHidePart.itemName tokens, that crcKey becomes "active".
    // 4. Every HiddingPart whose crcKey matches an active key contributes its
    //    crcToHide to the suppression set.
    // 5. The renderer skips any base sprite whose nameCRC is suppressed AND
    //    has no override.
    const baseLayer = this.layers.find(l => l.role === 'base');
    const baseHidding = baseLayer?.anm?.index?.hiddenParts || [];
    const activeCrcKeys = new Set();
    const overriddenBaseNameCRCs = new Set();

    // ── Per-layer CanHidePart resolution ──
    // The game keys CanHidePart entries to crcKey values baked inside each
    // equipment ANM (they are NOT derived from the itemName hash). For each
    // equipped layer we use ITS OWN canHideParts to match against ITS OWN
    // sprite names — exactly what AnmInstance.updateHiddenParts does.
    //
    // Fallback for costumes that ship a helmet but no canHideParts table
    // (~160 cosmetics that the original 3D engine covers via Z-order): if
    // the layer has zero canHide entries AND defines a helmet sprite, we
    // substitute AnmEngine.CANONICAL_CANHIDE_HELMET — a small set of helmet
    // tokens with the empirically-verified crcKey values from the canonical
    // costume corpus. Only this layer's sprites are tested against the
    // fallback, so the hair library and base outfit (which contain neither
    // helmet sprites nor canHide entries) remain untouched.
    const helmetBaseCRCs = AnmEngine._HELMET_BASENAME_CRCS;
    const layerHasHelmetSprite = (layer) => {
      // Only apply fallback to actual shared-costume layers (isCostume: true).
      // The base outfit library (211910100) and hair library (201910001) both
      // contain head-related sprites but must NEVER trigger the helmet fallback.
      if (!layer.isCostume) return false;
      for (const sprite of layer.anm.spritesById.values()) {
        if (sprite?.baseNameCRC && helmetBaseCRCs.has(sprite.baseNameCRC)) return true;
      }
      return false;
    };

    for (const layer of this.layers) {
      if (layer.role !== 'equipment') continue;

      // Per-layer suppression (UI override list, e.g. user toggled "hide helmet"):
      if (layer.hiddenBaseNameCRCs) {
        for (const crc of layer.hiddenBaseNameCRCs) this._hiddenBaseNameCRCs.add(crc);
      }

      // Pick the canHide table for this layer.
      let canHide = layer.anm?.index?.canHideParts || [];
      if (canHide.length === 0 && layerHasHelmetSprite(layer)) {
        canHide = AnmEngine.CANONICAL_CANHIDE_HELMET;
      }

      // Activate hide triggers by matching every sprite name in this layer
      // against ITS canHide table (game rule: substring contains, e.g.
      // "0_Chapeau02" contains "Chapeau").
      if (canHide.length) {
        for (const sprite of layer.anm.spritesById.values()) {
          const sname = sprite?.name;
          if (!sname) continue;
          for (const ch of canHide) {
            if (sname.indexOf(ch.itemName) !== -1) {
              activeCrcKeys.add(ch.crcKey);
            }
          }
        }
      }

      // Build the override map.
      for (const sprite of layer.anm.spritesById.values()) {
        if (!sprite?.name || !sprite.nameCRC) continue;
        if (layer.allowedBaseNameCRCs && !layer.allowedBaseNameCRCs.has(sprite.baseNameCRC)) {
          continue;
        }
        // Per-costume sprite suppression (e.g. user toggled "hide helmet" so
        // the costume's Chapeau / Chapeau02 sprites must not override the base).
        if (layer.suppressedBaseNameCRCs && sprite.baseNameCRC &&
            layer.suppressedBaseNameCRCs.has(sprite.baseNameCRC)) {
          // If the user is hiding this costume's helmet, retract the crcKey it
          // contributed so the base hair re-appears.
          for (const ch of canHide) {
            if (sprite.name.indexOf(ch.itemName) !== -1) {
              activeCrcKeys.delete(ch.crcKey);
            }
          }
          continue;
        }
        // Mirror applyParts(): later applications replace earlier ones on the same exact nameCRC.
        this._equipOverrideMap.set(sprite.nameCRC, { layer, sprite });
        if (layer.isCostume) overriddenBaseNameCRCs.add(sprite.baseNameCRC);
      }
    }

    // Apply HiddingPart rules: every base hidding entry whose crcKey was
    // activated by an equipped sprite contributes its crcToHide.
    if (activeCrcKeys.size && baseHidding.length) {
      for (const hp of baseHidding) {
        if (activeCrcKeys.has(hp.crcKey)) {
          this._hiddenBaseNameCRCs.add(hp.crcToHide);
        }
      }
    }

    // Auto-preserve player hair: if a hair CRC is hidden via HiddingPart cascade
    // but no costume provides a replacement sprite for it in the override map,
    // the hiding is unintentional (head accessory without its own hair sprites).
    // Undo it so the player's chosen hairstyle shows through.
    for (const crc of AnmEngine._HAIR_BASENAME_CRCS) {
      if (this._hiddenBaseNameCRCs.has(crc) && !overriddenBaseNameCRCs.has(crc)) {
        this._hiddenBaseNameCRCs.delete(crc);
      }
    }

    // If any costume layer explicitly requests preservePlayerHair (head accessory
    // that defines Cheveux sprites but shouldn't override the player's hair),
    // also undo any remaining hair hiding.
    if (this.layers.some(l => l.preservePlayerHair)) {
      for (const crc of AnmEngine._HAIR_BASENAME_CRCS) {
        this._hiddenBaseNameCRCs.delete(crc);
      }
    }

  }

  _loadImage(src) {
    // Normalize hostname so all image requests use the same origin as the page.
    // This prevents the 127.0.0.1 vs localhost cross-origin mismatch that
    // blocked CORS and tainted the canvas in _drawTinted (getImageData).
    const normalize = (url) => {
      try {
        const u = new URL(url, location.href);
        u.hostname = location.hostname;
        u.port     = location.port;
        return u.toString();
      } catch { return url; }
    };

    const withAssetVersion = (url) => {
      try {
        const u = new URL(url, location.href);
        u.searchParams.set('v', 'cc-assets-4');
        return u.toString();
      } catch {
        return url;
      }
    };

    const normBase = normalize(src);
    const norm = withAssetVersion(normBase);

    const load = (url) => new Promise((ok) => {
      const img = new Image();
      try {
        const u = new URL(url, location.href);
        if (u.origin !== location.origin) img.crossOrigin = 'anonymous';
      } catch {
        img.crossOrigin = 'anonymous';
      }
      img.onload  = () => ok(img);
      img.onerror = () => {
        console.warn('[AnmEngine] Failed image:', url);
        ok(null);
      };
      img.src = url;
    });

    return load(norm);
  }

  /**
   * Pre-scale an atlas image using repeated 2× bilinear steps up to `factor`.
   * Stepped scaling (2×, 2×, …) produces better quality than a single large
   * step because each pass operates on an already-smooth source.
   *
   * The effective GPU magnification from original atlas pixels to CSS pixels is:
   *   effective_mag = total_display_scale / factor
   * With factor=8 and total_display_scale≈16, effective_mag≈2 — near-lossless.
   *
   * Memory cap: if either dimension would exceed 4096px the factor is halved
   * until it fits, so very large source atlases don't OOM the GPU.
   */
  _upscaleAtlas(img, factor = 8) {
    // Clamp factor to power-of-2 that keeps output within GPU limits.
    let f = factor;
    while (f > 1 && (img.width * f > 4096 || img.height * f > 4096)) f >>= 1;
    if (f <= 1) return img;  // source already at or above limit

    const key = img.src + '@' + f;
    const cache = AnmEngine._atlasCache;
    if (cache.has(key)) return cache.get(key);

    // Stepped 2× upscaling: each pass is a high-quality 2× bilinear scale.
    let src = img;
    let steps = Math.round(Math.log2(f));
    for (let s = 0; s < steps; s++) {
      const c = document.createElement('canvas');
      c.width  = src.width  * 2;
      c.height = src.height * 2;
      const cx = c.getContext('2d');
      if (!cx) break;
      cx.imageSmoothingEnabled = true;
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(src, 0, 0, c.width, c.height);
      src = c;
    }
    cache.set(key, src);
    return src;
  }

  /** Find animation name from user-facing key + direction (0-7, isometric). */
  findAnim(key, direction) {
    const map = { idle: 'AnimStatique', walk: 'AnimMarche', run: 'AnimCourse' };
    const baseName = map[key] || 'AnimStatique';
    const dir = Number.isFinite(direction) ? ((direction % 8) + 8) % 8 : 5;
    return `${dir}_${baseName}`;
  }

  /** Get animation names from the index */
  getAnimationNames() {
    return this.anm?.index?.animRecords.map(r => r.name) || [];
  }

  /** Get frame count for a given animation name */
  getFrameCount(animName) {
    const sd = this._findSpriteDefForAnim(this._getFlippedAnimName(animName));
    if (!sd) return 1;
    let anim = sd;
    if (anim.hasOnlyOneSprite()) {
      const child = this.anm.spritesById.get(anim.firstSpriteId());
      if (child) anim = child;
    }
    return anim.getFrameCount();
  }

  /** Set custom color slot.
   *  Mirrors CharacterColor.getCustomColor() / ColorPartList.Data.getCustomColor():
   *  the game pre-brightens player colors by 1.25x before handing them to the ANM. */
  setColor(slot, hexOrNull) {
    if (!hexOrNull) {
      if (this.customColors[slot] !== null && this.customColors[slot] !== undefined) {
        if (this._tintCache) this._tintCache.clear();
      }
      this.customColors[slot] = null;
      return;
    }
    const hex = hexOrNull.replace('#', '');
    const cr = parseInt(hex.substring(0,2), 16) / 255;
    const cg = parseInt(hex.substring(2,4), 16) / 255;
    const cb = parseInt(hex.substring(4,6), 16) / 255;
    const next = [cr * 1.25, cg * 1.25, cb * 1.25, 1.0];
    const prev = this.customColors[slot];
    if (!prev || prev[0] !== next[0] || prev[1] !== next[1] || prev[2] !== next[2]) {
      if (this._tintCache) this._tintCache.clear();
    }
    this.customColors[slot] = next;
  }

  /**
   * Match AnmInstance.getFlippedAnimName from the decompiled client:
   * when the ANM index uses flip, west-side directions reuse the opposite
   * animation data and the root transform mirrors it horizontally.
   */
  _getFlippedAnimName(animName, anm = this.anm) {
    if (!animName || !anm?.useFlip) return animName;
    const direction = animName.charAt(0);
    if (direction === '4') return '0' + animName.substring(1);
    if (direction === '3') return '1' + animName.substring(1);
    if (direction === '7') return '5' + animName.substring(1);
    return animName;
  }

  _usesHorizontalFlip(animName, anm = this.anm) {
    return this._getFlippedAnimName(animName, anm) !== animName;
  }

  /** Find the SpriteDefinition for a given animation name in the primary .anm */
  _findSpriteDefForAnim(animName) {
    return this._findSpriteDefForAnimIn(this.anm, animName);
  }

  /** Find the SpriteDefinition for an animation name in a specific .anm */
  _findSpriteDefForAnimIn(anm, animName) {
    if (!anm) return null;
    if (anm.index) {
      const name = this._getFlippedAnimName(animName, anm);
      const rec = anm.index.animRecords.find(r => r.name === name);
      if (rec && rec.fileIndex === -1) {
        return anm.spritesByCRC.get(rec.crc);
      }
    }
    const crc = javaHashCode(this._getFlippedAnimName(animName, anm));
    return anm.spritesByCRC.get(crc);
  }

  /** Main render method – ports AnmInstance.update + processFrame
   *
   *  opts.loop  — force all animations to loop (default false; isLoop flag from ANM is used otherwise)
   */
  render(animName, timeMs, scale, cx, cy, opts = {}) {
    if (!this.layers.length) return;

    this._quads.length = 0;
    const rawFrame = Math.floor((this.anm?.frameRate || 25) * (timeMs / 1000));

    // Equipment layers provide named-sprite overrides (clothing/hair).
    // Animlib layers provide extra animation definitions (walk, run, emotes…).
    const baseLayer = this.layers.find(l => l.role === 'base') || this.layers[0];
    this._baseLayer = baseLayer;
    this._equipLayers = this.layers.filter(l => l.role === 'equipment');

    // Directions 3, 4, 7 are drawn by flipping directions 1, 0, 5 horizontally.
    const reqDir = animName.charAt(0);
    const flipH = this._usesHorizontalFlip(animName, baseLayer.anm);
    const lookupAnimName = this._getFlippedAnimName(animName, baseLayer.anm);

    // ── Animation lookup ────────────────────────────────────────────────────
    // 1. Try the base skeleton inline animations (idle is here).
    // 2. Search every 'animlib' layer (AnimCommunes, AnimEmotes*…).
    // 3. Fallback: emotes only exist in dirs 1 & 5; remap other dirs.
    let sd = null;
    let animSourceLayer = baseLayer;

    const _searchAnimlib = (name) => {
      for (const layer of this.layers) {
        if (layer.role !== 'animlib') continue;
        const found = this._findSpriteDefForAnimIn(layer.anm, name);
        if (found) return { sd: found, layer };
      }
      return null;
    };

    sd = this._findSpriteDefForAnimIn(baseLayer.anm, lookupAnimName);
    if (!sd) {
      const hit = _searchAnimlib(lookupAnimName);
      if (hit) { sd = hit.sd; animSourceLayer = hit.layer; }
    }

    // Direction fallback for emotes (only recorded for dirs 1 & 5).
    if (!sd) {
      for (const fallbackDir of ['1', '5']) {
        if (fallbackDir === reqDir) continue;
        const fallbackName = fallbackDir + lookupAnimName.substring(1);
        sd = this._findSpriteDefForAnimIn(baseLayer.anm, fallbackName);
        animSourceLayer = baseLayer;
        if (!sd) {
          const hit = _searchAnimlib(fallbackName);
          if (hit) { sd = hit.sd; animSourceLayer = hit.layer; }
        }
        if (sd) break;
      }
    }

    if (sd) {
      const anim = sd;
      let frameAnim = anim;
      if (frameAnim.hasOnlyOneSprite()) {
        const child = animSourceLayer.anm.spritesById.get(frameAnim.firstSpriteId());
        if (child) frameAnim = child;
      }

      const fc = frameAnim.getFrameCount();
      const forceLoop = opts.loop === true;
      const frameIndex = (forceLoop || frameAnim.isLoop)
        ? rawFrame % Math.max(fc, 1)
        : Math.min(rawFrame, fc - 1);

      const root = this._transforms[0];
      root.reset();
      if (flipH) {
        root.rx0 = -1;
        root.rotId = false;
      } else {
        root.rotId = true;
      }

      this._currentAtlas = animSourceLayer.atlas;
      this._currentLayerId = animSourceLayer.id;
      this._processFrame(frameIndex, anim, root, animSourceLayer.anm, 1);
      if (!this._quads.length && !this._warnedEmptyQuads) {
        this._warnedEmptyQuads = true;
        console.warn('[AnmEngine] Animation produced no quads:', animName, 'source:', animSourceLayer.id, 'frame:', frameIndex);
      }
    }

    // Use stable bounds (aggregate over all animation frames) so the viewport
    // doesn't shift with each pose.  Fall back to per-frame bounds if the
    // stable pass produced nothing (should never happen in practice).
    const stableBounds = sd
      ? this._computeStableBounds(lookupAnimName, sd, animSourceLayer, flipH)
      : null;
    if ((!this._quads.length || !this._quads.some(q => q.a > 0)) && this._stablePoseQuads?.length) {
      this._quads = this._stablePoseQuads.map(q => ({ ...q }));
    }

    const bounds = stableBounds || this._computeQuadBounds(this._quads);
    if (!bounds) {
      if (!this._warnedMissingBounds) {
        this._warnedMissingBounds = true;
        console.warn('[AnmEngine] Missing render bounds:', animName, 'quads:', this._quads.length);
      }
      return;
    }

    // Use base-only bounds (no equipment overrides) for scale and position so
    // tall costumes / weapons never shrink or shift the character body.
    // Compute once per base-layer configuration and cache; equipment changes
    // do not invalidate this cache because the key excludes equipment IDs.
    const baseOnlyCacheKey = lookupAnimName + '|flip=' + (flipH ? '1' : '0') + '|base|' +
      this.layers.filter(l => l.role !== 'equipment').map(l => l.id).join(',');
    let scaleSource = bounds;
    if (sd) {
      if (!this._stableBoundsCache.has(baseOnlyCacheKey)) {
        const savedOverrideMap   = this._equipOverrideMap;
        const savedHiddenCRCs    = this._hiddenBaseNameCRCs;
        this._equipOverrideMap   = new Map();
        this._hiddenBaseNameCRCs = new Set();
        const bb = this._computeStableBounds(lookupAnimName, sd, animSourceLayer, flipH, baseOnlyCacheKey);
        this._equipOverrideMap   = savedOverrideMap;
        this._hiddenBaseNameCRCs = savedHiddenCRCs;
        if (bb) scaleSource = bb;
      } else {
        scaleSource = this._stableBoundsCache.get(baseOnlyCacheKey) || bounds;
      }
    }

    // Scale from base-only bounds — character stays same size regardless of equipment.
    // Wide weapons / tall hats that exceed the viewport are clipped by overflow:hidden.
    const rawWidth  = Math.max(1, scaleSource.maxX - scaleSource.minX);
    const rawHeight = Math.max(1, scaleSource.maxY - scaleSource.minY);
    const scaleFactor = Number.isFinite(scale) && scale > 0 ? scale : 1.6;
    const relativeScale = scaleFactor / 1.6;
    const targetWidth  = this.canvas.width  * 0.72;
    const targetHeight = this.canvas.height * 0.82;
    const fittedScale = Math.max(
      0.01,
      Math.min(targetWidth / rawWidth, targetHeight / rawHeight) * relativeScale
    );
    // Center X on full bounds so weapon is as visible as possible before clipping.
    const offsetX = cx - ((bounds.minX + bounds.maxX) * 0.5) * fittedScale;
    const offsetY = cy - scaleSource.maxY * fittedScale;

    // Draw
    const ctx = this.ctx;
    // Do NOT clear here – piece_app drawShadow already clears
    for (const q of this._quads) {
      this._drawQuad(ctx, q, offsetX, offsetY, fittedScale);
    }
  }

  /** Look up an equipment sprite whose nameCRC matches the base sprite's nameCRC. */
  _findEquipmentOverride(nameCRC) {
    if (!nameCRC) return null;
    return this._equipOverrideMap.get(nameCRC) || null;
  }

  _processEquipmentOverride(baseSpriteDef, override, frameIndex, transform, level) {
    // Mirrors AnmInstance.processParts: keep the transform produced by the
    // base skeleton socket, then process the replacement sprite directly from
    // the equipment ANM. Do not run the replacement through _processSprite()
    // first; the Java client does not apply the replacement node's own
    // SpriteDefinition-level handling before descending into its frame data.
    if (baseSpriteDef.colorIndex > 0) {
      transform.colorIdx = baseSpriteDef.colorIndex;
    }
    const prevAtlas = this._currentAtlas;
    const prevLayerId = this._currentLayerId;
    this._currentAtlas = override.layer.atlas;
    this._currentLayerId = override.layer.id;
    this._processFrame(frameIndex, override.sprite, transform, override.layer.anm, level + 1);
    this._currentAtlas = prevAtlas;
    this._currentLayerId = prevLayerId;
  }

  /** Resolve an imported part like AnmInstance.attachImported:
   *  imported body parts are first resolved against the base actor by CRC.
   *  Normal PartsHelper replacement is then applied by _processSprite().
   */
  _resolveImportedPart(crc) {
    const sprite = this._baseLayer?.anm?.spritesByCRC.get(crc);
    if (sprite && this._baseLayer) {
      return { layer: this._baseLayer, sprite };
    }
    return null;
  }

  /** Recursive processFrame – ports AnmInstance.processFrame exactly */
  _processFrame(frameIndex, spriteDef, parentTransform, source, level) {
    const index = this._getRealFrameIndex(frameIndex, spriteDef);
    const spriteCount = spriteDef.beginProcessFrame(index);

    for (let i = 0; i < spriteCount; i++) {
      if (spriteDef.nextSprite) spriteDef.nextSprite();
      const transform = this._transforms[level] || (this._transforms[level] = new AnmTransform());
      transform.colorIdx = parentTransform.colorIdx;
      const spriteId = spriteDef.process(parentTransform, transform);

      if (transform.a === 0) continue;

      // Check imports (may resolve in another loaded .anm library)
      const imp = source.importsById.get(spriteId);
      if (imp) {
        const resolved = this._resolveImportedPart(imp.crc);
        if (resolved) {
          // Mirror AnmInstance.attachImported: the visibility check fires on
          // the resolved sprite's baseNameCRC BEFORE rendering. This is what
          // makes hair imports disappear when a helmet is equipped — the hair
          // sprite lives in 201910001 but is referenced from the base skeleton
          // via an import, so we must apply the same hide check here.
          const baseCRC = resolved.sprite.baseNameCRC;
          if (this._hiddenBaseNameCRCs.size > 0 && baseCRC && this._hiddenBaseNameCRCs.has(baseCRC)) {
            continue;
          }
          // Apply equipment override (same rule as for regular childDef sprites).
          // Animlib walk/emote animations reference body parts via imports; those
          // imports must honour the same PartsHelper override as the idle path.
          const impOverride = this._findEquipmentOverride(resolved.sprite.nameCRC);
          if (impOverride) {
            this._processEquipmentOverride(resolved.sprite, impOverride, frameIndex, transform, level);
          } else {
            const prevAtlas = this._currentAtlas;
            const prevLayerId = this._currentLayerId;
            this._currentAtlas = resolved.layer.atlas;
            this._currentLayerId = resolved.layer.id;
            this._processSprite(resolved.sprite, frameIndex, transform, resolved.layer.anm, level);
            this._currentAtlas = prevAtlas;
            this._currentLayerId = prevLayerId;
          }
        }
        continue;
      }

      // Child sprite definition?
      const childDef = source.spritesById.get(spriteId);
      if (childDef) {
        // Visibility check (mirrors AnmInstance.spriteDefinitionIsVisible):
        // applied BEFORE the override branch so a hidden baseNameCRC wins
        // even when a costume layer defines its own sprite for the same part.
        // This is what suppresses costume-defined hair when a sibling component
        // also defines a helmet that triggers the hide rule.
        if (this._hiddenBaseNameCRCs.size > 0 && childDef.baseNameCRC &&
            this._hiddenBaseNameCRCs.has(childDef.baseNameCRC)) {
          continue;
        }
        // Equipment override: if any equipment layer defines a sprite with
        // the same nameCRC, swap the base sprite for the equipment's and
        // render from the equipment's anm/atlas (PartsHelper.getDefinition).
        const override = this._findEquipmentOverride(childDef.nameCRC);
        if (override) {
          this._processEquipmentOverride(childDef, override, frameIndex, transform, level);
        } else {
          this._processSprite(childDef, frameIndex, transform, source, level);
        }
        continue;
      }

      // Shape definition (leaf) – emit a quad
      const shape = source.shapes.get(spriteId);
      if (shape) {
        this._emitQuad(shape, transform);
        continue;
      }

      // ── Animlib secondary lookup ────────────────────────────────────────
      // AnimCommunes / emote ANMs reference body-part sprite IDs from the base
      // skeleton's namespace directly by number.  When source=baseLayer.anm and
      // the ID is still missing here it must belong to the animlib's own local
      // sprites (e.g. a prop object like a book, a coin, a drink cup).
    }
  }

  _processSprite(spriteDef, frameIndex, transform, source, level) {
    // Determine the color index from the sprite's definition
    if (spriteDef.colorIndex > 0) {
      transform.colorIdx = spriteDef.colorIndex;
    }

    this._processFrame(frameIndex, spriteDef, transform, source, level + 1);
  }

  _getRealFrameIndex(frameIndex, spriteDef) {
    const fc = spriteDef.getFrameCount();
    if (fc === 0) return 0;
    if (frameIndex < fc) return frameIndex;
    if (spriteDef.isLoop) return frameIndex % fc;
    return fc - 1;
  }

  _emitQuad(shape, transform) {
    if (this._isKnownArtifactShape(this._currentLayerId, shape.id)) {
      return;
    }
    this._quads.push({
      shape,
      atlas: this._currentAtlas || this.atlasImg,
      rx0: transform.rx0, ry0: transform.ry0,
      rx1: transform.rx1, ry1: transform.ry1,
      tx: transform.tx,   ty: transform.ty,
      r: transform.r, g: transform.g, b: transform.b, a: transform.a,
      colorIdx: transform.colorIdx,
    });
  }

  /**
   * Compute (and cache) the aggregate bounding box for ALL frames of an
   * animation.  Using per-frame bounds causes the viewport to shake because
   * the camera anchor moves with every pose change.  A single stable box
   * derived from the full cycle keeps the character in a fixed position while
   * its parts animate freely.
   *
   * Cache key: animName + flip flag + joined layer ids.  Cleared by load().
   */
  _computeStableBounds(animName, spriteDef, animSourceLayer, flipH, forceCacheKey) {
    const cacheKey = forceCacheKey != null
      ? forceCacheKey
      : animName + '|flip=' + (flipH ? '1' : '0') + '|' + this.layers.map(l => l.id).join(',');
    if (this._stableBoundsCache.has(cacheKey)) {
      return this._stableBoundsCache.get(cacheKey);
    }

    const anim = spriteDef;
    let frameAnim = anim;
    if (frameAnim.hasOnlyOneSprite()) {
      const child = animSourceLayer.anm.spritesById.get(frameAnim.firstSpriteId());
      if (child) frameAnim = child;
    }
    const fc = Math.max(frameAnim.getFrameCount(), 1);

    // Save current root transform state to restore after the precompute pass.
    const savedRx0 = this._transforms[0].rx0;
    const savedRotId = this._transforms[0].rotId;
    const savedQuads = this._quads;
    const preQuads = [];
    this._quads = preQuads;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    let firstVisiblePose = null;
    for (let fi = 0; fi < fc; fi++) {
      preQuads.length = 0;
      const root = this._transforms[0];
      root.reset();
      if (flipH) { root.rx0 = -1; root.rotId = false; }
      else { root.rotId = true; }
      this._processFrame(fi, anim, root, animSourceLayer.anm, 1);
      if (!firstVisiblePose && preQuads.some(q => q.a > 0)) {
        firstVisiblePose = preQuads.map(q => ({ ...q }));
      }
      for (const q of preQuads) {
        const rect = this._computeQuadRect(q);
        if (!rect) continue;
        if (rect.minX < minX) minX = rect.minX;
        if (rect.minY < minY) minY = rect.minY;
        if (rect.maxX > maxX) maxX = rect.maxX;
        if (rect.maxY > maxY) maxY = rect.maxY;
      }
    }

    // Restore
    this._quads = savedQuads;
    this._transforms[0].rx0 = savedRx0;
    this._transforms[0].rotId = savedRotId;

    const stable = (Number.isFinite(minX) && Number.isFinite(maxX))
      ? { minX, minY, maxX, maxY }
      : null;
    this._stablePoseQuads = firstVisiblePose;
    this._stableBoundsCache.set(cacheKey, stable);
    return stable;
  }

  _computeQuadBounds(quads) {
    if (!quads.length) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const quad of quads) {
      const rect = this._computeQuadRect(quad);
      if (!rect) continue;
      if (rect.minX < minX) minX = rect.minX;
      if (rect.minY < minY) minY = rect.minY;
      if (rect.maxX > maxX) maxX = rect.maxX;
      if (rect.maxY > maxY) maxY = rect.maxY;
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null;
    }

    return { minX, minY, maxX, maxY };
  }

  _computeQuadRect(q) {
    const s = q.shape;
    if (!s) return null;

    const blX = s.offX * q.rx0 + s.offY * q.rx1 + q.tx;
    const blY = s.offX * (-q.ry0) + s.offY * (-q.ry1) - q.ty;
    const hx = q.rx1 * s.h;
    const hy = -q.ry1 * s.h;
    const wx = q.rx0 * s.w;
    const wy = -q.ry0 * s.w;
    const points = [
      [blX, -blY],
      [blX + hx, -blY - hy],
      [blX + hx + wx, -blY - hy - wy],
      [blX + wx, -blY - wy],
    ];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    return { minX, minY, maxX, maxY };
  }

  /** Draw a single quad – using canvas setTransform to map the affine matrix */
  _drawQuad(ctx, q, offsetX, offsetY, globalScale = 1) {
    const s = q.shape;
    const img = q.atlas || this.atlasImg;
    if (!img) return;

    const srcX = Math.round(s.left * img.width);
    const srcY = Math.round(s.top * img.height);
    const srcW = Math.round((s.right - s.left) * img.width);
    const srcH = Math.round((s.bottom - s.top) * img.height);
    if (srcW <= 0 || srcH <= 0) return;

    // The game uses: tx = offX*rx0 + offY*rx1 + transform.tx
    //                ty = offX*(-ry0) + offY*(-ry1) - transform.ty  (Y is flipped in game)
    // For canvas, we match line 686-691 of AnmInstance.java:
    const oX = s.offX, oY = s.offY;
    const blX = oX * q.rx0 + oY * q.rx1 + q.tx;
    const blY = oX * (-q.ry0) + oY * (-q.ry1) - q.ty;
    const hx = q.rx1 * s.h;
    const hy = -q.ry1 * s.h;
    const tlX = blX + hx;
    const tlY = blY + hy;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Alpha + clamp
    const alpha = Math.max(0, Math.min(1, q.a));
    ctx.globalAlpha = alpha;

    // Set the affine transform: the shape is drawn as a rectangle starting at (drawX, drawY)
    // with axes determined by the rotation/skew matrix
    // Matching the quad vertex computation from the game:
    //   v0 = (tx, ty)  = top-left of the SHAPE after transform
    //   The width/height vectors are: (rx0*w, -ry0*w) and (rx1*h, -ry1*h)
    ctx.setTransform(
      q.rx0 * globalScale,    // a: horizontal scaling
      q.ry0 * globalScale,    // b: vertical skewing
      -q.rx1 * globalScale,   // c: horizontal skewing
      -q.ry1 * globalScale,   // d: vertical scaling
      offsetX + tlX * globalScale,    // e: horizontal translation
      offsetY - tlY * globalScale     // f: vertical translation
    );

    // Check if custom color tinting is needed
    const colorSlot = q.colorIdx;
    const customColor = this.customColors[colorSlot];

    if (customColor) {
      // Tint by drawing to offscreen canvas
      this._drawTinted(ctx, img, srcX, srcY, srcW, srcH, s.w, s.h, customColor, q);
    } else {
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, s.w, s.h);
    }

    ctx.restore();
  }

  /** Draw tinted image using offscreen canvas */
  _drawTinted(ctx, img, sx, sy, sw, sh, dw, dh, color, q) {
    if (!this._tintCanvas) {
      this._tintCanvas = document.createElement('canvas');
      this._tintCtx = this._tintCanvas.getContext('2d', { willReadFrequently: true });
    }
    const tc = this._tintCanvas, tctx = this._tintCtx;
    if (tc.width < sw || tc.height < sh) {
      tc.width = Math.max(tc.width, sw);
      tc.height = Math.max(tc.height, sh);
    }
    tctx.clearRect(0, 0, sw, sh);
    tctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const imgData = tctx.getImageData(0, 0, sw, sh);
    const d = imgData.data;
    const cr = color[0], cg = color[1], cb = color[2];
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.min(255, d[i]   * cr * q.r * 2);
      d[i+1] = Math.min(255, d[i+1] * cg * q.g * 2);
      d[i+2] = Math.min(255, d[i+2] * cb * q.b * 2);
    }
    tctx.putImageData(imgData, 0, 0);
    ctx.drawImage(tc, 0, 0, sw, sh, 0, 0, dw, dh);
  }
}

// Replace the tint kernel to match the game's multiply-without-brightness-hack.
// The original had `* 2` which blows highlights; atlas already has baked default
// colors, so a pure multiply by the user's chosen color gives natural tinting.
//
// Cached: for each unique (atlas-image, srcRect, effective-color) we keep a
// pre-tinted offscreen <canvas>. Subsequent frames just blit it. This turns the
// per-frame O(pixels) JS loop into a Map lookup + drawImage, which is the main
// reason the GPU/CPU were saturating while playing animations.
AnmEngine.prototype._drawTinted = function(ctx, img, sx, sy, sw, sh, dw, dh, color, q) {
  // Effective tint multiplier (color * per-quad rgb). Quantize to 8-bit to
  // stabilise cache keys against tiny float drift. The factors live in 0..~1.25
  // so we encode them as integers in 0..255 (after clamp at 1.0 to keep the key
  // bounded; values >1.0 are rare and the original loop clamps the output too).
  const ecr = color[0] * q.r;
  const ecg = color[1] * q.g;
  const ecb = color[2] * q.b;
  const kr = Math.min(255, Math.round(ecr * 200));
  const kg = Math.min(255, Math.round(ecg * 200));
  const kb = Math.min(255, Math.round(ecb * 200));

  // Tag images on first sight so we don't have to stringify them.
  let imgId = img.__anmTintId;
  if (imgId === undefined) {
    imgId = (img.__anmTintId = ++AnmEngine._tintImgCounter);
  }
  const key = imgId + '|' + sx + ',' + sy + ',' + sw + ',' + sh + '|' + kr + ',' + kg + ',' + kb;

  const cache = this._tintCache;
  let tinted = cache.get(key);
  if (!tinted) {
    // LRU-ish eviction: when over budget, drop the oldest insertion.
    if (cache.size >= this._tintCacheLimit) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    tinted = document.createElement('canvas');
    tinted.width = sw;
    tinted.height = sh;
    const tctx = tinted.getContext('2d', { willReadFrequently: true });
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const imgData = tctx.getImageData(0, 0, sw, sh);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = Math.min(255, d[i]   * ecr);
      d[i+1] = Math.min(255, d[i+1] * ecg);
      d[i+2] = Math.min(255, d[i+2] * ecb);
    }
    tctx.putImageData(imgData, 0, 0);
    cache.set(key, tinted);
  }
  ctx.drawImage(tinted, 0, 0, sw, sh, 0, 0, dw, dh);
};
AnmEngine._tintImgCounter = 0;
AnmEngine._atlasCache = new Map(); // pre-upscaled atlas cache: src@factor → canvas

// ── Canonical helmet CanHidePart fallback ──
// Used ONLY when an equipped layer carries a Chapeau/Chapeau02/Tete sprite
// AND its ANM index ships zero canHideParts of its own (~160 costumes that
// the original 3D renderer covers via Z-order). The token is restricted to
// 'Chapeau' so the substring match cannot collide with hair/skin/face
// sprite names — it only fires on actual helmet sprites.
//
// Multiple crcKey variants for the same token reflect cohort differences in
// the canonical corpus (561 / 89 / 48 / 10 / 5 / 5 / 4 occurrences). We try
// every candidate; only the ones present in the base 191/193 HiddingPart
// table activate any hide, so the surplus values are harmless.
AnmEngine.CANONICAL_CANHIDE_HELMET = [
  { itemName: 'Chapeau', crcKey: -1654515265 },
  { itemName: 'Chapeau', crcKey:  -436344475 },
  { itemName: 'Chapeau', crcKey:   953062446 },
  { itemName: 'Chapeau', crcKey:  -354738728 },
  { itemName: 'Chapeau', crcKey: -2067022202 },
  { itemName: 'Chapeau', crcKey: -1260963098 },
  { itemName: 'Chapeau', crcKey:  1165037500 },
];

// Pre-hashed baseNameCRCs of the helmet sprite names, used to detect at
// _rebuildEquipmentOverrides time whether a layer carries a helmet sprite
// (gates the CANONICAL_CANHIDE_HELMET fallback).
AnmEngine._HELMET_BASENAME_CRCS = new Set([
  javaHashCode('Chapeau'),
  javaHashCode('Chapeau02'),
  javaHashCode('Tete'),
]);

// Pre-hashed baseNameCRCs of hair sprite names. Used by preservePlayerHair
// layers to undo HiddingPart cascade that would hide base hair sprites.
AnmEngine._HAIR_BASENAME_CRCS = new Set([
  javaHashCode('CheveuxHaut'),
  javaHashCode('CheveuxBas'),
  javaHashCode('CheveuxArriere'),
  javaHashCode('CheveuxNatteBasse'),
  javaHashCode('CheuveuxNatteHaute'),
  javaHashCode('Natte'),
]);

window.AnmEngine = AnmEngine;
