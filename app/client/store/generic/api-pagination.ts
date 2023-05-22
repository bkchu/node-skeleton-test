import { action, computed, flow, makeObservable, observable } from "mobx";
import { compareSets } from "../../../../util/compare-sets";
import { deepEqual } from "../../../../util/deep-equal";
import { FlowType } from "../../../../util/types";
import { getErrorMessage } from "../../../../util/get-error-message";
import { IAPIResource } from "./api-resource";

/**
 * This is a resource that is backed by a count based pagination strategy.
 */
export interface IAPIPaginationCountResource<T> {
  count: number;
  data: T[];
}

/**
 * This is a resource that is backed by a next and prev page URL link strategy.
 */
export interface IAPIPaginationPagedResource<T> {
  nextPage?: string;
  prevPage?: string;
  data: T[];
}

export type APIPaginationRequest<T, TSearch> = (
  pagination: APIPagination<T, TSearch>,
  page: number,
  pageSize: number,
  search?: TSearch
) => Promise<
  IAPIPaginationCountResource<T> | IAPIPaginationPagedResource<T> | null
>;

export enum APIPaginationMergeAction {
  NONE,
  MERGE,
}

export enum APIPaginationAddAction {
  /**
   * This is not a recommended strategy as ignoring new data means things will
   * get more and more error prone as new items becomes available. At minimum
   * you should use the DRIFT strategy.
   */
  NONE,
  /** New items will be added to the end of the data */
  APPEND,
  /** New items will be added to the begginning of the data */
  PREPEND,
  /**
   * New items will be spliced into the position in the page it was discovered.
   * This can cause visual jumping but will keep the data in sync.
   */
  SPLICE,
  /**
   * This prevents the new item from being loaded into the data but rather will
   * increment a drift value. This drift value will adjust further polling to
   * load in pages in a wider range so that the expected originals for the
   * indicated page will be scooped up.
   *
   * This is an error prone and innacurate strategy that ONLY really works for
   * datasets that load newest elements to the beginning of the remote dataset.
   *
   * Datasets that can inject new elements into the middle of the list will
   * really mess this strategy up. If new elements are added to the end of the
   * dataset it's recommended to use the APPEND strategy.
   *
   * If the new data appears at the beginning of the list and your UI has a
   * strategy for not jumping erratically, it is recommended to try the PREPEND
   * strategy.
   */
  DRIFT,
}

/**
 * Typeguard for the the API list page type backed by a "count" strategy
 */
function isAPIPaginationCount<T>(
  val: any
): val is IAPIPaginationCountResource<T> {
  return val && val.count !== void 0 && Array.isArray(val.data);
}

/**
 * Typeguard for the the API list page type backed by a "next and prev url"
 * strategy
 */
function isAPIPaginationPaged<T>(
  val: any
): val is IAPIPaginationPagedResource<T> {
  return (
    val &&
    (val._next_page !== void 0 ||
      val._prev_page !== void 0 ||
      val.count === void 0) &&
    Array.isArray(val.data)
  );
}

/**
 * Expresses which pagination strategy is being used for this resource
 */
enum PageStrategy {
  /**
   * This strategy means a count indicating total records available in the
   * backend is available.
   */
  COUNT,
  /**
   * Indicates the backend will indicate if a _next_page or _prev_page is
   * available for selecting the next page of data.
   */
  PAGED,
}

/**
 * Generic object for handling API requests that have pagination involved.
 */
export class APIPagination<T, TSearch> implements IAPIResource<T[]> {
  /** Indicates if resources for this pagination object are being loaded */
  @observable isLoading = false;
  /** Stores the total number of records the API has available */
  @observable total = 0;
  /** Determines how many records to load per page */
  @observable pageSize = 20;
  /** The data loaded in from the API */
  @observable data: T[] = [];
  /** Index of the most recently loaded page (not necessarily the largest available) */
  @observable currentPage = -1;
  /**
   * The search context applied to this pagination object which filters the
   * results.
   */
  @observable private search?: TSearch = void 0;
  /** This is the API request used to fetch data from the paginated source */
  private api: APIPaginationRequest<T, TSearch>;
  /** Timer id for debouncing setting the search */
  private searchDebounce = -1;
  /** Timer id for the polling routine */
  private pollingTimerId = -1;
  /** Timer id for debouncing the beginning of the polling operation */
  private pollStartDebounceId = -1;
  /** The pages we will be polling to establish differences */
  private pollingPages: Set<number> = new Set();
  /** Current polling interval for the polling strategy for the list */
  private pollingInterval = 30000;
  /**
   * Specialized number used in polling where NEW items found are discarded,
   * but the number of items discarded is tracked so the pagination can keep
   * track of the drift and load in extra data to ensure the existing data gets
   * re-paged in.
   */
  private pollingDrift: T[] = [];
  /**
   * The current search context used for the polling scheme. This usually should
   * match the search context used for the initial load. This just helps keep
   * track of changes to the search context so we can discard stale data loads.
   */
  private pollingSearch?: TSearch = void 0;
  /**
   * This stores the type of paging strategy discovered from the backend and
   * allows us to adjust how this abstration handles the available paginated
   * data.
   */
  private pageStrategy: PageStrategy = PageStrategy.COUNT;
  /**
   * This is for PageStrategy.PAGED only. This stores whether or not a next page
   * is available as provided by the backend response.
   */
  @observable private nextPage?: string = void 0;

  constructor(api: APIPaginationRequest<T, TSearch>) {
    makeObservable(this);
    this.api = api;
  }

  /**
   * Retrieves the current search applied to this list.
   */
  get currentSearch() {
    return this.search;
  }

  /**
   * Returns set of current pages being polled for. This does not include pages
   * being polled due to drift.
   */
  get currentPollingPages() {
    return new Set(this.pollingPages.values());
  }

  /**
   * Indicates this list has more items to be loaded from the server. This
   * strategy only works if the user streams in pages. Selecting the page to
   * load will make this a false idea.
   */
  @computed
  get hasMore() {
    switch (this.pageStrategy) {
      case PageStrategy.PAGED:
        return this.nextPage !== void 0;

      case PageStrategy.COUNT:
      default:
        return this.total !== this.data.length;
    }
  }

  /**
   * Number of pages of data the server has available based
   */
  @computed
  get totalPages() {
    switch (this.pageStrategy) {
      case PageStrategy.PAGED:
        throw new Error(
          "This pagination resource does NOT support total pages as the backend provides a next page url instead of a count"
        );

      case PageStrategy.COUNT:
      default:
        return Math.ceil(this.total / this.pageSize);
    }
  }

  /**
   * Loads the next page of data from the server based on the data length. This
   * means the next page loaded has nothing to deal with a value passed to
   * loadPage, but rather just what exists and where within the data array.
   * Generally, for pagination you will either exclusive use loadNext or you
   * will exclusively use loadPage for the easiest implementation of the
   * pagination.
   */
  @flow
  *loadNext() {
    if (!this.hasMore) return;
    const nextPage = Math.floor(this.data.length / this.pageSize);

    yield this.loadPage(nextPage, true);
  }

  /**
   * Load in the specified page of data from the server.
   *
   * NOTE: if retainData is true, the data loaded in will ALWAYS be appended to
   * the existing data. This DOES NOT support sparse loading of data as we do
   * not encourage a sparse array approach. Thus this is good for paging in data
   * from a starting point.
   *
   * If retainData is false or omitted, "data" will be ONLY the specified page
   * and not include any special ordering or retention of pages.
   */
  @flow
  *loadPage(page: number, retainData?: boolean): FlowType {
    // Prevent duplicate calls to loading
    if (this.currentPage === page) return;
    this.currentPage = page;
    // Retain the page size so this operation won't be affected by sudden page
    // size changes during async operations. We will discard the results if the
    // pagesize did change as the data would be applied to an unexpected
    // topology of the list.
    const pageSize = this.pageSize;

    this.isLoading = true;
    const results = yield this.api(this, page, this.pageSize, this.search);
    this.isLoading = false;

    // Discard data due to topology changes
    if (this.pageSize !== pageSize) return;
    // This prevents older loads from overwriting newer ones
    if (this.currentPage !== page) return;

    const isCount = isAPIPaginationCount<T>(results);
    const isPage = isAPIPaginationPaged<T>(results);

    if (!isCount && !isPage) {
      console.warn(
        "Return type from an expected paginated source is not formatted correctly. Received:",
        results,
        "But expected an object with 'count or _next_page or _prev_page' and 'data'."
      );
      return;
    }

    if (isCount) {
      this.pageStrategy = PageStrategy.COUNT;

      if (this.total !== results.count) {
        this.total = results.count;
      }

      this.total = results.count;
    }

    if (isPage) {
      this.pageStrategy = PageStrategy.PAGED;
      this.nextPage = results.nextPage;
    }

    if (retainData) {
      // We inject the loaded data into the proper index according to the page
      // that was loaded.
      for (
        let i = page * pageSize,
          iMax = page * pageSize + pageSize,
          resultIndex = 0;
        i < iMax;
        ++i, ++resultIndex
      ) {
        // Check to safely get the data if the results does not populte a full
        // page
        if (resultIndex >= results.data.length) {
          break;
        }

        // If data is beyond the current index of data, push it onto the end
        if (i >= this.data.length) {
          this.data.push(results.data[resultIndex]);
        }

        // Otherwise, push it into the correct index
        else {
          this.data[i] = results.data[resultIndex];
        }
      }
    } else {
      this.data = results.data;
    }

    // Assign to trigger updates
    // eslint-disable-next-line no-self-assign
    this.data = this.data;
  }

  /**
   * This changes how much data is paged in with each request.
   */
  @flow
  *changePageSize(pageSize: number) {
    this.pageSize = pageSize;
    this.total = 0;
    this.data = [];

    yield this.loadPage(0);
  }

  /**
   * Empties all loaded paginated data.
   */
  @action
  clear() {
    this.data = [];
    this.total = -1;
    this.currentPage = -1;
    this.search = void 0;
  }

  @flow
  private *changeSearch(val?: TSearch) {
    this.search = val;
    this.currentPage = -1;
    yield this.loadPage(0);
    this.search = val;
    // Clean out polling drift after this operation as it resets the context of
    // the search and will be up to date at this point.
    this.pollingDrift = [];
  }

  /**
   * This triggers the data already paged in to be polled for updates at a given
   * interval (in milliseconds). This polling process can be provided with
   * target pages to poll for. This allows the poll to be limited and targeted
   * to ensure up to date resources and prevent polling massive data sets.
   *
   * As an example, this can poll the first page of data to look for more recent
   * updates, and poll the user's currently viewed page of data to update the
   * visual range of information the user sees.
   *
   * There is currently NO NEW ITEM strategy that will work correctly. As more
   * new items are discovered in polling
   *
   * NOTE: The compare method is NOT looking for equality, but should be a test
   * to see if the new item IS the same as the old item, but with new data or
   * stale data.
   *
   * PERFORMANCE: Make the compare method as concise as possible. If you can
   * match on IDs that would be ideal. Try to avoid deep comparisons that can
   * get costly.
   */
  @action
  poll(
    interval: number,
    pages: Set<number>,
    search: TSearch | undefined,
    compare: (a: T, b: T) => boolean,
    changedItem: (updated: T) => APIPaginationMergeAction,
    newItem: (newItem: T) => APIPaginationAddAction
  ) {
    // Performs the merging of discovered results into the current data set and
    // wraps in an action to abide by strict mobx policy.
    const doMerge = action(
      (loadedItems: Map<number, T>, currentData: [T, number][]) => {
        currentData.forEach((tuple) => {
          const { 0: item, 1: i } = tuple;
          const iter = loadedItems.entries();
          let entry = iter.next();

          // Compare this item against all entries polled in.
          while (!entry.done) {
            const { 0: index, 1: loadedItem } = entry.value;

            if (compare(item, loadedItem)) {
              const action = changedItem(loadedItem);

              switch (action) {
                case APIPaginationMergeAction.MERGE:
                  this.data[i] = loadedItem;
                  break;

                case APIPaginationMergeAction.NONE:
                default:
                  break;
              }

              // Indicate we have matched and handled the loaded item
              loadedItems.delete(index);
              break;
            }

            entry = iter.next();
          }
        });

        // If we had misses in the quick check pages, we do a full data scan to
        // determine if the remaining items truly are new or not
        if (loadedItems.size > 0) {
          this.data.forEach((item, i) => {
            const iter = loadedItems.entries();
            let entry = iter.next();

            // Compare this item against all entries polled in.
            while (!entry.done) {
              const { 0: index, 1: loadedItem } = entry.value;

              if (compare(item, loadedItem)) {
                const action = changedItem(loadedItem);

                switch (action) {
                  case APIPaginationMergeAction.MERGE:
                    this.data[i] = loadedItem;
                    break;

                  case APIPaginationMergeAction.NONE:
                  default:
                    break;
                }

                // Indicate we have matched and handled the loaded item
                loadedItems.delete(index);
                break;
              }

              entry = iter.next();
            }
          });
        }

        // Polling can sometimes over shoot and load in some extra data from a
        // future page. When that happens, we hang onto the new items and append
        // them to the end as though they are a paged in resource.
        const newItems: [T, number][] = [];
        // All remaining loaded items are considered new
        const toPrepend: T[] = [];

        loadedItems.forEach((item, itemDataIndex) => {
          // We loop through our drift list and see if this item has already
          // been accounted for in the drift.
          const found = this.pollingDrift.some((drift) => compare(drift, item));
          if (found) return;

          // This detects if the item comes from a new page of data
          if (itemDataIndex >= this.data.length + this.pollingDrift.length) {
            newItems.push([item, itemDataIndex]);
            return;
          }

          // If not in the drift, this is genuinely a new item
          const action = newItem(item);

          switch (action) {
            case APIPaginationAddAction.PREPEND:
              toPrepend.push(item);
              break;

            case APIPaginationAddAction.APPEND:
              this.data.push(item);
              break;

            case APIPaginationAddAction.SPLICE:
              throw new Error(
                "NOT IMPLEMENTED: APIPaginationAddAction.SPLICE. If you need this, please make it happen!"
              );

            case APIPaginationAddAction.DRIFT:
              // Add this new item to the drift if it was not found.
              this.pollingDrift.push(item);
              break;

            case APIPaginationAddAction.NONE:
            default:
              break;
          }
        });

        // Put the prepend items at the beginning of the data array
        if (toPrepend.length > 0) {
          this.data = toPrepend.concat(this.data);
        }

        // Append the new items from a new page to the end of the dataset
        if (newItems.length > 0) {
          newItems.sort((a, b) => a[1] - b[1]);
          this.data = this.data.concat(newItems.map((i) => i[0]));
          const lastPage = newItems[newItems.length - 1][1] / this.pageSize;
          this.currentPage = lastPage;
        }
      }
    );

    // This is the actual polling action that will call the API and perform all
    // of the diff operations to merge in the discovered data.
    const doPoll = async () => {
      // Keep track of the page size we loaded in. If this changes during a call
      // we must reject the data loaded as it will have an incorrect topology
      // for the rest of the data.
      const pageSize = this.pageSize;
      const search = this.pollingSearch;

      // Adjust our pages we wish to poll for to account for the drift. We
      // simply buffer in extra pages to the beginning and end of each page
      // based on drift size.
      const adjustedPages = new Set(pages.values());
      const driftPages = Math.ceil(this.pollingDrift.length / pageSize);

      pages.forEach((page) => {
        for (let i = -driftPages; i <= driftPages; ++i) {
          if (page + i > 0) adjustedPages.add(page + i);
        }
      });

      // Perform a pagination request for each page in the polling set.
      const requests = Array.from(adjustedPages.values()).map(
        (page: number) => {
          if (page < 0) {
            return Promise.resolve<
              [IAPIPaginationCountResource<T> | null, number]
            >([{ count: 0, data: [] }, page]);
          }

          return new Promise<
            [
              (
                | IAPIPaginationCountResource<T>
                | IAPIPaginationPagedResource<T>
                | null
              ),
              number
            ]
          >(async (r) => {
            const pageOfResult = page;
            const result = await this.api(this, page, pageSize, search);
            r([result, pageOfResult]);
          });
        }
      );

      // Wait for each promise to complete.
      const results = await Promise.all(requests);
      // Make sure the results are sorted by their page number to better
      // improve expectations
      results.sort((a, b) => a[1] - b[1]);

      // Cast out results when we have any topology changes to the data
      // currently desired for the poll.
      let isSameSearch = search === this.search;

      if (!isSameSearch) {
        // Attempt a deep comparison of the search in a very sandboxed region to
        // prevent breaking
        try {
          const searchTest: any = search;
          const thisSearchTest: any = this.search;
          isSameSearch = deepEqual(searchTest, thisSearchTest);
        } catch (err) {
          // If any error happens trying to compare the search types
          isSameSearch = false;
          console.warn("Search types for polling are not comparable");
          console.warn(getErrorMessage(err));
        }
      }

      if (pageSize !== this.pageSize || !isSameSearch) {
        return;
      }

      // Gather all of the loaded items into a single array while keeping track
      // of each loaded item's index within the overall data array.
      const loadedItems = new Map<number, T>();

      results.forEach((result) => {
        const [pageData, pageNumber] = result;

        if (pageData) {
          pageData.data.forEach((item, i) => {
            loadedItems.set(pageNumber * pageSize + i, item);
          });
        }
      });

      // Get the existing data for the pages specified and retain the real index
      // of the data in the tuple.
      const currentData: [T, number][] = [];

      adjustedPages.forEach((page) => {
        const min = page * this.pageSize;
        const max = (page + 1) * this.pageSize;

        // Filter out invalid pages
        if (min < 0 || max > this.data.length) return;

        const pageData = this.data.slice(min, max);
        pageData.forEach((item, i) => {
          currentData.push([item, page * this.pageSize + i]);
        });
      });

      // Perform the merging actions with our discovered and loaded data.
      doMerge(loadedItems, currentData);
    };

    // If we have a new set of pages to poll, let's reset our timer and do an
    // immediate starting poll to ensure we have the latest data. We debounce
    // the activation of the initial poll + interval to further buffer requests
    // from rapid user interactions which could cause a flood of requests.
    if (
      !compareSets(pages, this.pollingPages) ||
      this.pollingInterval !== interval ||
      this.pollingSearch !== search
    ) {
      this.pollingPages = pages;
      this.pollingInterval = interval;
      this.pollingSearch = search;
      window.clearInterval(this.pollingTimerId);
      window.clearTimeout(this.pollStartDebounceId);

      this.pollStartDebounceId = window.setTimeout(async () => {
        await doPoll();

        this.pollingTimerId = window.setInterval(async () => {
          doPoll();
        }, this.pollingInterval);
      }, 1000);
    }
  }

  /**
   * Cancels the current polling operation for this data source.
   */
  @action
  stopPoll() {
    window.clearTimeout(this.pollStartDebounceId);
    window.clearInterval(this.pollingTimerId);
  }

  /**
   * Apply a new search term and trigger pagination to reload from the
   * beginning. This method is debounced unless immediate is flagged to true.
   */
  @flow
  *setSearch(val?: TSearch, immediate?: boolean) {
    window.clearTimeout(this.searchDebounce);

    if (immediate) {
      yield this.changeSearch(val);
    } else {
      this.search = val;
      this.searchDebounce = window.setTimeout(async () => {
        await this.changeSearch(val);
      }, 500);
    }
  }
}
