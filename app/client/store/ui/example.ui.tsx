import { action, computed, observable } from "mobx";
import { ApplicationStore } from "../application.store";
import { Store } from "../store";

export class ExampleUI extends Store {
  @observable test = "Test";
  @observable filterByName = "";

  constructor(app: ApplicationStore) {
    super(app);
  }

  @action
  setFilter(value: string) {
    this.filterByName = value;
  }

  @computed
  get formattedThing() {
    const transformed = this.application.domain.example.data?.length || 0;
    return transformed;
  }

  @computed
  get filteredList() {
    return (
      this.application.domain.example.data?.filter((t) =>
        t.name.toLowerCase().includes(this.filterByName.toLowerCase())
      ) || []
    );
  }
}
