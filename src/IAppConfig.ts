export interface IAppConfig {
  osu: {
    oauth: {
      id: number;
      secret: string;
    };
  };
  vk: {
    group: {
      id: number;
      token: string;
      owner: number;
    };
  };
  bot: {
    score_simulation_endpoint: string;
  };
}
