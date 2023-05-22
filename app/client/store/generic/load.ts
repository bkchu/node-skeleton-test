import { flow, flowResult } from "mobx";
import { IAPIResource } from "./api-resource";
import { isDefined } from "../../../../util/types";
import { PromiseResolver } from "../../../../util/promise-resolver";

export class Singleton {
  loadOnce<
    TResourceType,
    TMethod extends (...args: any[]) => Generator<any, any, any>
  >(
    resource: IAPIResource<TResourceType, PromiseResolver<void>>,
    method: TMethod
  ) {
    return flow(function* (...args: Parameters<TMethod>) {
      // Already loaded, no wait
      if (isDefined(resource.data)) return;

      // Already loading, wait for load to complete
      if (resource.isLoading) {
        yield resource.ctx?.promise;
        return;
      }

      yield flowResult(method(...args));

      // Resolve the context so all that are waiting can continue execution.
      resource.ctx?.resolve();
    });
  }
}

export const Load = new Singleton();
