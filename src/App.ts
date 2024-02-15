import {IAppConfig} from './IAppConfig';

export class App {
  readonly config: IAppConfig;

  constructor(config: IAppConfig) {
    this.config = config;
    console.log('App init');
  }

  start() {
    console.log('App started!');
  }
}
