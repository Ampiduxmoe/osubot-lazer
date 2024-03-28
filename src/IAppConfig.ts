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
    score_simulation_endpoint: string;
  };
}

export interface IVkGroup {
  id: number;
  token: string;
  owner: number;
}
