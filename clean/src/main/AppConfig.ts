export interface AppConfig {
  osu: {
    bancho: {
      oauth: BanchoOauthCredentials;
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
}

export interface VkGroup {
  id: number;
  token: string;
  owner: number;
}

export interface BanchoOauthCredentials {
  id: number;
  secret: string;
}
