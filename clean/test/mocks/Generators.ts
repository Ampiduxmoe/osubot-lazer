import {RecentScoreInfo} from '../../src/main/data/raw/http/boundary/RecentScoreInfo';

export function getFakeOsuUserUsername(osuId: number) {
  return `FakeUsername${osuId}`;
}

export function getFakeRecentScoreInfos(osuId: number): RecentScoreInfo[] {
  const modCombos = [
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
  return [...Array(10).keys()].map(i => {
    const scoreId = osuId * 1000 + i;
    return {
      id: scoreId,
      userId: osuId,
      mods: modCombos[scoreId % modCombos.length]
        .match(/.{2}/g)!
        .flat()
        .map(m => ({acronym: m})),
      statistics: {
        great: 30 * i,
        ok: 10 * i,
        meh: 2 * i,
        miss: i + 1,
      },
      rank: ranks[scoreId % ranks.length],
      accuracy: scoreId / (scoreId + 50),
      startedAt: '1970-01-01T00:00:00.000Z',
      endedAt: '1970-01-01T00:05:00.000Z',
      isPerfectCombo: scoreId % 10 === 0,
      maxCombo: 100 * i,
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
        userId: osuId - i,
        creator: getFakeOsuUserUsername(osuId - i),
        artist: 'Artistname' + i,
        title: 'Songtitle' + i,
        coverUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        status: beatmapStatuses[i % beatmapStatuses.length],
      },
      user: {
        id: osuId,
        username: getFakeOsuUserUsername(osuId),
      },
    };
  });
}
