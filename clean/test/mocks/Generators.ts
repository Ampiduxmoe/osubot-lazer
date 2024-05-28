import {OsuUserInfo} from '../../src/main/data/raw/http/boundary/OsuUserInfo';
import {RecentScoreInfo} from '../../src/main/data/raw/http/boundary/RecentScoreInfo';
import {minBy} from '../../src/primitives/Arrays';
import {OsuRuleset} from '../../src/primitives/OsuRuleset';

export function getFakeOsuUserUsername(osuId: number): string | undefined {
  if (osuId < 0 || isNaN(osuId) || !isFinite(osuId)) {
    return undefined;
  }
  return `FakeUsername${osuId}`;
}

export function getFakeOsuUserId(username: string) {
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
  ruleset: OsuRuleset
): RecentScoreInfo[] {
  const username = getFakeOsuUserUsername(osuId);
  if (username === undefined) {
    return [];
  }
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
  const ranks: ('SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F')[] = [
    'SS',
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
  const rulesetFavoriteNumber = {
    [OsuRuleset.osu]: 2,
    [OsuRuleset.taiko]: 4,
    [OsuRuleset.ctb]: 6,
    [OsuRuleset.mania]: 8,
  }[ruleset];
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
          ?.map(m => ({acronym: m})) ?? [],
      statistics: {
        great: 30 * i,
        ok: 10 * i,
        meh: 2 * i,
        miss: i + 1,
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
        username: username,
      },
    };
  });
}
