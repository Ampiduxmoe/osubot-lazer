import {App} from './src/App';
import {IAppConfig} from './src/IAppConfig';
import * as fs from 'fs';
import {main as newMain} from './clean/src/main/Main';

function main() {
  const configFile = fs.readFileSync('./app-config.json');
  const appConfig: IAppConfig = JSON.parse(configFile.toString());
  const app = new App(appConfig);
  app.start();

  const shutdown = () => {
    console.log('Program received SIGTERM, attempting to shutdown now...');
    app.stop();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

newMain();
