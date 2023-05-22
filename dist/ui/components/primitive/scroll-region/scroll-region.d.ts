import React from "react";
import { DOMRectBounds } from "../../../../util/clone-client-rect";
import { INestedChildren } from "../../../../util/types";
import "./scroll-region.scss";
export declare const ScrollRegionMode: {
    readonly LIGHT: "ScrollRegion--light";
    readonly DARK: "ScrollRegion--dark";
};
export type ScrollRegionModeType = (typeof ScrollRegionMode)[keyof typeof ScrollRegionMode];
export interface IScrollRegion extends INestedChildren<React.ReactNode> {
    /** When set, the scroll will have some inertia for touch controls */
    allowTouchInertia?: boolean;
    /** Provides a custom class name to the container of this component */
    className?: string;
    /** Applies a custom class to the content portion of the scroll region */
    contentClassName?: string;
    /** Rendering mode of this scrollRegion */
    mode?: ScrollRegionModeType;
    /** Props to apply directly to the container div of this component */
    containerProps?: React.HTMLProps<HTMLDivElement>;
    /** Props to apply directly to the scrollRegion content panel container */
    contentProps?: React.HTMLProps<HTMLDivElement>;
    /**
     * When true, scroll events will stop being absorbed by this scroll region when
     * the user tries to scroll beyond the max bounds of the scroll region.
     */
    allowScrollFlowThrough?: boolean;
    /** This forces a maximum amount of scroll room */
    scrollHeight?: number;
    /** Sets this scroll region to the given scroll location */
    scrollToOnce?: [number, number];
    /**
     * Sets how quick the scrollTopOnce settles to the new position. Set to 1 to
     * be essentially instant.
     */
    autoScrollDuration?: number;
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
     * When this view changes the scroll top or left value it provides it in this
     * callback
     *
     * isAutomated is true when the system is scrolling the view and not the user.
     */
    onScroll?(scroll: [number, number], scrollMax: [number, number], viewBounds: DOMRectBounds, contentBounds: DOMRectBounds, isAutomated?: boolean): void;
}
interface IState {
    isOpen: boolean;
    isDragging: boolean;
    top: [number, number];
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
 * This is a custom scroller for rendering a custom scrollbar for an X and Y
 * axis scrolling.
 */
export declare class ScrollRegion extends React.Component<IScrollRegion, IState> {
    state: IState;
    container: React.RefObject<HTMLDivElement>;
    private wrapper;
    private content;
    private scrolledToOnce?;
    private currentScrollHeight?;
    private initialized;
    private childrenChanged;
    private isUpdatingChildren;
    private animateScrollId;
    private touch;
    getSnapshotBeforeUpdate(prevProps: Readonly<IScrollRegion>): null;
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
    handleHorizontalBarDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    handleVerticalBarDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    render(): JSX.Element;
}
export {};
