import React from "react";
import { classnames } from "../../../../util/classnames";
import { DOMRectBounds } from "../../../../util/clone-client-rect";
import { INestedChildren, isNumber } from "../../../../util/types";
import { ScrollView } from "../scroll-view/scroll-view";
import "./list-view.scss";

export interface IRowProps {
  index: number;
  style?: React.CSSProperties;
  isEnd: boolean;
}

export interface IListView
  extends INestedChildren<React.FunctionComponent<IRowProps>> {
  /** When set, causes inertia to occur with touch swiping */
  allowTouchInertia?: boolean;
  /**
   * A base size to associate with a list item. This helps give a realistic
   * scroll range. Use a negative value to indicate the row should be measured
   * to have a more dynamic row size. The absolute value of the negative value
   * provided will be the minimum size of the row. Use the rowGap property to
   * ensure spacing is provided between the row and it's next row if needed.
   */
  rowSize: number | ((index: number, isEnd: boolean) => number);
  /**
   * Place an incrementing number here. If the rows need recomputing due to a
   * size change, this value should change.
   */
  rowUpdate?: any;
  /** This is ONLY used for rows that get measured and automatically adjusted */
  rowGap?: number;
  /** Applies a class to the top level container of the pane */
  className?: string;
  /** Props to apply to the container of this component */
  containerProps?: React.HTMLProps<HTMLDivElement>;
  /** WHen the list is empty, this will render a centered label in it's place */
  emptyLabel?: string;
  /** Applies a style object to the top level container of this component */
  style?: React.CSSProperties;
  /** Total number of items to render */
  total: number;
  /**
   * Scrolls to the provided location a single time for the given value. A
   * different value must be provided to trigger this a second time.
   */
  scrollToOnce?: number;
  /**
   * Sets how quick the scrollToOnce settles to the new position. Set to 1 to
   * be essentially instant.
   */
  autoScrollDuration?: number;
  /**
   * This limits the list to only display so many rows before forcing scroll.
   * NOTE: When rowSize is a method for varying row sizes, this will means
   * rowDisplayCount will display the number of rows with THE LARGEST AVAILABLE
   * SIZE. So, do not expect this to auto adjust for the varying row sizes
   * available and be super magical.
   */
  rowDisplayCount?: number;

  /** Executes when the range of visible rows has changed */
  onRange?(start: number, end: number, total: number, isEnd: boolean): void;

  /** Executes on scroll events */
  onScroll?(
    scrollTop: number,
    maxScroll: number,
    viewBounds: DOMRectBounds,
    contentBounds: DOMRectBounds,
    isAutomated?: boolean
  ): void;
}

/**
 * This is a specialized scroll view that aids in recycling and rendering items
 */
export class ListView extends React.Component<IListView> {
  state = {
    top: 0,
    startIndex: 0,
    endIndex: 0,
    totalHeight: 0,
  };

  /**
   * This is the scrollview container this list uses for creating the scroll
   * space of the list.
   */
  container = React.createRef<ScrollView>();
  /**
   * When rowSize is a method, this is used to store the calculated row values.
   * This helps optimize the list to prevent deep looping in really large lists
   * of items.
   */
  rowTop: number[] = [];
  /**
   * This is a helper optimization. It stores the last row's most recently known
   * height. This helps speed up determining the total scroll area of the list.
   */
  lastRowHeight = 0;
  /** This tracks what row size is the largest row size */
  maxRowSize = -1;
  /**
   * This is the last row update context utilized to compute the row tops. If
   * this is different from the props rowUpdate value then it should trigger a
   * recalculation.
   */
  rowUpdateContext?: any;
  /** Used to indicate if this has been intiialized correctly yet. */
  mounted = false;
  /** Tracks the rows that will be measured when rendered */
  willMeasure = new Set<number>();
  /** Tracks the rows that are rendered and need immediate measuring for re-rendering */
  measuring = new Map<number, React.RefObject<HTMLDivElement> | undefined>();
  /**
   * This is set when the list detects rows that are auto calculated. Some
   * initialization behaviors need to be aware of this in order to perform the
   * initial render properly.
   */
  hasAutoHeightRows = false;
  /** Helps prevent double DOM monitors */
  isMonitoring: HTMLElement | undefined = void 0;
  /** Monitors DOM to aid in auto calculated row heights */
  observer?: MutationObserver;

  constructor(props: IListView) {
    super(props);
    this.shouldComponentUpdate(this.props);
  }

  componentDidMount() {
    this.mounted = true;
    this.forceUpdate();
    // this.monitorDOM(this.container?.current?.container.current);
    window.addEventListener("resize", this.handleResize);
  }

  componentWillUnmount() {
    if (this.observer) this.observer.disconnect();
    window.removeEventListener("resize", this.handleResize);
  }

  componentDidUpdate() {
    // If our state changes such that the DOM needs monitoring, we should check
    // for that here.
    // this.monitorDOM(this.container?.current?.container.current);

    if (this.measuring.size > 0) {
      const rows = Array.from(this.measuring.keys());
      const gap = this.props.rowGap || 0;
      rows.sort();
      // This will accumulate all of the row changes
      let rowDelta = 0;

      // We loop through the rows as they appear in order within the list. We
      // gather the changes in height to the rows and apply the changes to each
      // row as the measurement deviates from the suggested row height.
      for (let i = 0, iMax = rows.length; i < iMax; ++i) {
        const rowIndex = rows[i];
        const nextRowIndex = rows[i + 1] || this.rowTop.length - 1;

        // Final row does not need to adjust the row top of anything, but we use
        // the opportunity to ensure the last row's height is computed properly
        if (rowIndex === this.rowTop.length - 1) {
          const rowRef = this.measuring.get(rowIndex);
          if (!rowRef || !rowRef.current) continue;
          const rowBox = rowRef.current.getBoundingClientRect();
          this.lastRowHeight = rowBox.height + gap;
          this.willMeasure.delete(rowIndex);
          continue;
        }

        const rowTop = this.rowTop[rowIndex];
        const nextRowTop = this.rowTop[rowIndex + 1];
        // Measure the row
        const rowRef = this.measuring.get(rowIndex);
        // No row ref means nothing happens, but this shouldn't happen
        if (!rowRef || !rowRef.current) continue;
        const rowBox = rowRef.current.getBoundingClientRect();
        const newNextTop = rowTop + rowBox.height + gap;
        // Our change in row tops compounds as it travels through the rows that
        // need calculating, so we store it all up into a delta change.
        rowDelta = newNextTop - nextRowTop;
        // Successfully measured our row. We can now stop checking on it.
        this.willMeasure.delete(rowIndex);

        // Now apply the calculated change in row top to every row top up to the
        // next row that is changed.
        for (let k = rowIndex + 1; k <= nextRowIndex; ++k) {
          this.rowTop[k] += rowDelta;
        }
      }

      this.measuring.clear();

      // After recomputing all of the new row tops, we can re-render with our
      // new insight and thus shove everything to the appropriate positions.
      // This should also compute the new scroll area
      this.forceUpdate();
    }
  }

  /**
   *
   * We will use this to process incoming props to determine if the row tops
   * should be recalculated.
   */
  shouldComponentUpdate(nextProps: IListView) {
    // If our rowSize prop is going to be a method, then we need to see if the
    // row top calculations need updating
    if (isNumber(nextProps.rowSize)) {
      this.rowTop = [];
      this.maxRowSize = nextProps.rowSize;
      return true;
    }

    // See if we need a row top recalculation
    if (
      nextProps.rowUpdate !== this.rowUpdateContext ||
      nextProps.total !== this.props.total ||
      !this.mounted
    ) {
      this.queueRemeasure(nextProps);
      // Perform an additional remeasure to account for animations settling.
      setTimeout(() => {
        this.queueRemeasure(nextProps);
        this.forceUpdate();
      }, 500);
    }

    return true;
  }

  /**
   * Resets all rowTop calculation assumptions and queues all rows for
   * recalculating.
   */
  queueRemeasure(props: IListView) {
    if (isNumber(props.rowSize)) return;
    this.rowUpdateContext = props.rowUpdate;
    let top = 0;
    this.willMeasure.clear();
    this.rowTop = [];

    // Use the height of the row to calculate the top of the next row
    for (let i = 0; i < props.total; ++i) {
      // this.rowTop[i] = top;
      let nextSize = props.rowSize(i, i === props.total - 1);

      // If the size is negative, that means the value is a suggested size and
      // the row will be measured to provide a better fit.
      if (nextSize < 0) {
        nextSize *= -1;
        this.willMeasure.add(i);
        this.hasAutoHeightRows = true;

        // For dynamic row heights, we only acknowledge the new top if there
        // has not been a top established before. This keeps us able to only
        // assess new row heights on render of the row so the component can
        // adjust properly once we reach the row.
        if (!this.rowTop[i]) {
          this.rowTop[i] = top;
        }
      }

      // We acknowledge the new row top of this row for static row heights
      else {
        this.rowTop[i] = top;
      }

      if (i === props.total - 1) {
        this.lastRowHeight = nextSize;
      }

      this.maxRowSize = Math.max(this.maxRowSize, nextSize);
      top += nextSize;
    }
  }

  /**
   * This starts a MutationObserver with debounce to react to DOM changes. This
   * is used for when there are auto calculated row heights within this list
   * component.
   */
  monitorDOM(node?: HTMLElement | null) {
    if (this.hasAutoHeightRows && node && this.isMonitoring !== node) {
      // Make sure we clean out any existing observer
      if (this.observer) this.observer.disconnect();

      this.isMonitoring = node;
      let timer: number;

      // This is a debounced method that will trigger a row recalculation after
      // the debounce period has been cleared.
      const reset = () => {
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          this.recalculateRows();
        }, 500);
      };

      const MutationObserver =
        window.MutationObserver || (window as any).WebKitMutationObserver;
      this.observer = new MutationObserver(reset);

      // Look for any changes to the DOM
      this.observer.observe(node, {
        subtree: true,
        attributes: true,
        childList: true,
      });

      reset();
    }
  }

  /**
   * Gets the computed scroll height
   */
  get scrollHeight() {
    const { rowSize, total } = this.props;
    if (isNumber(rowSize)) return total * rowSize;

    // If we are computing each row, we just take the final row's top + that
    // row's height
    return (this.rowTop[total - 1] || 0) + Math.abs(this.lastRowHeight);
  }

  /**
   * Applies a calculated style object for the scroll view. This keeps the
   * integrity of the containerProps
   */
  get scrollStyle(): React.CSSProperties {
    const { containerProps = {}, rowDisplayCount = 0 } = this.props;
    const { style } = containerProps;
    const added: React.CSSProperties = {};

    if (rowDisplayCount > 0) {
      added.maxHeight = rowDisplayCount * this.maxRowSize;
    }

    return {
      ...added,
      ...style,
    };
  }

  handleResize = () => {
    if (this.hasAutoHeightRows) {
      for (let i = 0; i < this.props.total; ++i) this.willMeasure.add(i);
      this.forceUpdate();
    }
  };

  handleScroll = (
    scrollTop: number,
    maxScroll: number,
    viewBounds: DOMRectBounds,
    contentBounds: DOMRectBounds
  ) => {
    const { rowSize, total, onScroll, onRange } = this.props;

    let startIndex = -1;
    let endIndex = -1;

    if (isNumber(rowSize)) {
      // We need to calculate the visible range of elements here. If that range changes
      // then we should trigger a re-render.
      startIndex = Math.floor(scrollTop / rowSize) - 1;
      endIndex = Math.floor((scrollTop + viewBounds.height) / rowSize) + 1;
    } else {
      startIndex = 0;
      endIndex = 0;
      let check = 0;
      let checkIndex = -1;
      const bottom = scrollTop + viewBounds.height;

      while (check < scrollTop && ++checkIndex < this.rowTop.length) {
        check = this.rowTop[checkIndex];
      }

      startIndex = checkIndex - 1;

      while (check < bottom && ++checkIndex < this.rowTop.length) {
        check = this.rowTop[checkIndex];
      }

      endIndex = checkIndex + 1;
    }

    // Clamp our values to a valid range
    startIndex = Math.min(Math.max(startIndex, 0), total - 1);
    endIndex = Math.min(Math.max(endIndex, 0), total - 1);

    if (
      startIndex !== this.state.startIndex ||
      endIndex !== this.state.endIndex
    ) {
      onRange?.(startIndex, endIndex, total, endIndex === total - 1);
      this.setState({
        startIndex,
        endIndex,
      });
    }

    if (onScroll) {
      onScroll(scrollTop, maxScroll, viewBounds, contentBounds);
    }
  };

  /**
   * This forces a recomputing of the rows. This is used when it is suspected
   * the DOM has changed in a way that would affect the heights of each row.
   */
  recalculateRows = () => {
    this.rowUpdateContext = !this.props.rowUpdate;
    this.setState({});
  };

  render() {
    const {
      allowTouchInertia,
      children,
      className,
      containerProps,
      total,
      scrollToOnce,
      autoScrollDuration,
    } = this.props;

    const isEmpty = total <= 0;

    if (isEmpty) {
      return (
        <div className={classnames("ListView", "ListView--empty", className)}>
          <div className="ListView__Empty">{this.props.emptyLabel}</div>
        </div>
      );
    }

    return (
      <ScrollView
        ref={this.container}
        allowTouchInertia={allowTouchInertia}
        className={classnames("ListView", className)}
        scrollHeight={this.scrollHeight}
        containerProps={{
          ...containerProps,
          style: this.scrollStyle,
        }}
        scrollTopOnce={scrollToOnce}
        autoScrollDuration={autoScrollDuration}
        onScroll={this.handleScroll}
      >
        {this.renderListItems(children)}
      </ScrollView>
    );
  }

  private renderListItems(renderMethod?: React.FunctionComponent<IRowProps>) {
    const { startIndex, endIndex } = this.state;
    const { rowSize, total } = this.props;
    if (!renderMethod) return null;
    const rows: React.ReactElement<any, any>[] = [];

    // Figure out the means for computing the top value of the row
    let getTop;

    if (isNumber(rowSize)) {
      getTop = (i: number) => i * rowSize;
    } else {
      getTop = (i: number) => this.rowTop[i];
    }

    for (let i = startIndex; i <= endIndex && i < total; ++i) {
      const top = getTop(i);
      let ref: React.RefObject<HTMLDivElement> | undefined = void 0;

      if (this.willMeasure.has(i) && !this.measuring.has(i)) {
        ref = React.createRef<HTMLDivElement>();
        this.measuring.set(i, ref);
      }

      const style: React.CSSProperties = {
        position: "absolute",
        width: "100%",
        left: 0,
        top,
      };

      // We pass the information for the row to the render function component so
      // it can apply the list row styles as needed to make the component comply
      // with the desired positioning within the list view space
      const row: React.ReactElement<any, any> | null = renderMethod({
        index: i,
        style: {},
        isEnd: i === endIndex || i === total - 1,
      });

      if (!row || !React.isValidElement(row)) return null;

      // If the row is intended to be measured, the only reliable and reduced
      // complexity of use is to wrap the component for the row in an html
      // container. We do this because it's hard to make assumptions about what
      // gets rendered into a row (component, functional component, string, etc)
      // so it's hard to normalize getting an element that we can measure
      rows.push(
        <div key={i} className="ListView__Row" ref={ref} style={style}>
          {row}
        </div>
      );
    }

    return rows;
  }
}
