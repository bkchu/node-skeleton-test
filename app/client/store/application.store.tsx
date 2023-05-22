import { DomainStore } from "./domain/domain.store";
import { makeObservable, observable } from "mobx";
import { SessionStore } from "./session/session.store";
import { UIStore } from "./ui/ui.store";

/**
 * The Application state. Utilizes a singleton pattern with itself injected as a
 * dependency to all child stores.
 *
 * This follows a strict concept of splitting the UI state across three major
 * groups:
 *
 * 1. Domain state - this is the state that is directly related to the domain
 *    data loaded from the server
 * 2. Session state - this is the state that is directly related to the session
 *    such as User information, current URL params, cookies, etc
 * 3. UI state - this is the state that is directly related to the UI which is a
 *    transformation of the domain into something the UI can understand. This
 *    also includes user input state which can dictate and modify how the domain
 *    is transformed (such as current sorting preferences or current search
 *    terms etc)
 */
export class ApplicationStore {
  @observable domain = new DomainStore(this);
  @observable session = new SessionStore(this);
  @observable ui = new UIStore(this);

  constructor() {
    makeObservable(this);
  }
}

export const Application = new ApplicationStore();
