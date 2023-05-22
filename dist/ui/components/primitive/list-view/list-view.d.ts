import React from "react";
import { DOMRectBounds } from "../../../../util/clone-client-rect";
import { INestedChildren } from "../../../../util/types";
import { ScrollView } from "../scroll-view/scroll-view";
import "./list-view.scss";
export interface IRowProps {
    index: number;
    style?: React.CSSProperties;
    isEnd: boolean;
}
export interface IListView extends INestedChildren<React.FunctionComponent<IRowProps>> {
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
    onScroll?(scrollTop: number, maxScroll: number, viewBounds: DOMRectBounds, contentBounds: DOMRectBounds, isAutomated?: boolean): void;
}
/**
 * This is a specialized scroll view that aids in recycling and rendering items
 */
export declare class ListView extends React.Component<IListView> {
    state: {
        top: number;
        startIndex: number;
        endIndex: number;
        totalHeight: number;
    };
    /**
     * This is the scrollview container this list uses for creating the scroll
     * space of the list.
     */
    container: React.RefObject<ScrollView>;
    /**
     * When rowSize is a method, this is used to store the calculated row values.
     * This helps optimize the list to prevent deep looping in really large lists
     * of items.
     */
    rowTop: number[];
    /**
     * This is a helper optimization. It stores the last row's most recently known
     * height. This helps speed up determining the total scroll area of the list.
     */
    lastRowHeight: number;
    /** This tracks what row size is the largest row size */
    maxRowSize: number;
    /**
     * This is the last row update context utilized to compute the row tops. If
     * this is different from the props rowUpdate value then it should trigger a
     * recalculation.
     */
    rowUpdateContext?: any;
    /** Used to indicate if this has been intiialized correctly yet. */
    mounted: boolean;
    /** Tracks the rows that will be measured when rendered */
    willMeasure: Set<number>;
    /** Tracks the rows that are rendered and need immediate measuring for re-rendering */
    measuring: Map<number, React.RefObject<HTMLDivElement> | undefined>;
    /**
     * This is set when the list detects rows that are auto calculated. Some
     * initialization behaviors need to be aware of this in order to perform the
     * initial render properly.
     */
    hasAutoHeightRows: boolean;
    /** Helps prevent double DOM monitors */
    isMonitoring: HTMLElement | undefined;
    /** Monitors DOM to aid in auto calculated row heights */
    observer?: MutationObserver;
    constructor(props: IListView);
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    /**
     *
     * We will use this to process incoming props to determine if the row tops
     * should be recalculated.
     */
    shouldComponentUpdate(nextProps: IListView): boolean;
    /**
     * Resets all rowTop calculation assumptions and queues all rows for
     * recalculating.
     */
    queueRemeasure(props: IListView): void;
    /**
     * This starts a MutationObserver with debounce to react to DOM changes. This
     * is used for when there are auto calculated row heights within this list
     * component.
     */
    monitorDOM(node?: HTMLElement | null): void;
    /**
     * Gets the computed scroll height
     */
    get scrollHeight(): number;
    /**
     * Applies a calculated style object for the scroll view. This keeps the
     * integrity of the containerProps
     */
    get scrollStyle(): React.CSSProperties;
    handleResize: () => void;
    handleScroll: (scrollTop: number, maxScroll: number, viewBounds: DOMRectBounds, contentBounds: DOMRectBounds) => void;
    /**
     * This forces a recomputing of the rows. This is used when it is suspected
     * the DOM has changed in a way that would affect the heights of each row.
     */
    recalculateRows: () => void;
    render(): JSX.Element;
    private renderListItems;
}
