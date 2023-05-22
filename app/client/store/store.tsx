import { ApplicationStore } from "./application.store";

/**
 * This is the base store to ensure a pattern for passing down the application
 * singleton throughout the Store structure to resolve. Every class within the
 * application state should inheret this class.
 */
export class Store {
  /** The application state. */
  application: ApplicationStore;

  constructor(app: ApplicationStore) {
    this.application = app;
  }
}
