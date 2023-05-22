import { ApplicationStore } from "../../store";
import { authorizationCheck } from "./authorization-check";
import { IJsonType } from "../../../../util/types";
import { wait } from "../../../../util/wait";

/**
 * Perform a DELETE request to a REST endpoint.
 */
export const deleteJSON =
  (app: ApplicationStore) =>
  async (
    url: { path: string; headers?: HeadersInit; fetchOptions?: RequestInit },
    json?: object,
    fetchOptions?: RequestInit,
    errorHandler?: (error: Error, code?: number) => void
  ): Promise<IJsonType | null> => {
    const headers = {
      "Content-type": "application/json",
      ...url.headers,
    };

    try {
      const response = await fetch(url.path, {
        method: "DELETE",
        headers,
        body: json ? JSON.stringify(json) : undefined,
        ...fetchOptions,
        ...url.fetchOptions,
      });

      const auth = await authorizationCheck(app)(response);

      // To many requests needs some robust handling
      if (auth?.error === 429 && !errorHandler) {
        await wait(2000);
        return await deleteJSON(app)(url, json, fetchOptions);
      }

      return auth;
    } catch (err) {
      console.warn(err);
      return null;
    }
  };
