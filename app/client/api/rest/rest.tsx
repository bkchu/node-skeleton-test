import { ApplicationStore } from "../../store/application.store";
import { deleteJSON } from "./delete-json";
import { getJSON } from "./get-json";
import { postJSON } from "./post-json";
import { putJSON } from "./put-json";

export const REST = (app: ApplicationStore) => ({
  GET: getJSON(app),
  POST: postJSON(app),
  PUT: putJSON(app),
  DELETE: deleteJSON(app),
});
