import { ApplicationStore } from "../application.store";
import { ExampleUI } from "./example.ui";
import { makeObservable, observable } from "mobx";
import { Store } from "../store";

/**
 * This is the main container of UI specific state management. This should
 * mostly be transformations of the domain store into something the UI can
 * understand easily.
 *
 * This can also contain application UI state which affects the transformation
 * of domain data, such as search or sort preferences or other user input state.
 */
export class UIStore extends Store {
  @observable example = new ExampleUI(this.application);

  constructor(app: ApplicationStore) {
    super(app);
    makeObservable(this);
  }
}
