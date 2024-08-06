CREATE TABLE IF NOT EXISTS vk_beatmap_covers (server INTEGER, beatmapset_id INTEGER, attachment TEXT);
ATTACH DATABASE 'osu.db' AS 'osu';
INSERT INTO vk_beatmap_covers (server, beatmapset_id, attachment) SELECT 0, beatmapset_Id, attachment FROM osu.bancho_covers;
DETACH DATABASE 'osu';