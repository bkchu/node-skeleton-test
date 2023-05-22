import { action, computed, flow, makeObservable, observable } from "mobx";
import { ApplicationStore } from "../application.store";
import { cookieParser } from "../../../../util/cookie-parser";
import { FlowType } from "../../../../util/types";
import { Location, NavigateFunction } from "react-router-dom";
import { Store } from "../store";

export class SessionStore extends Store {
  /**
   * Contains all errors encountered regarding the user's session. This will be
   * populated mostly with responses from the server from fetch calls.
   */
  @observable error: (string | Error)[] = [];
  /**
   * Retrieves the current search params from the URL.
   */
  @observable urlSearchParams: URLSearchParams = new URL(document.location.href)
    .searchParams;
  /**
   * Stores the sessions current cookie information.
   */
  @observable cookie: Record<string, string> = {};

  location?: Location;
  navigate?: NavigateFunction;

  @computed
  get hasError() {
    return this.error.length > 0;
  }

  constructor(app: ApplicationStore) {
    super(app);
    makeObservable(this);
  }

  /**
   * Generates a session error. Errors with a string body will be logged into
   * the session error log. All messages will generate a toast message.
   */
  @action
  makeError(message: any) {
    console.warn("Error handling not implemented yet for this application");
    console.error(message);
  }

  /**
   * Forces the search params to be reanalyzed for new values.
   */
  @action
  updateSearchParams() {
    this.urlSearchParams = new URL(document.location.href).searchParams;
  }

  /**
   * This should be called upon Application boot up. This will initialize any
   * session related needs the user should have when exploring this application.
   */
  @flow
  *init(): FlowType {
    this.updateSearchParams();
    this.cookie = cookieParser();
  }

  /**
   * This allows the application to respond to page changes and do sweeping
   * state updates such as clearing caches or resetting state as deemed
   * appropriate.
   */
  @action
  pageDidLoad(location: Location, navigate: NavigateFunction) {
    // Always keep our location and navigate methods up to date with the hook
    // state, and keep them within reach of session controls.
    this.location = location;
    this.navigate = navigate;
  }
}
