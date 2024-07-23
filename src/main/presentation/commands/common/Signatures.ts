import {OsuServer} from '../../../primitives/OsuServer';

export type GetInitiatorAppUserId<TContext> = (ctx: TContext) => string;

export type GetTargetAppUserId<TContext> = (
  ctx: TContext,
  options: {canTargetOthersAsNonAdmin: boolean}
) => string;

export type GetLastSeenBeatmapId<TContext> = (
  ctx: TContext,
  server: OsuServer
) => Promise<number | undefined>;

export type SaveLastSeenBeatmapId<TContext> = (
  ctx: TContext,
  server: OsuServer,
  beatmapId: number
) => Promise<void>;

export type GetLocalAppUserIds<TContext> = (ctx: TContext) => Promise<string[]>;
