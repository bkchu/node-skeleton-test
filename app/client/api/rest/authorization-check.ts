import { ApplicationStore } from "../../store/application.store";
import { IJsonType } from "../../../../util/types";

export const AuthCheckConfig = {
  allowNavigation: true,
};

/**
 * Performs a check to make sure the user was authorized for the information
 * retrieved.
 *
 * If not authorized, this automatically sends the user back to login for
 * reauthorization.
 */
export const authorizationCheck =
  (app: ApplicationStore) =>
  async (
    raw: Response,
    errorHandler?: (error: Error, code?: number) => void
  ): Promise<IJsonType | null> => {
    switch (raw.status) {
      case 429:
        return { error: 429 };

      default:
        break;
    }

    const check = await raw.text();

    if (raw.status === 204) {
      app.session.makeError({
        title: "No Change Error",
        body: `No Change: ${check}`,
      });
      errorHandler?.(new Error(check), 204);
      return null;
    }

    // Generic handle most 400 responses
    if (raw.status >= 400 && raw.status < 500) {
      app.session.makeError({
        title: "Network Error",
        body: `API Error: ${check}`,
      });
      errorHandler?.(new Error(check), raw.status);
      return null;
    }

    if (raw.status >= 500) {
      app.session.makeError({
        title: "Server Error",
        body: `Server Error: ${check}`,
      });
      errorHandler?.(new Error(check), raw.status);
      return null;
    }

    if (!check) {
      app.session.makeError({
        title: "Network Error",
        body: `Empty Response: ${check}`,
      });
      errorHandler?.(new Error(check), raw.status);
      return null;
    }

    // If this is not an Unauthorized response, we simply parse out the JSON for
    // the response
    let json: any = null;

    try {
      json = JSON.parse(check);
      let etag;

      raw.headers.forEach((value, header) => {
        if (header.toLowerCase() === "etag") {
          etag = value;
        }
      });

      if (etag) json.etag = etag;
    } catch (err) {
      console.warn("Unable to parse response body to json");
      console.warn(check);
      app.session.makeError({
        title: "Network Error",
        body: "Invalid JSON response",
      });

      if (err instanceof Error) {
        errorHandler?.(err);
      }

      return null;
    }

    return json;
  };
