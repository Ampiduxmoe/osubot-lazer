export type AppConfig = {
  osu: {
    bancho: {
      oauth: BanchoOauthCredentials;
      default_timeout: number;
    };
  };
  vk: {
    group: VkGroup;
    group_dev: VkGroup;
  };
  bot: {
    score_simulation: {
      endpoint_url: string;
      default_timeout: number;
    };
  };
};

export type VkGroup = {
  id: number;
  token: string;
  owner: number;
};

export type BanchoOauthCredentials = {
  id: number;
  secret: string;
};
