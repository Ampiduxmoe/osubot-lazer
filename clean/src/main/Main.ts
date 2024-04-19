import * as fs from 'fs';
import {App} from './App';
import {AppConfig} from './AppConfig';
export function main() {
  const configFile = fs.readFileSync('./clean/src/main/app-config.json');
  const appConfig: AppConfig = JSON.parse(configFile.toString());
  const app = new App(appConfig);
  app.start();

  const shutdown = () => {
    console.log('Program received SIGTERM, attempting to shutdown now...');
    app.stop();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();
