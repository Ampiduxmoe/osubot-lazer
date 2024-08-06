CREATE TABLE vk_beatmap_covers_tmp (server INTEGER, beatmapset_id INTEGER, attachment TEXT);
INSERT INTO vk_beatmap_covers_tmp (server, beatmapset_id, attachment) SELECT 0, beatmapset_Id, attachment FROM vk_beatmap_covers;
DROP TABLE vk_beatmap_covers;
ALTER TABLE vk_beatmap_covers_tmp RENAME TO vk_beatmap_covers;