import { EnvBase } from "./env.base.js";

/**
 * This environment configures the application to target the developer
 * environment.
 *
 * Mob1 test accounts: 6494, 6490
 */
class Env extends EnvBase {
  thirdParty: EnvBase["thirdParty"] = {
    example: "TODO",
  };

  hostConfig: EnvBase["hostConfig"] = {
    example: {
      proxyHost: "https://example.com",
      host: "",
      apiPath: "/v${version}/example",
    },
  };

  /** Dev routes to the root for simplicity */
  baseRoute = "";
  /** Dev route for static resources comes from the root */
  baseStaticRoute = "";
}

/**
 * Developer environment variables for targetting resources from a development
 * server.
 *
 * The webpack config utilizes NormalModuleReplacementPlugin to determine the
 * correct config to import for the bundle.
 */
export const ENV = new Env().init();
