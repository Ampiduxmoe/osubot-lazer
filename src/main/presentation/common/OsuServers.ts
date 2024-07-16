import {OsuServer} from '../../primitives/OsuServer';

class ServersWithPrefixes extends Array<ServerWithPrefix> {
  constructor(servers: ServerWithPrefix[]) {
    super(...servers);
  }
  getServerByPrefix(prefix: string): OsuServer | undefined {
    return this.find(x => x.prefix === prefix)?.server;
  }
  getServerByPrefixIgnoringCase(prefix: string): OsuServer | undefined {
    return this.find(x => x.prefix.toLowerCase() === prefix.toLowerCase())
      ?.server;
  }
  getPrefixByServer(server: OsuServer): string | undefined {
    return this.find(x => x.server === server)?.prefix;
  }
}

type ServerWithPrefix = {
  server: OsuServer;
  prefix: string;
};

export const SERVERS: ServersWithPrefixes = new ServersWithPrefixes([
  {server: OsuServer.Bancho, prefix: 'l'},
]);
