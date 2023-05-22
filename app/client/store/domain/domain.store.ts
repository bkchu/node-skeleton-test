import { ApplicationStore } from "../application.store";
import { IAPIResource } from "../generic/api-resource";
import { IExample } from "../../api/validation";
import { makeObservable, observable } from "mobx";
import { PromiseResolver } from "../../../../util/promise-resolver";
import { Store } from "../store";

/**
 * This stores data that is loaded from the domain server. This helps manage
 * pagination and other nuances to loading data from the server.
 */
export class DomainStore extends Store {
  /**
   * This is the static configuration object that handles that lacking of
   * Timetaps abilities to make deeper associations.
   */
  @observable example: IAPIResource<IExample[] | null, PromiseResolver<void>> =
    {
      isLoading: false,
      data: null,
      ctx: new PromiseResolver<void>(),
    };

  constructor(app: ApplicationStore) {
    super(app);
    makeObservable(this);
  }
}
