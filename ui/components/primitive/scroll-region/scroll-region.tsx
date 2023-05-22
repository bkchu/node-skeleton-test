import React from "react";
import { classnames } from "../../../../util/classnames";
import { DOMRectBounds } from "../../../../util/clone-client-rect";
import { INestedChildren } from "../../../../util/types";
import { normalizeWheel } from "../../../../util/normalize-wheel";
import { stopPropagation } from "../../../../util/stop-propagation";
import { when } from "../../../../util/when";
import "./scroll-region.scss";

const { min, max } = Math;

function clamp(x: number, minVal: number, maxVal: number) {
  return min(max(x, minVal), maxVal);
}

function easeInOutCubic(start: number, end: number, t: number) {
  t = clamp(t, 0, 1);
  const time =
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  return (end - start) * time + start;
}

export const ScrollRegionMode = {
  LIGHT: "ScrollRegion--light",
  DARK: "ScrollRegion--dark",
} as const;

export type ScrollRegionModeType =
  (typeof ScrollRegionMode)[keyof typeof ScrollRegionMode];

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
  onScroll?(
    scroll: [number, number],
    scrollMax: [number, number],
    viewBounds: DOMRectBounds,
    contentBounds: DOMRectBounds,
    isAutomated?: boolean
  ): void;
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
export class ScrollRegion extends React.Component<IScrollRegion, IState> {
  state: IState = {
    isOpen: false,
    isDragging: false,
    top: [0, 0],
  };

  container = React.createRef<HTMLDivElement>();
  private wrapper = React.createRef<HTMLDivElement>();
  private content = React.createRef<HTMLDivElement>();
  private scrolledToOnce?: [number, number];
  private currentScrollHeight?: number;
  private initialized = false;
  private childrenChanged = false;
  private isUpdatingChildren = false;
  private animateScrollId = -1;
  private touch = {
    id: 0,
    position: [0, 0],
    inertia: [0, 0],
    animation: -1,
  };

  getSnapshotBeforeUpdate(prevProps: Readonly<IScrollRegion>) {
    if (!this.isUpdatingChildren) {
      this.childrenChanged = prevProps.children === this.props.children;
    }

    this.isUpdatingChildren = false;
    return null;
  }

  init = () => {
    const { bounds, contentBounds } = this.state;

    // Don't trigger an initial scroll event until there is something able to
    // scroll
    if (
      !bounds?.width ||
      !contentBounds?.width ||
      bounds.width >= contentBounds.width
    ) {
      return;
    }

    if (
      !bounds?.height ||
      !contentBounds?.height ||
      bounds.height >= contentBounds.height
    ) {
      return;
    }

    if (!this.initialized && bounds && contentBounds && this.content.current) {
      this.initialized = true;

      if (this.props.onScroll) {
        const metrics = this.getScrollMetrics();
        this.props.onScroll(
          [this.content.current.scrollLeft, this.content.current.scrollTop],
          metrics.scrollSpace,
          bounds,
          contentBounds
        );
      }
    }
  };

  componentDidMount() {
    this.componentDidUpdate();
    window.addEventListener("resize", this.handleResize);

    // Initial scroll broadcast to indicate initial scroll position
    setTimeout(() => this.componentDidUpdate(), 10);

    // We HAVE to manually add the event to get around the React + Chrome issues that exists
    // with passive event listeners.
    if (this.container.current) {
      this.container.current.addEventListener("wheel", this.handleWheel, {
        passive: false,
      });

      this.container.current.addEventListener(
        "touchmove",
        this.handleTouchMove,
        {
          passive: false,
        }
      );

      this.container.current.addEventListener(
        "touchstart",
        this.handleTouchStart
      );

      this.container.current.addEventListener("touchend", this.handleTouchEnd);
    }
  }

  componentDidUpdate() {
    const { bounds, contentBounds } = this.state;

    if (
      (!this.state.bounds || this.childrenChanged) &&
      this.wrapper.current &&
      this.content.current &&
      this.container.current
    ) {
      this.childrenChanged = false;
      this.isUpdatingChildren = true;
      const bounds = this.container.current.getBoundingClientRect();
      const contentBounds = this.wrapper.current.getBoundingClientRect();

      if (this.props.onScroll) {
        const metrics = this.getScrollMetrics();

        this.props.onScroll(
          [this.content.current.scrollLeft, this.content.current.scrollTop],
          metrics.scrollSpace,
          bounds,
          contentBounds
        );
      }

      this.setState({
        bounds,
        contentBounds,
      });
    }

    // Handle bounds and content bounds changes
    if (
      bounds &&
      contentBounds &&
      this.wrapper.current &&
      this.container.current
    ) {
      const checkContainer = this.container.current.getBoundingClientRect();
      const checkContent = this.wrapper.current.getBoundingClientRect();

      if (
        checkContainer.width !== bounds.width ||
        checkContainer.height !== bounds.height ||
        checkContent.width !== contentBounds.width ||
        checkContent.height !== contentBounds.height
      ) {
        this.setState({
          bounds: checkContainer,
          contentBounds: checkContent,
        });
      }
    }

    // Handle scrollToOnce application
    const scrollToOnce = this.props.scrollToOnce;

    if (
      scrollToOnce !== void 0 &&
      isNaN(scrollToOnce[0]) &&
      isNaN(scrollToOnce[1])
    ) {
      scrollToOnce[0] = 0;
      scrollToOnce[1] = 0;
    }

    if (
      bounds &&
      contentBounds &&
      this.content.current &&
      this.container.current &&
      this.scrolledToOnce !== scrollToOnce
    ) {
      const bounds = this.container.current.getBoundingClientRect();
      const contentBounds = this.wrapper.current?.getBoundingClientRect();

      this.scrolledToOnce = scrollToOnce || [0, 0];
      const scrollTo = this.scrolledToOnce;
      let startValue: [number, number] = [
        this.content.current.scrollLeft,
        this.content.current.scrollTop,
      ];

      // Handle instantaneous scroll changes
      if (this.props.autoScrollDuration === 0) {
        startValue = this.scrolledToOnce;

        this.content.current.scrollLeft = startValue[0];
        this.content.current.scrollTop = startValue[1];
      }

      this.setState({
        top: startValue,
        bounds,
        contentBounds,
        animating: true,
      });

      window.cancelAnimationFrame(this.animateScrollId);

      if (this.props.autoScrollDuration !== 0) {
        this.animateScrollId = requestAnimationFrame(
          this.animateScrollOnce(startValue, scrollTo)
        );
      }

      // Broadcast for initial scroll change
      if (
        this.props.onScroll &&
        bounds &&
        contentBounds &&
        this.container.current
      ) {
        const metrics = this.getScrollMetrics(bounds, contentBounds);
        this.props.onScroll(
          [this.content.current.scrollLeft, this.content.current.scrollTop],
          metrics.scrollSpace,
          bounds,
          contentBounds
        );
      }
    }

    // Broadcast scroll metrics when the scroll height changes
    else if (
      bounds &&
      contentBounds &&
      this.content.current &&
      this.currentScrollHeight !== this.props.scrollHeight &&
      this.props.onScroll
    ) {
      this.currentScrollHeight = this.props.scrollHeight;
      const metrics = this.getScrollMetrics();
      this.props.onScroll(
        [this.content.current.scrollLeft, this.content.current.scrollTop],
        metrics.scrollSpace,
        bounds,
        contentBounds
      );
    }
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleResize);

    if (this.container.current) {
      this.container.current.removeEventListener("wheel", this.handleWheel);
      this.container.current.removeEventListener(
        "touchmove",
        this.handleTouchMove
      );
      this.container.current.removeEventListener(
        "touchstart",
        this.handleTouchStart
      );
      this.container.current.removeEventListener(
        "touchend",
        this.handleTouchEnd
      );
    }
  }

  private animateScrollOnce = (
    startValue: [number, number],
    scrollTo: [number, number]
  ) => {
    let start = 0;
    const duration = this.props.autoScrollDuration || 170;

    const doAnimate = (t: number) => {
      if (!this.container.current) return;
      if (!this.content.current) return;
      if (!this.wrapper.current) return;

      const bounds = this.container.current.getBoundingClientRect();
      const contentBounds = this.wrapper.current?.getBoundingClientRect();
      const metrics = this.getScrollMetrics(bounds, contentBounds);

      if (!this.container.current) return;
      if (!start) start = t;
      const time = (t - start) / duration;
      const scroll = [
        easeInOutCubic(startValue[0], scrollTo[0], time),
        easeInOutCubic(startValue[1], scrollTo[1], time),
      ];

      this.content.current.scrollLeft = Math.max(
        Math.min(scroll[0] || 0, metrics.scrollSpace[0]),
        0
      );

      this.content.current.scrollTop = Math.max(
        Math.min(scroll[1] || 0, metrics.scrollSpace[1]),
        0
      );

      this.setState({
        top: [this.content.current.scrollLeft, this.content.current.scrollTop],
        bounds,
        contentBounds,
      });

      if (
        this.props.onScroll &&
        bounds &&
        contentBounds &&
        this.container.current
      ) {
        this.props.onScroll(
          [this.content.current.scrollLeft, this.content.current.scrollTop],
          metrics.scrollSpace,
          bounds,
          contentBounds,
          true
        );
      }

      if (this.state.animating && time < 1) {
        this.animateScrollId = requestAnimationFrame(doAnimate);
      }
    };

    return doAnimate;
  };

  private getScrollMetrics(
    forceBounds?: DOMRectBounds,
    forceContentBounds?: DOMRectBounds
  ) {
    let { bounds, contentBounds } = this.state;
    bounds = forceBounds || bounds;
    contentBounds = forceContentBounds || contentBounds;

    const barSizes: [number, number] = [0, 0];
    const barRatio: [number, number] = [1, 1];
    const barSpace: [number, number] = [0, 0];
    const scrollSpace: [number, number] = [0, 0];

    if (bounds && contentBounds) {
      barRatio[0] = bounds.width / contentBounds.width;
      barSizes[0] = barRatio[0] * bounds.width;
      barSizes[0] = Math.max(barSizes[0], 30);
      barSizes[0] = Math.min(barSizes[0], bounds.width);
    }

    if (barRatio[0] < 1 && bounds && contentBounds) {
      barSpace[0] = bounds.width - barSizes[0];
      scrollSpace[0] = contentBounds.width - bounds.width;
    }

    if (bounds && contentBounds) {
      barRatio[1] = bounds.height / contentBounds.height;
      barSizes[1] = barRatio[1] * bounds.height;
      barSizes[1] = Math.max(barSizes[1], 30);
      barSizes[1] = Math.min(barSizes[1], bounds.height);
    }

    if (barRatio[1] < 1 && bounds && contentBounds) {
      barSpace[1] = bounds.height - barSizes[1];
      scrollSpace[1] = contentBounds.height - bounds.height;
    }

    const out = {
      barSizes,
      barRatio,
      barSpace,
      scrollSpace,
    };

    return out;
  }

  handleResize = () => {
    this.setState({
      bounds: undefined,
      contentBounds: undefined,
    });
  };

  handleTouchStart = (e: TouchEvent) => {
    let touch: Touch | null = null;

    for (let i = 0, iMax = e.touches.length; i < iMax; ++i) {
      touch = e.touches.item(i);
      if (touch) {
        break;
      }
    }

    if (touch) {
      this.touch.position = [touch.pageX, touch.pageY];
      this.touch.id = touch.identifier;
    }

    this.setState({ top: this.state.top, isOpen: true, animating: false });
    cancelAnimationFrame(this.touch.animation);
    this.touch.animation = -1;
  };

  handleTouchEnd = (e: TouchEvent) => {
    let touch: Touch | null = null;
    for (let i = 0, iMax = e.touches.length; i < iMax; ++i) {
      touch = e.touches.item(i);
      if (touch) {
        if (touch.identifier === this.touch.id) break;
        touch = null;
      }
    }

    if (!touch) {
      for (let i = 0, iMax = e.targetTouches.length; i < iMax; ++i) {
        touch = e.targetTouches.item(i);
        if (touch) {
          if (touch.identifier === this.touch.id) break;
          touch = null;
        }
      }
    }

    if (!touch) {
      for (let i = 0, iMax = e.changedTouches.length; i < iMax; ++i) {
        touch = e.changedTouches.item(i);
        if (touch) {
          if (touch.identifier === this.touch.id) break;
          touch = null;
        }
      }
    }

    if (!touch) return;
    this.setState({ top: this.state.top, isOpen: false });

    if (
      (Math.abs(this.touch.inertia[0]) > 0 ||
        Math.abs(this.touch.inertia[1]) > 0) &&
      this.content.current
    ) {
      const { bounds, contentBounds } = this.state;
      const current = this.content.current;
      cancelAnimationFrame(this.touch.animation);

      const animateInertia = () => {
        current.scrollLeft += this.touch.inertia[0];
        current.scrollTop += this.touch.inertia[1];
        const metrics = this.getScrollMetrics();
        current.scrollLeft = Math.min(
          current.scrollLeft,
          metrics.scrollSpace[0]
        );
        current.scrollTop = Math.min(current.scrollTop, metrics.scrollSpace[1]);

        this.setState({
          top: [current.scrollLeft, current.scrollTop],
        });

        if (this.props.onScroll && bounds && contentBounds) {
          this.props.onScroll(
            [current.scrollLeft, current.scrollTop],
            metrics.scrollSpace,
            bounds,
            contentBounds
          );
        }

        this.touch.inertia[0] *= 0.95;
        this.touch.inertia[1] *= 0.95;
        if (
          Math.abs(this.touch.inertia[0]) > 0.001 ||
          Math.abs(this.touch.inertia[1]) > 0.001
        ) {
          requestAnimationFrame(animateInertia);
        } else this.touch.animation = -1;
      };

      this.touch.animation = requestAnimationFrame(animateInertia);
    }
  };

  handleTouchMove = (e: TouchEvent) => {
    if (!(e.currentTarget instanceof HTMLDivElement)) return;
    if (!this.content.current) return;
    const { bounds, contentBounds, isOpen } = this.state;

    let touch: Touch | null = null;
    for (let i = 0, iMax = e.touches.length; i < iMax; ++i) {
      touch = e.touches.item(i);
      if (touch) {
        if (touch.identifier === this.touch.id) break;
      }
    }

    if (!touch) return;

    this.content.current.scrollLeft += this.touch.position[0] - touch.pageX;
    this.content.current.scrollTop += this.touch.position[1] - touch.pageY;
    this.touch.inertia[0] = this.touch.position[0] - touch.pageX;
    this.touch.inertia[1] = this.touch.position[1] - touch.pageY;

    if (!this.props.allowTouchInertia) {
      this.touch.inertia = [0, 0];
    }

    this.touch.position = [touch.pageX, touch.pageY];
    const metrics = this.getScrollMetrics();

    this.content.current.scrollLeft = Math.min(
      this.content.current.scrollLeft,
      metrics.scrollSpace[0]
    );

    this.content.current.scrollTop = Math.min(
      this.content.current.scrollTop,
      metrics.scrollSpace[1]
    );

    this.setState({
      top: [this.content.current.scrollLeft, this.content.current.scrollTop],
      animating: false,
    });

    if (this.props.onScroll && bounds && contentBounds) {
      this.props.onScroll(
        [this.content.current.scrollLeft, this.content.current.scrollTop],
        metrics.scrollSpace,
        bounds,
        contentBounds
      );
    }

    if (
      isOpen &&
      bounds &&
      (metrics.barRatio[0] < 1 || metrics.barRatio[1] < 1)
    ) {
      stopPropagation(e);
    }

    cancelAnimationFrame(this.touch.animation);
  };

  handleWheel = (e: WheelEvent) => {
    if (!(e.currentTarget instanceof HTMLDivElement)) return;
    if (this.props.preventWheel) return;
    if (!this.content.current) return;

    const { bounds, contentBounds, isOpen } = this.state;
    const wheel = normalizeWheel(e);

    const newLeft = this.content.current.scrollLeft + wheel.pixelX;
    const newTop = this.content.current.scrollTop - wheel.pixelY;

    const metrics = this.getScrollMetrics();

    this.content.current.scrollLeft = Math.min(newLeft, metrics.scrollSpace[0]);

    this.content.current.scrollTop = Math.min(newTop, metrics.scrollSpace[1]);

    this.setState({
      top: [this.content.current.scrollLeft, this.content.current.scrollTop],
      animating: false,
    });

    if (this.props.onScroll && bounds && contentBounds) {
      this.props.onScroll(
        [this.content.current.scrollLeft, this.content.current.scrollTop],
        metrics.scrollSpace,
        bounds,
        contentBounds
      );
    }

    if (
      isOpen &&
      bounds &&
      (metrics.barRatio[0] < 1 || metrics.barRatio[1] < 1)
    ) {
      if (this.props.allowScrollFlowThrough) {
        if (
          (Math.floor(this.content.current.scrollLeft) <
            Math.floor(metrics.scrollSpace[0]) &&
            Math.floor(this.content.current.scrollLeft) > 0) ||
          (Math.floor(this.content.current.scrollTop) <
            Math.floor(metrics.scrollSpace[1]) &&
            Math.floor(this.content.current.scrollTop) > 0)
        ) {
          stopPropagation(e);
        }
      } else {
        stopPropagation(e);
      }
    }
  };

  handleHorizontalBarDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const { bounds, contentBounds } = this.state;
    // Once the bar is mouse downed, we begin to start the dragging process which
    // should be registered across the whole document
    const metrics = this.getScrollMetrics();

    // We must calculate how much one pixel of movement would scroll the content
    const pixelScroll = [
      metrics.scrollSpace[0] / metrics.barSpace[0],
      metrics.scrollSpace[1] / metrics.barSpace[1],
    ];
    let startPos = [e.nativeEvent.clientX, e.nativeEvent.clientY];

    this.setState({
      isDragging: true,
      animating: false,
    });

    const target = e.currentTarget;
    const pointerId = e.pointerId;
    target.setPointerCapture(pointerId);

    const mousemove = (e: MouseEvent) => {
      // See if our mouse left click for drag button is still down (it can be
      // lifted off document thus be missed in the event)
      if ("which" in e) {
        if (!(e.which & 0b01)) {
          mouseup();
          return;
        }
      } else if (!((e as any).buttons & 0b01)) {
        mouseup();
        return;
      }

      const newPos = [e.clientX, e.clientY];
      const deltaPos = [newPos[0] - startPos[0], newPos[1] - startPos[1]];
      startPos = newPos;

      if (this.content.current) {
        const newLeft =
          this.content.current.scrollLeft + deltaPos[0] * pixelScroll[0];

        this.content.current.scrollLeft = Math.min(
          newLeft,
          metrics.scrollSpace[0]
        );

        this.setState({
          top: [
            this.content.current.scrollLeft,
            this.content.current.scrollTop,
          ],
        });
      }

      // Prevent any event bubbling to prevent any default dragging behaviorss
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
      e.cancelBubble = true;
      e.returnValue = false;

      // Make sure the scroll info is broadcast still
      if (
        this.props.onScroll &&
        bounds &&
        contentBounds &&
        this.content.current
      ) {
        this.props.onScroll(
          [this.content.current.scrollLeft, this.content.current.scrollTop],
          metrics.scrollSpace,
          bounds,
          contentBounds
        );
      }

      return false;
    };

    const mouseup = () => {
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
      target.removeEventListener("mouseup", mouseup);
      target.releasePointerCapture(pointerId);

      this.setState({
        isDragging: false,
      });
    };

    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
    target.addEventListener("mouseup", mouseup);
  };

  handleVerticalBarDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const { bounds, contentBounds } = this.state;
    // Once the bar is mouse downed, we begin to start the dragging process which
    // should be registered across the whole document
    const metrics = this.getScrollMetrics();

    // We must calculate how much one pixel of movement would scroll the content
    const pixelScroll = [
      metrics.scrollSpace[0] / metrics.barSpace[0],
      metrics.scrollSpace[1] / metrics.barSpace[1],
    ];
    let startPos = [e.nativeEvent.clientX, e.nativeEvent.clientY];

    this.setState({
      isDragging: true,
      animating: false,
    });

    const target = e.currentTarget;
    const pointerId = e.pointerId;
    target.setPointerCapture(pointerId);

    const mousemove = (e: MouseEvent) => {
      // See if our mouse left click for drag button is still down (it can be
      // lifted off document thus be missed in the event)
      if ("which" in e) {
        if (!(e.which & 0b01)) {
          mouseup();
          return;
        }
      } else if (!((e as any).buttons & 0b01)) {
        mouseup();
        return;
      }

      const newPos = [e.clientX, e.clientY];
      const deltaPos = [newPos[0] - startPos[0], newPos[1] - startPos[1]];
      startPos = newPos;

      if (this.content.current) {
        const newTop =
          this.content.current.scrollTop + deltaPos[1] * pixelScroll[1];

        this.content.current.scrollTop = Math.min(
          newTop,
          metrics.scrollSpace[1]
        );

        this.setState({
          top: [
            this.content.current.scrollLeft,
            this.content.current.scrollTop,
          ],
        });
      }

      // Prevent any event bubbling to prevent any default dragging behaviorss
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
      e.cancelBubble = true;
      e.returnValue = false;

      // Make sure the scroll info is broadcast still
      if (
        this.props.onScroll &&
        bounds &&
        contentBounds &&
        this.content.current
      ) {
        this.props.onScroll(
          [this.content.current.scrollLeft, this.content.current.scrollTop],
          metrics.scrollSpace,
          bounds,
          contentBounds
        );
      }

      return false;
    };

    const mouseup = () => {
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
      target.removeEventListener("mouseup", mouseup);
      target.releasePointerCapture(pointerId);

      this.setState({
        isDragging: false,
      });
    };

    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
    target.addEventListener("mouseup", mouseup);
  };

  render() {
    const { isOpen, isDragging, bounds, top } = this.state;

    const {
      className,
      contentClassName,
      containerProps,
      contentProps,
      children,
      scrollHeight,
      alwaysShowScroll,
      mode = ScrollRegionMode.DARK,
    } = this.props;

    const barTop = [
      this.content?.current?.scrollLeft || 0,
      this.content?.current?.scrollTop || 0,
    ];
    const metrics = this.getScrollMetrics();
    barTop[0] = (top[0] / metrics.scrollSpace[0]) * metrics.barSpace[0];
    barTop[1] = (top[1] / metrics.scrollSpace[1]) * metrics.barSpace[1];

    if (isNaN(barTop[0])) barTop[0] = 0;
    if (isNaN(barTop[1])) barTop[1] = 0;

    const barStyle = [
      {
        left: barTop[0],
        width: when(
          ((isOpen || alwaysShowScroll || this.touch.animation >= 0) &&
            bounds &&
            metrics.barRatio[0] < 1) ||
            isDragging,
          metrics.barSizes[0],
          0
        ),
        opacity: when(
          ((isOpen || alwaysShowScroll || this.touch.animation >= 0) &&
            bounds &&
            metrics.barRatio[0] < 1) ||
            isDragging,
          1,
          0
        ),
        bottom: "0px",
      },

      {
        top: barTop[1],
        height: when(
          ((isOpen || alwaysShowScroll || this.touch.animation >= 0) &&
            bounds &&
            metrics.barRatio[1] < 1) ||
            isDragging,
          metrics.barSizes[1],
          0
        ),
        opacity: when(
          ((isOpen || alwaysShowScroll || this.touch.animation >= 0) &&
            bounds &&
            metrics.barRatio[1] < 1) ||
            isDragging,
          1,
          0
        ),
        right: "0px",
      },
    ];

    return (
      <div
        className={classnames("ScrollRegion", mode, className)}
        {...containerProps}
        ref={this.container}
        style={containerProps?.style}
        onMouseOver={() => {
          this.setState({ top, isOpen: true });
          this.forceUpdate();
        }}
        onMouseLeave={(e) => {
          const event = e.nativeEvent;
          let node: Element | null =
            (event as any).toElement || event.relatedTarget;

          while (node) {
            if (
              node.parentNode === this.container.current ||
              node === this.container.current
            ) {
              return;
            }

            node = node.parentElement;
          }

          this.setState({ top, isOpen: false });
        }}
      >
        <div
          ref={this.content}
          className={classnames("ScrollRegion__Content", contentClassName)}
          style={{
            height: scrollHeight,
            flex: `1 1 ${scrollHeight}px`,
            minHeight: scrollHeight,
          }}
          {...contentProps}
        >
          <div
            ref={this.wrapper}
            className="ScrollRegion__Wrapper"
            style={{
              minWidth:
                this.content.current?.getBoundingClientRect().width || 0,
            }}
          >
            {children}
          </div>
        </div>
        <div
          className={classnames(
            "ScrollRegion__Bar",
            "ScrollRegion--horizontal"
          )}
          style={barStyle[0]}
          onPointerDown={this.handleHorizontalBarDown}
        />
        <div
          className={classnames("ScrollRegion__Bar")}
          style={barStyle[1]}
          onPointerDown={this.handleVerticalBarDown}
        />
      </div>
    );
  }
}
