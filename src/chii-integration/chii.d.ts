import type { Server } from "node:http";

export interface ChiiOptions {
  port?: number;
  host?: string;
  domain?: string;
  server?: Server;
  basePath?: string;
}

declare const chii: {
  start(options: ChiiOptions): Promise<void>;
};
export type Chii = typeof chii;

export default chii;
export { chii };
