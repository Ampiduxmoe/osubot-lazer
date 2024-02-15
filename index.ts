import {App} from './src/App';
import {IAppConfig} from './src/IAppConfig';
import * as fs from 'fs';

function main() {
  const configFile = fs.readFileSync('./app-config.json');
  const appConfig: IAppConfig = JSON.parse(configFile.toString());
  const app = new App(appConfig);
  app.start();
}

main();
