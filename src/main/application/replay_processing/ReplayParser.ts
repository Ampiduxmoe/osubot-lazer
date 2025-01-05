import {ModAcronym} from '../../primitives/ModAcronym';
import {OsuRuleset} from '../../primitives/OsuRuleset';

const leb = require('leb');

export class ReplayParser {
  // https://osu.ppy.sh/wiki/en/Client/File_formats/osr_%28file_format%29
  rawData: Buffer;
  offset: number;
  constructor(replay: string | Buffer) {
    this.rawData = Buffer.isBuffer(replay) ? replay : Buffer.from(replay);
    this.offset = 0;
  }

  getReplayData(): ReplayData {
    const replay: Partial<ReplayData> = {};
    replay.mode = this.byte();
    replay.version = this.int();
    replay.beatmapHash = this.string();
    replay.playerName = this.string();
    replay.replayHash = this.string();

    replay.hitcounts = {
      c300: this.short(),
      c100: this.short(),
      c50: this.short(),
      geki: this.short(),
      katu: this.short(),
      miss: this.short(),
    };
    replay.accuracy = getAcc(replay.mode, replay.hitcounts);

    replay.score = this.int();
    replay.combo = this.short();
    replay.perfect = this.byte();

    replay.mods = getMods(this.int());

    replay.rawLifeBarData = this.string()
      .split(',')
      .map(pairStr => pairStr.split('|'))
      .map(([time, healthFraction]) => ({
        time: parseInt(time),
        healthFraction: parseFloat(healthFraction),
      }))
      .filter(
        ({time, healthFraction}) => !isNaN(time) && !isNaN(healthFraction)
      );
    replay.windowsTimestamp = this.long();
    replay.timestamp = Number(
      replay.windowsTimestamp / BigInt(10_000) - BigInt(62135596800000)
    );
    replay.onlineScoreId = this.int();
    replay.modsInfo = this.double();

    return replay as ReplayData;
  }

  byte(): number {
    const value = this.rawData.readInt8(this.offset);
    this.offset += 1;
    return value;
  }

  short(): number {
    const value = this.rawData.readInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  int(): number {
    const value = this.rawData.readInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  long(): bigint {
    const value = this.rawData.readBigInt64LE(this.offset);
    this.offset += 8;
    return value;
  }

  double(): number {
    const value = this.rawData.readDoubleLE(this.offset);
    this.offset += 8;
    return value;
  }

  uleb128(): number {
    const tmpBuffer = this.rawData.subarray(this.offset);
    const result = leb.decodeUInt64(tmpBuffer);
    const value = result.value;
    this.offset += result.nextIndex;
    return value;
  }

  string(): string {
    const stringType = this.byte();
    if (stringType === 0x00) {
      return '';
    }
    if (stringType === 0x0b) {
      const strLength = this.uleb128();
      const value = this.rawData
        .subarray(this.offset, this.offset + strLength)
        .toString('utf-8');
      this.offset += strLength;
      return value;
    }
    throw Error('Unknown string type');
  }
}

function getAcc(mode: number, hitcounts: ReplayDataHitcounts) {
  const {c300, c100, c50, miss, geki, katu} = hitcounts;
  if (mode === OsuRuleset.osu) {
    const nTotal = c300 + c100 + c50 + miss;
    return (6 * c300 + 2 * c100 + c50) / (6 * nTotal);
  }
  // since irrelevant fields should be 0 for non-std modes we can just sum it
  const nTotal = c300 + c100 + c50 + geki + katu + miss;
  if (mode === OsuRuleset.taiko) {
    return (2 * c300 + c100) / (2 * nTotal);
  }
  if (mode === OsuRuleset.ctb) {
    return (c300 + c100 + c50) / nTotal;
  }
  if (mode === OsuRuleset.mania) {
    return (
      (305 * geki + 300 * c300 + 200 * katu + 100 * c100 + 50 * c50) /
      (305 * nTotal)
    );
  }
  throw Error('Unknown mode');
}

const modBits = ModAcronym.createMany(
  ...['NF', 'EZ', 'TD', 'HD', 'HR'],
  ...['SD', 'DT', 'RX', 'HT', 'NC'],
  ...['FL', 'AT', 'SO', 'AP', 'PF'],
  ...['K4', 'K5', 'K6', 'K7', 'K8'],
  ...['FI', 'RN', 'CN', 'TP', 'K9'],
  ...['KX', 'K1', 'K3', 'K2', 'V2'],
  ...['MR']
).map((m, i) => ({acronym: m, value: 1 << i}));

function getMods(bits: number): ModAcronym[] {
  const mods: ModAcronym[] = [];
  for (let i = 0; i < 31; i++) {
    const modValue = 1 << i;
    if (bits & modValue) {
      const relevantModEntry = modBits[i];
      mods.push(relevantModEntry.acronym);
      if (modValue !== relevantModEntry.value) {
        throw Error('Mod bits mismatch');
      }
    }
  }
  return mods;
}

export type ReplayData = {
  mode: number;
  version: number;
  beatmapHash: string;
  playerName: string;
  replayHash: string;
  hitcounts: ReplayDataHitcounts;
  score: number;
  combo: number;
  perfect: number;
  accuracy: number;
  mods: ModAcronym[];
  rawLifeBarData: ReplayLifeBarDataPoint[];
  windowsTimestamp: bigint;
  timestamp: number;
  onlineScoreId: number;
  modsInfo: number;
};

export type ReplayDataHitcounts = {
  c300: number;
  c100: number;
  c50: number;
  miss: number;
  geki: number;
  katu: number;
};

export type ReplayLifeBarDataPoint = {
  time: number;
  healthFraction: number;
};
