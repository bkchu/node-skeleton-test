import { ApplicationStore } from "../store/application.store";
import { ENV } from "../../config/env";
import { REST } from "./rest/rest";

export const ExampleAPI = {
  example: (app: ApplicationStore) =>
    REST(app).GET(ENV.useApi(ENV.hostConfig.example, 1, `/example`).get),
};
