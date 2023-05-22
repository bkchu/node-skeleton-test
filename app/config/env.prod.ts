import { EnvBase } from "./env.base.js";

/**
 * See env.ts and env.base.ts for more information.
 */
class Env extends EnvBase {
  thirdParty: EnvBase["thirdParty"] = {
    example: "TODO",
  };

  hostConfig: EnvBase["hostConfig"] = {
    example: {
      proxyHost: "TODO",
      host: "https://example.com",
      apiPath: "/api/v${version}",
    },
  };
}

export const ENV = new Env().init();
