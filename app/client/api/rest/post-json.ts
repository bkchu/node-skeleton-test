import { ApplicationStore } from "../../store";
import { authorizationCheck } from "./authorization-check";
import { IJsonType } from "../../../../util/types";
import { wait } from "../../../../util/wait";

/**
 * Perform a POST request to a REST endpoint.
 */
export const postJSON =
  (app: ApplicationStore) =>
  async (
    url: { path: string; headers?: HeadersInit; fetchOptions?: RequestInit },
    json?: object,
    additionalheaders?: Record<string, string>,
    fetchOptions?: RequestInit,
    errorHandler?: (error: Error, code?: number) => void
  ): Promise<IJsonType | null> => {
    const headers = {
      "Content-type": "application/json",
      ...additionalheaders,
      ...url.headers,
    };

    try {
      const response = await fetch(url.path, {
        method: "POST",
        headers,
        body: json ? JSON.stringify(json) : undefined,
        ...fetchOptions,
        ...url.fetchOptions,
      });

      const auth = await authorizationCheck(app)(response, errorHandler);

      // To many requests needs some robust handling
      if (auth?.error === 429 && !errorHandler) {
        await wait(2000);
        return await postJSON(app)(url, json, additionalheaders, fetchOptions);
      }

      return auth;
    } catch (err) {
      console.warn(err);
      return null;
    }
  };
