import { ApplicationStore } from "../../store";
import { authorizationCheck } from "./authorization-check";
import { IJsonType } from "../../../../util/types";
import { wait } from "../../../../util/wait";

/**
 * Perform a PUT request to a REST endpoint.
 */
export const putJSON =
  (app: ApplicationStore) =>
  async (
    url: { path: string; headers?: HeadersInit; fetchOptions?: RequestInit },
    json?: object,
    additionalheaders?: Record<string, string>,
    fetchOptions?: RequestInit,
    errorHandler?: (error: Error, code?: number) => void
  ): Promise<IJsonType | null> => {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...additionalheaders,
      ...url.headers,
    };

    try {
      const response = await fetch(url.path, {
        method: "PUT",
        headers,
        body: json ? JSON.stringify(json) : undefined,
        ...fetchOptions,
        ...url.fetchOptions,
      });

      const auth = await authorizationCheck(app)(response);

      // To many requests needs some robust handling
      if (auth?.error === 429 && !errorHandler) {
        await wait(2000);
        return await putJSON(app)(url, json, additionalheaders, fetchOptions);
      }

      return auth;
    } catch (err) {
      console.warn(err);
      return null;
    }
  };
