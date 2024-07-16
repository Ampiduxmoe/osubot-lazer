import * as fs from 'fs';
import {App} from './App';
import {AppConfig} from './AppConfig';
export function main() {
  const configFile = fs.readFileSync('./app-config.json');
  const appConfig: AppConfig = JSON.parse(configFile.toString());
  const app = new App(appConfig);
  app.start();

  const shutdown = (signal: string) => {
    console.log(`Program received ${signal}, attempting to shutdown now...`);
    app.stop();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
