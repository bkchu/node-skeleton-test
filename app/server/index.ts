/**
 * NOTE: This is just a local development server to host files created for the
 * UI application. This does NOT deploy or impact production of the UI
 * Application in anyway.
 */
import express from "express";
import https from "https";
import makeCert from "make-cert";
import path from "path";
import url from "url";
import { chalk } from "../../util/chalk";
import { createProxyMiddleware, RequestHandler } from "http-proxy-middleware";
import { ENV } from "../config/env";
import { getErrorMessage } from "../../util/get-error-message";
import { IHostConfig, isHostConfig } from "../config/env.base";
import { mapLookupValues } from "../../util/look-up";
import { template } from "../../util/template";
import { urlJoin } from "../../util/url-join";
import { wait } from "../../util/wait";

/**
 * Runs a simple HTTP server to host your files
 */
async function runServer() {
  try {
    const { SERVER_PORT = 443, RESOURCE_PATH = "" } = process.env;

    const app = express();

    // app.use(compression());
    // Configure our application to send requests to the API server specified in
    // our environment configuration.
    apiProxy(app);

    // Set up the expected resource path for hosting static resources.
    app.use(ENV.baseStaticRoute, express.static(RESOURCE_PATH));

    // Final catch-all route to index.html defined last so our deep routing still
    // will host the file and initialize the app.
    app.get("/*", (_req, res) => {
      res.sendFile(path.resolve(RESOURCE_PATH, "index.html"));
    });

    // Host our App as an HTTPS endpoint so we can follow protocol up the chain.
    const { key, cert } = makeCert("localhost");
    const httpsServer = https.createServer({ key, cert }, app);

    httpsServer.listen(SERVER_PORT, async () => {
      console.warn(`App running at https://localhost:${SERVER_PORT}/`);
      console.warn("Hosting files from:", RESOURCE_PATH);

      await wait(1000);
      console.warn("\n\n\n");
      console.warn(
        chalk.cyanBright("*************************************************")
      );
      console.warn(
        chalk.cyanBright("*"),
        "Run",
        chalk.yellowBright("npm run dev-page"),
        "in another shell",
        chalk.cyanBright("        *")
      );
      console.warn(
        chalk.cyanBright("*"),
        "Type",
        chalk.yellowBright("thisisunsafe"),
        "within page if using Chrome",
        chalk.cyanBright("*")
      );
      console.warn(
        chalk.cyanBright("*************************************************")
      );
      console.warn("\n\n\n");
    });
  } catch (err) {
    console.error(getErrorMessage(err));
  }
}

/**
 * Configure our server to proxy API calls to the remote API. This bypasses
 * issues where our fetch requests don't include the Cookie from the cross
 * domain problems.
 */
async function apiProxy(app: express.Express) {
  const allHosts = mapLookupValues<
    IHostConfig,
    { key: string; value: IHostConfig }
  >("hosts", isHostConfig, ENV.hostConfig, (key, value) => ({ key, value }));

  const proxies = new Map<string, RequestHandler>();
  const isUsing = new Set<string>();

  console.warn(
    chalk.cyan(
      "\n\nBuilding Proxies. \n- Paths shown will show ExpressJS style paths with dynamic params using it's syntax ':param'\n- Duplicate proxy hosts will only create one proxy for identical paths.\n"
    )
  );

  allHosts.forEach(({ key, value: hostConfig }) => {
    if (!hostConfig.proxyHost) return;
    console.warn(chalk.yellow(key));
    let proxy = proxies.get(hostConfig.proxyHost);

    // Ensure the proxy server is established for the host
    if (!proxy) {
      const options = {
        // Target host
        target: hostConfig.proxyHost,
        // Needed for virtual hosted sites (helps with https)
        changeOrigin: false,
        secure: false,

        onProxyReq: function (request: any) {
          try {
            request.setHeader("host", url.parse(hostConfig.proxyHost).hostname);
            request.setHeader("referer", hostConfig.proxyHost);
            request.removeHeader("origin");
          } catch (err) {
            console.error(getErrorMessage(err));
          }
        },

        onProxyRes: function (response: any) {
          console.warn("STATUS:", response.statusCode);
        },
      };

      proxy = createProxyMiddleware(options);
      proxies.set(hostConfig.proxyHost, proxy);
    }

    // Ensure Express is configured to handle the path type correctly. We will
    // replace template values with Express Dynamic variables to make sure all
    // paths that fit the format are captured.
    // For example:
    //   /thing/v${version}/account
    // will be converted to
    //   /thing/v:value/account
    if (!isUsing.has(hostConfig.apiPath)) {
      const result = template({
        template: hostConfig.apiPath,
        options: {
          version: ":version",
        },
      }).template;

      console.warn(chalk.cyan("Proxy using path:"), result);
      app.use(
        result,
        (req, _res, next) => {
          console.warn(
            chalk.cyanBrightBold(`${req.method} Proxied request`),
            req.originalUrl,
            chalk.cyanBrightBold("to"),
            chalk.greenBright(urlJoin(hostConfig.proxyHost, req.originalUrl))
          );
          delete req.headers.Origin;
          next();
        },
        proxy
      );

      isUsing.add(hostConfig.apiPath);
    }
  });
}

/**
 * Revert our host file to the correct address
 */
const handleExit = (message: string) => async () => {
  console.warn(chalk.redBrightBold(message, "EXIT Proxy/Dev Server"));
  process.exit(0);
};

// Catch when app is closing
process.on("exit", handleExit("exit"));
// Catch ctrl+c event
process.on("SIGINT", handleExit("SIGINT"));
// Catch "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", handleExit("SIGUSR1"));
process.on("SIGUSR2", handleExit("SIGUSR2"));
process.on("SIGTERM", handleExit("SIGTERM"));
// Catch uncaught exceptions
process.on("uncaughtException", (err) =>
  handleExit(`uncaughtException ${err.message || err.stack}`)()
);

runServer();
