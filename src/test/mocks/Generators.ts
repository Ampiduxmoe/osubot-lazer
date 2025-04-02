import {OsuUserInfo} from '../../main/data/http/boundary/OsuUserInfo';
import {OsuUserRecentScoreInfo} from '../../main/data/http/boundary/OsuUserRecentScoreInfo';
import {OsuUserBestScoreInfo} from '../../main/data/http/boundary/OsuUserBestScoreInfo';
import {minBy} from '../../main/primitives/Arrays';
import {ModAcronym} from '../../main/primitives/ModAcronym';
import {OsuRuleset} from '../../main/primitives/OsuRuleset';

const modCombos = [
  '',
  'HD',
  'HDHR',
  'DT',
  'HDDT',
  'DTHR',
  'HDDTHR',
  'NF',
  'NFSO',
];
const ranks: ('XH' | 'X' | 'SH' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F')[] = [
  'XH',
  'X',
  'SH',
  'S',
  'A',
  'B',
  'C',
  'D',
  'F',
];
const beatmapStatuses: (
  | 'graveyard'
  | 'wip'
  | 'pending'
  | 'ranked'
  | 'approved'
  | 'qualified'
  | 'loved'
)[] = [
  'graveyard',
  'wip',
  'pending',
  'ranked',
  'approved',
  'qualified',
  'loved',
];
const diffnames = ['Easy', 'Normal', 'Hard', 'Insane', 'Extra', 'Extreme'];

export function getFakeOsuUserUsername(osuId: number): string | undefined {
  if (osuId < 0 || isNaN(osuId) || !isFinite(osuId)) {
    return undefined;
  }
  return `FakeUsername${osuId}`;
}

export function getFakeOsuUserId(username: string): number | undefined {
  const id = parseInt(username.toLowerCase().replace('fakeusername', ''));
  if (isNaN(id)) {
    return undefined;
  }
  return id;
}

export function getFakeOsuUserInfo(
  osuId: number,
  ruleset: OsuRuleset | undefined
): OsuUserInfo | undefined {
  const username = getFakeOsuUserUsername(osuId);
  if (username === undefined) {
    return undefined;
  }
  const rulesetFavoriteNumbers: Record<OsuRuleset, number> = {
    [OsuRuleset.osu]: 2,
    [OsuRuleset.taiko]: 4,
    [OsuRuleset.ctb]: 6,
    [OsuRuleset.mania]: 8,
  };
  const lastOsuIdDigit = osuId % 10;
  const preferredMode = minBy(
    ruleset => 1 - Math.abs(lastOsuIdDigit - rulesetFavoriteNumbers[ruleset]),
    Object.keys(rulesetFavoriteNumbers).map(x => Number(x)) as OsuRuleset[]
  )!;
  const rulesetFavoriteNumber =
    rulesetFavoriteNumbers[ruleset ?? preferredMode];
  const rulesetProficiencyFactor =
    1 - Math.abs(lastOsuIdDigit - rulesetFavoriteNumber) / 10;
  return {
    id: osuId,
    username: username,
    preferredMode: preferredMode,
    countryCode: 'FAKE',
    rankGlobal: (osuId * 100) / rulesetProficiencyFactor,
    rankGlobalHighest: {
      value: (osuId * 50) / rulesetProficiencyFactor,
      date: '1970-01-01T00:00:00.000Z',
    },
    rankCountry: (osuId * 10) / rulesetProficiencyFactor,
    playcount: osuId * 1000 * rulesetProficiencyFactor,
    level: 100 * rulesetProficiencyFactor,
    playtime: osuId * 100000 * rulesetProficiencyFactor,
    pp: Math.max(0, 25000 - (osuId * 100) / rulesetProficiencyFactor),
    accuracy: rulesetProficiencyFactor,
  };
}

export function getFakeRecentScoreInfos(
  osuId: number,
  ruleset: OsuRuleset | undefined
): OsuUserRecentScoreInfo[] {
  const user = getFakeOsuUserInfo(osuId, ruleset);
  if (user === undefined) {
    return [];
  }
  const rulesetFavoriteNumber = {
    [OsuRuleset.osu]: 2,
    [OsuRuleset.taiko]: 4,
    [OsuRuleset.ctb]: 6,
    [OsuRuleset.mania]: 8,
  }[ruleset ?? user.preferredMode];
  const lastOsuIdDigit = osuId % 10;
  const rulesetProficiencyFactor =
    1 - Math.abs(lastOsuIdDigit - rulesetFavoriteNumber) / 10;
  return [...Array(10).keys()].map(i => {
    const scoreId = osuId * 1000 + i;
    return {
      id: scoreId,
      userId: osuId,
      mods:
        modCombos[scoreId % modCombos.length]
          .match(/.{2}/g)
          ?.flat()
          ?.map(m => ({acronym: new ModAcronym(m)})) ?? [],
      maximumStatistics: {
        great: 1000,
        perfect: 1001,
        legacyComboIncrease: 1002,
        ignoreHit: 1003,
        largeBonus: 1004,
        smallBonus: 1005,
        largeTickHit: 1006,
        smallTickHit: 1007,
        sliderTailHit: 1008,
      },
      statistics: {
        great: 30 * i,
        ok: 10 * i,
        meh: 2 * i,
        miss: i + 1,
        largeTickHit: 25 * i,
        smallTickHit: 45 * i,
        smallTickMiss: 5 * i,
        perfect: 40 * i,
        good: 20 * i,
      },
      rank: ranks[scoreId % ranks.length],
      accuracy: (scoreId / (scoreId + 50)) * rulesetProficiencyFactor,
      startedAt: '1970-01-01T00:00:00.000Z',
      endedAt: '1970-01-01T00:05:00.000Z',
      isPerfectCombo: scoreId % 10 === 0,
      maxCombo: 100 * i * rulesetProficiencyFactor,
      passed: ranks[scoreId % ranks.length] === 'F',
      pp: 100 * i - 80,
      totalScore: 100 * scoreId,
      beatmap: {
        id: scoreId - 100 - i,
        userId: osuId - i,
        version: diffnames[scoreId % diffnames.length],
        totalLength: Math.floor((scoreId + 40) / 5),
        hitLength: Math.floor(scoreId / 5),
        difficultyRating: 8.1 - i / 13,
        bpm: 241 - 4 * i,
        ar: 10 - i / 12,
        cs: 7 - i / 11,
        od: 10 - i / 9,
        hp: 10 - i / 8,
        countCircles: 35 * i,
        countSliders: 3 * i,
        countSpinners: i,
        url: 'google.com',
      },
      beatmapset: {
        id: scoreId - 123 - 7 * i,
        userId: osuId + i,
        creator: getFakeOsuUserUsername(osuId + i)!,
        artist: 'Artistname' + i,
        title: 'Songtitle' + i,
        coverUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        status: beatmapStatuses[i % beatmapStatuses.length],
      },
      user: {
        id: osuId,
        username: user.username,
      },
    };
  });
}

export function getFakeUserBestScoreInfos(
  osuId: number,
  ruleset: OsuRuleset | undefined
): OsuUserBestScoreInfo[] {
  const user = getFakeOsuUserInfo(osuId, ruleset);
  if (user === undefined) {
    return [];
  }
  const passRanks = ranks.filter(r => r !== 'F');
  const rulesetFavoriteNumber = {
    [OsuRuleset.osu]: 2,
    [OsuRuleset.taiko]: 4,
    [OsuRuleset.ctb]: 6,
    [OsuRuleset.mania]: 8,
  }[ruleset ?? user.preferredMode];
  const lastOsuIdDigit = osuId % 10;
  const rulesetProficiencyFactor =
    1 - Math.abs(lastOsuIdDigit - rulesetFavoriteNumber) / 10;
  return [...Array(10).keys()].map(i => {
    const scoreId = osuId * 1000 + i;
    return {
      id: scoreId,
      userId: osuId,
      mods:
        modCombos[scoreId % modCombos.length]
          .match(/.{2}/g)
          ?.flat()
          ?.map(m => ({acronym: new ModAcronym(m)})) ?? [],
      maximumStatistics: {
        great: 1000,
        perfect: 1001,
        legacyComboIncrease: 1002,
        ignoreHit: 1003,
        largeBonus: 1004,
        smallBonus: 1005,
        largeTickHit: 1006,
        smallTickHit: 1007,
        sliderTailHit: 1008,
      },
      statistics: {
        great: 30 * i,
        ok: 10 * i,
        meh: 2 * i,
        miss: i + 1,
        largeTickHit: 25 * i,
        smallTickHit: 45 * i,
        smallTickMiss: 5 * i,
        perfect: 40 * i,
        good: 20 * i,
      },
      rank: passRanks[scoreId % passRanks.length],
      accuracy: (scoreId / (scoreId + 50)) * rulesetProficiencyFactor,
      startedAt: '1970-01-01T00:00:00.000Z',
      endedAt: '1970-01-01T00:05:00.000Z',
      isPerfectCombo: scoreId % 10 === 0,
      maxCombo: 100 * i * rulesetProficiencyFactor,
      passed: true,
      pp: 100 * i - 80,
      totalScore: 100 * scoreId,
      beatmap: {
        id: scoreId - 100 - i,
        userId: osuId - i,
        version: diffnames[scoreId % diffnames.length],
        totalLength: Math.floor((scoreId + 40) / 5),
        hitLength: Math.floor(scoreId / 5),
        difficultyRating: 8.1 - i / 13,
        bpm: 241 - 4 * i,
        ar: 10 - i / 12,
        cs: 7 - i / 11,
        od: 10 - i / 9,
        hp: 10 - i / 8,
        countCircles: 35 * i,
        countSliders: 3 * i,
        countSpinners: i,
        url: 'google.com',
      },
      beatmapset: {
        id: scoreId - 123 - 7 * i,
        userId: osuId + i,
        creator: getFakeOsuUserUsername(osuId + i)!,
        artist: 'Artistname' + i,
        title: 'Songtitle' + i,
        coverUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        status: beatmapStatuses[i % beatmapStatuses.length],
      },
      user: {
        id: osuId,
        username: user.username,
      },
    };
  });
}
