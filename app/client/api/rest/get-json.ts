import { ApplicationStore } from "../../store";
import { authorizationCheck } from "./authorization-check";
import { IJsonType } from "../../../../util/types";
import { wait } from "../../../../util/wait";

/**
 * Perform a GET request to a REST endpoint. Applies a JSON object as query parameters
 */
export const getJSON =
  (app: ApplicationStore) =>
  async (
    url: { path: string; headers?: HeadersInit; fetchOptions?: RequestInit },
    json?: object,
    fetchOptions?: RequestInit,
    errorHandler?: (error: Error, code?: number) => void
  ): Promise<IJsonType | null> => {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...url.headers,
    };

    try {
      const response = await fetch(url.path, {
        method: "GET",
        headers,
        credentials: "include",
        body: json ? JSON.stringify(json) : undefined,
        ...fetchOptions,
        ...url.fetchOptions,
      });

      const auth = await authorizationCheck(app)(response);

      // To many requests needs some robust handling
      if (auth?.error === 429 && !errorHandler) {
        await wait(2000);
        return await getJSON(app)(url, json, fetchOptions);
      }

      return auth;
    } catch (err) {
      console.warn(err);
      return null;
    }
  };
