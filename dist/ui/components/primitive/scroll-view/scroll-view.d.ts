import React from "react";
import { DOMRectBounds } from "../../../../util/clone-client-rect";
import { INestedChildren } from "../../../../util/types";
import "./scroll-view.scss";
export declare enum ScrollBarSide {
    RIGHT = 0,
    LEFT = 1
}
export declare const ScrollViewMode: {
    readonly LIGHT: "ScrollView--light";
    readonly DARK: "ScrollView--dark";
};
export type ScrollViewModeType = (typeof ScrollViewMode)[keyof typeof ScrollViewMode];
export interface IScrollView extends INestedChildren<React.ReactNode> {
    /** When set, the scroll will have some inertia for touch controls */
    allowTouchInertia?: boolean;
    /** Provides a custom class name to the container of this component */
    className?: string;
    /** Applies a custom class to the content portion of the scroll view */
    contentClassName?: string;
    /** Rendering mode of this scrollview */
    mode?: ScrollViewModeType;
    /** Props to apply directly to the container div of this component */
    containerProps?: React.HTMLProps<HTMLDivElement>;
    /** Props to apply directly to the scrollview content panel container */
    contentProps?: React.HTMLProps<HTMLDivElement>;
    /**
     * When true, scroll events will stop being absorbed by this scroll view when
     * the user tries to scroll beyond the max bounds of the scroll region.
     */
    allowScrollFlowThrough?: boolean;
    /** This forces a maximum amount of scroll room */
    scrollHeight?: number;
    /** Sets this scroll view to the given scroll top value */
    scrollTopOnce?: number;
    /**
     * Sets how quick the scrollTopOnce settles to the new position. Set to 1 to
     * be essentially instant.
     */
    autoScrollDuration?: number;
    /** Determines which side the scroll bar should appear on */
    side?: ScrollBarSide;
    /**
     * Set to make this view manage horizontal scrolling instead of vertical.
     * ALl of the "top" and "height" related properties will be applied
     * horizontally instead of vertically.
     */
    horizontal?: boolean;
    /**
     * Causes wheel events that are more biased to horizontal scrolling to be
     * absorbed and used by this view.
     */
    onlyHorizontalWheel?: boolean;
    /**
     * When set to true, this will always show the scroll bar as visible as long
     * as the space can be scrolled. If the space is not scrollable, the scroll
     * bar will be hidden.
     */
    alwaysShowScroll?: boolean;
    /**
     * Disables using the wheel to scroll this view.
     */
    preventWheel?: boolean;
    /**
     * When this view changes the scroll top value it provides it in this callback
     *
     * isAutomated is true when the system is scrolling the view and not the user.
     */
    onScroll?(scrollTop: number, scrollMax: number, viewBounds: DOMRectBounds, contentBounds: DOMRectBounds, isAutomated?: boolean): void;
}
interface IState {
    isOpen: boolean;
    isDragging: boolean;
    top: number;
    bounds?: DOMRectBounds;
    contentBounds?: DOMRectBounds;
    /**
     * This is set to true when the scroll is supposed to self animate. This will
     * only happen temporarily for automation and can not remain active while the
     * user interacts with the scrolling manually.
     */
    animating?: boolean;
}
/**
 * This is a custom scroller for rendering a custom scrollbar
 */
export declare class ScrollView extends React.Component<IScrollView, IState> {
    state: IState;
    container: React.RefObject<HTMLDivElement>;
    private content;
    private scrolledToOnce?;
    private currentScrollHeight?;
    private initialized;
    private childrenChanged;
    private isUpdatingChildren;
    private animateScrollId;
    private touch;
    getSnapshotBeforeUpdate(prevProps: Readonly<IScrollView>): null;
    init: () => void;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    private animateScrollOnce;
    private getScrollMetrics;
    handleResize: () => void;
    handleTouchStart: (e: TouchEvent) => void;
    handleTouchEnd: (e: TouchEvent) => void;
    handleTouchMove: (e: TouchEvent) => void;
    handleWheel: (e: WheelEvent) => void;
    handleBarDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    render(): JSX.Element;
}
export {};
