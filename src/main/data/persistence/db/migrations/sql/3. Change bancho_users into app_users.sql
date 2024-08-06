CREATE TABLE IF NOT EXISTS app_users (
  id TEXT,
  server INTEGER,
  osu_id INTEGER,
  username TEXT,
  ruleset INTEGER
);

INSERT INTO app_users (
  id,
  server,
  osu_id,
  username,
  ruleset
)
SELECT 
  'vk:'||vk_id,
  0,
  osu_id,
  username,
  mode
FROM bancho_users;