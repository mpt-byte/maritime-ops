// Minimal AIS NMEA sentence parser (VDM/VDO types 1/2/3/4/5/18/19 + static).
// Handles the common position reports and type-5 static data reports enough
// to populate the schema. Not a full AIVDM decoder, but covers the data that
// AISstream.io and most NMEA feeds emit.

export interface DecodedPosition {
  mmsi: number;
  lon: number;
  lat: number;
  sog?: number;
  cog?: number;
  heading?: number;
  nav_status?: number;
  timestamp?: number;
}

export interface DecodedStatic {
  mmsi: number;
  imo?: number;
  name?: string;
  callsign?: string;
  ship_type?: number;
  destination?: string;
  draught?: number;
  eta?: number;
  length?: number;
  width?: number;
  flag?: string;
}

const AIS_CHAR_MAP = '0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVW`abcdefghijklmnopqrstuvw';

function bitsToInt(bits: string, start: number, length: number): number {
  let v = 0;
  for (let i = 0; i < length; i++) {
    v = (v << 1) | (bits.charCodeAt(start + i) === 49 ? 1 : 0);
  }
  return v;
}

function signedBitsToInt(bits: string, start: number, length: number): number {
  const v = bitsToInt(bits, start, length);
  const sign = 1 << (length - 1);
  if (v & sign) return v - (1 << length);
  return v;
}

function bitsToString(bits: string, start: number, length: number): string {
  const charCount = Math.floor(length / 6);
  let s = '';
  for (let i = 0; i < charCount; i++) {
    const code = bitsToInt(bits, start + i * 6, 6);
    if (code < 32) s += String.fromCharCode(code + 64);
    else s += String.fromCharCode(code);
  }
  return s.replace(/@+$/u, '').trim();
}

function sixBitToBits(payload: string): string {
  let bits = '';
  for (const ch of payload) {
    const idx = AIS_CHAR_MAP.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(6, '0');
  }
  return bits;
}

function parseLatLon(bits: string, latStart: number, lonStart: number) {
  const lonRaw = signedBitsToInt(bits, lonStart, 28);
  const latRaw = signedBitsToInt(bits, latStart, 27);
  const lon = lonRaw / 600000;
  const lat = latRaw / 600000;
  return { lat, lon };
}

export function decodePositionReport(payload: string, msgType: number): DecodedPosition | null {
  const bits = sixBitToBits(payload);
  if (bits.length < 100) return null;
  const type = msgType > 0 ? msgType : bitsToInt(bits, 0, 6);
  if (![1, 2, 3, 18, 19].includes(type)) return null;
  const mmsi = bitsToInt(bits, 8, 30);
  const { lat, lon } = parseLatLon(bits, 107, 79);
  const sog = bitsToInt(bits, 46, 10) / 10;
  const cog = bitsToInt(bits, 116, 12) / 10;
  const heading = bitsToInt(bits, 128, 9);
  const navStatus = type <= 3 ? bitsToInt(bits, 38, 4) : undefined;
  return {
    mmsi,
    lat,
    lon,
    sog,
    cog,
    heading: heading === 511 ? undefined : heading,
    nav_status: navStatus,
  };
}

export function decodeStaticReport(payload: string): DecodedStatic | null {
  const bits = sixBitToBits(payload);
  if (bits.length < 200) return null;
  const type = bitsToInt(bits, 0, 6);
  if (type !== 5 && type !== 24) return null;
  const mmsi = bitsToInt(bits, 8, 30);
  if (type === 5) {
    const imo = bitsToInt(bits, 40, 30);
    const name = bitsToString(bits, 143, 120);
    const shipType = bitsToInt(bits, 232, 8);
    const callsign = bitsToString(bits, 260, 42);
    const draught = bitsToInt(bits, 288, 8) / 10;
    const destination = bitsToString(bits, 302, 120);
    return {
      mmsi,
      imo: imo > 0 ? imo : undefined,
      name,
      callsign,
      ship_type: shipType,
      draught,
      destination,
    };
  }
  const name = bitsToString(bits, 40, 120);
  const shipType = bitsToInt(bits, 160, 8);
  const callsign = bitsToString(bits, 90, 42);
  return { mmsi, name, ship_type: shipType, callsign };
}

export function decodeNmeaVdmBody(sentence: string): string | null {
  const fields = sentence.split(',');
  if (fields.length < 6) return null;
  const tag = (fields[0] || '').trim();
  if (!/(VD[MO])$/i.test(tag)) return null;
  return fields[5] || null;
}
