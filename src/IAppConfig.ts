export interface IAppConfig {
  osu: {
    oauth: {
      id: number;
      secret: string;
    };
  };
  vk: {
    group: IVkGroup;
    group_dev: IVkGroup;
  };
  bot: {
    score_simulation: {
      endpoint: string;
      default_timeout: number;
    };
  };
}

export interface IVkGroup {
  id: number;
  token: string;
  owner: number;
}
