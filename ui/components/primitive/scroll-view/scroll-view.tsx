import React from "react";
import { classnames } from "../../../../util/classnames";
import { DOMRectBounds } from "../../../../util/clone-client-rect";
import { INestedChildren } from "../../../../util/types";
import { normalizeWheel } from "../../../../util/normalize-wheel";
import { stopPropagation } from "../../../../util/stop-propagation";
import { when } from "../../../../util/when";
import "./scroll-view.scss";

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

export enum ScrollBarSide {
  RIGHT,
  LEFT,
}

export const ScrollViewMode = {
  LIGHT: "ScrollView--light",
  DARK: "ScrollView--dark",
} as const;

export type ScrollViewModeType =
  (typeof ScrollViewMode)[keyof typeof ScrollViewMode];

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
  onScroll?(
    scrollTop: number,
    scrollMax: number,
    viewBounds: DOMRectBounds,
    contentBounds: DOMRectBounds,
    isAutomated?: boolean
  ): void;
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
export class ScrollView extends React.Component<IScrollView, IState> {
  state: IState = {
    isOpen: false,
    isDragging: false,
    top: 0,
  };

  container = React.createRef<HTMLDivElement>();
  private content = React.createRef<HTMLDivElement>();
  private scrolledToOnce?: number;
  private currentScrollHeight?: number;
  private initialized = false;
  private childrenChanged = false;
  private isUpdatingChildren = false;
  private animateScrollId = -1;
  private touch = {
    id: 0,
    y: 0,
    inertia: 0,
    animation: -1,
  };

  getSnapshotBeforeUpdate(prevProps: Readonly<IScrollView>) {
    if (!this.isUpdatingChildren) {
      this.childrenChanged = prevProps.children === this.props.children;
    }

    this.isUpdatingChildren = false;
    return null;
  }

  init = () => {
    const { horizontal } = this.props;
    const { bounds, contentBounds } = this.state;

    // Don't trigger an initial scroll event until there is something able to
    // scroll
    if (horizontal) {
      if (
        !bounds?.width ||
        !contentBounds?.width ||
        bounds.width >= contentBounds.width
      ) {
        return;
      }
    } else {
      if (
        !bounds?.height ||
        !contentBounds?.height ||
        bounds.height >= contentBounds.height
      ) {
        return;
      }
    }

    if (
      !this.initialized &&
      bounds &&
      contentBounds &&
      this.container.current
    ) {
      this.initialized = true;

      if (this.props.onScroll) {
        const metrics = this.getScrollMetrics();
        this.props.onScroll(
          horizontal
            ? this.container.current.scrollLeft
            : this.container.current.scrollTop,
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
    const { horizontal } = this.props;
    const { bounds, contentBounds } = this.state;

    if (
      (!this.state.bounds || this.childrenChanged) &&
      this.content.current &&
      this.container.current
    ) {
      this.childrenChanged = false;
      this.isUpdatingChildren = true;
      const bounds = this.container.current.getBoundingClientRect();
      const contentBounds = this.content.current.getBoundingClientRect();

      if (this.props.onScroll) {
        const metrics = this.getScrollMetrics();

        this.props.onScroll(
          horizontal
            ? this.container.current.scrollLeft
            : this.container.current.scrollTop,
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
      this.content.current &&
      this.container.current
    ) {
      const checkContainer = this.container.current.getBoundingClientRect();
      const checkContent = this.content.current.getBoundingClientRect();

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
    let scrollTopOnce = this.props.scrollTopOnce;
    if (scrollTopOnce !== void 0 && isNaN(scrollTopOnce)) scrollTopOnce = 0;

    if (
      bounds &&
      contentBounds &&
      this.container.current &&
      this.scrolledToOnce !== scrollTopOnce
    ) {
      const bounds = this.container.current.getBoundingClientRect();
      const contentBounds = this.content.current?.getBoundingClientRect();

      this.scrolledToOnce = scrollTopOnce || 0;
      const scrollTo = this.scrolledToOnce;
      let startValue = horizontal
        ? this.container.current.scrollLeft
        : this.container.current.scrollTop;

      // Handle instantaneous scroll changes
      if (this.props.autoScrollDuration === 0) {
        startValue = this.scrolledToOnce;

        if (horizontal) {
          this.container.current.scrollLeft = startValue;
        } else {
          this.container.current.scrollTop = startValue;
        }
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
          horizontal
            ? this.container.current.scrollLeft
            : this.container.current.scrollTop,
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
      this.container.current &&
      this.currentScrollHeight !== this.props.scrollHeight &&
      this.props.onScroll
    ) {
      this.currentScrollHeight = this.props.scrollHeight;
      const metrics = this.getScrollMetrics();
      this.props.onScroll(
        horizontal
          ? this.container.current.scrollLeft
          : this.container.current.scrollTop,
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

  private animateScrollOnce = (startValue: number, scrollTo: number) => {
    let start = 0;
    const duration = this.props.autoScrollDuration || 170;

    const doAnimate = (t: number) => {
      if (!this.container.current) return;
      if (!this.content.current) return;
      const { horizontal } = this.props;

      const bounds = this.container.current.getBoundingClientRect();
      const contentBounds = this.content.current?.getBoundingClientRect();
      const metrics = this.getScrollMetrics(bounds, contentBounds);

      if (!this.container.current) return;
      if (!start) start = t;
      const time = (t - start) / duration;
      const scroll = easeInOutCubic(startValue, scrollTo, time);

      if (horizontal) {
        this.container.current.scrollLeft = Math.max(
          Math.min(scroll || 0, metrics.scrollSpace),
          0
        );
      } else {
        this.container.current.scrollTop = Math.max(
          Math.min(scroll || 0, metrics.scrollSpace),
          0
        );
      }

      this.setState({
        top: horizontal
          ? this.container.current.scrollLeft
          : this.container.current.scrollTop,
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
          horizontal
            ? this.container.current.scrollLeft
            : this.container.current.scrollTop,
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
    const { horizontal } = this.props;
    let { bounds, contentBounds } = this.state;
    bounds = forceBounds || bounds;
    contentBounds = forceContentBounds || contentBounds;

    let barHeight = 0;
    let barRatio = 1;
    let barSpace = 0;
    let scrollSpace = 0;

    if (horizontal) {
      if (bounds && contentBounds) {
        barRatio = bounds.width / contentBounds.width;
        barHeight = barRatio * bounds.width;
        barHeight = Math.max(barHeight, 30);
        barHeight = Math.min(barHeight, bounds.width);
      }

      if (barRatio < 1 && bounds && contentBounds) {
        barSpace = bounds.width - barHeight;
        scrollSpace = contentBounds.width - bounds.width;
      }
    } else {
      if (bounds && contentBounds) {
        barRatio = bounds.height / contentBounds.height;
        barHeight = barRatio * bounds.height;
        barHeight = Math.max(barHeight, 30);
        barHeight = Math.min(barHeight, bounds.height);
      }

      if (barRatio < 1 && bounds && contentBounds) {
        barSpace = bounds.height - barHeight;
        scrollSpace = contentBounds.height - bounds.height;
      }
    }

    return {
      barHeight,
      barRatio,
      barSpace,
      scrollSpace,
    };
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
      this.touch.y = touch.pageY;
      this.touch.id = touch.identifier;
    }

    this.setState({ top: this.state.top, isOpen: true, animating: false });
    cancelAnimationFrame(this.touch.animation);
    this.touch.animation = -1;
  };

  handleTouchEnd = (e: TouchEvent) => {
    const { horizontal } = this.props;

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

    if (Math.abs(this.touch.inertia) > 0 && this.container.current) {
      const { bounds, contentBounds } = this.state;
      const current = this.container.current;
      cancelAnimationFrame(this.touch.animation);

      const animateInertia = () => {
        if (horizontal) current.scrollLeft += this.touch.inertia;
        else current.scrollTop += this.touch.inertia;
        const metrics = this.getScrollMetrics();
        if (horizontal) {
          current.scrollLeft = Math.min(
            current.scrollLeft,
            metrics.scrollSpace
          );
        } else {
          current.scrollTop = Math.min(current.scrollTop, metrics.scrollSpace);
        }

        this.setState({
          top: horizontal ? current.scrollLeft : current.scrollTop,
        });

        if (this.props.onScroll && bounds && contentBounds) {
          this.props.onScroll(
            horizontal ? current.scrollLeft : current.scrollTop,
            metrics.scrollSpace,
            bounds,
            contentBounds
          );
        }

        this.touch.inertia *= 0.95;
        if (Math.abs(this.touch.inertia) > 0.001) {
          requestAnimationFrame(animateInertia);
        } else this.touch.animation = -1;
      };

      this.touch.animation = requestAnimationFrame(animateInertia);
    }
  };

  handleTouchMove = (e: TouchEvent) => {
    if (!(e.currentTarget instanceof HTMLDivElement)) return;

    const { horizontal } = this.props;
    const { bounds, contentBounds, isOpen } = this.state;

    let touch: Touch | null = null;
    for (let i = 0, iMax = e.touches.length; i < iMax; ++i) {
      touch = e.touches.item(i);
      if (touch) {
        if (touch.identifier === this.touch.id) break;
      }
    }

    if (!touch) return;

    if (horizontal) e.currentTarget.scrollLeft += this.touch.y - touch.pageX;
    else e.currentTarget.scrollTop += this.touch.y - touch.pageY;
    this.touch.inertia = this.touch.y - touch.pageY;
    if (!this.props.allowTouchInertia) this.touch.inertia = 0;
    this.touch.y = horizontal ? touch.pageX : touch.pageY;
    const metrics = this.getScrollMetrics();

    if (horizontal) {
      e.currentTarget.scrollLeft = Math.min(
        e.currentTarget.scrollLeft,
        metrics.scrollSpace
      );
    } else {
      e.currentTarget.scrollTop = Math.min(
        e.currentTarget.scrollTop,
        metrics.scrollSpace
      );
    }

    this.setState({
      top: horizontal ? e.currentTarget.scrollLeft : e.currentTarget.scrollTop,
      animating: false,
    });

    if (this.props.onScroll && bounds && contentBounds) {
      this.props.onScroll(
        horizontal ? e.currentTarget.scrollLeft : e.currentTarget.scrollTop,
        metrics.scrollSpace,
        bounds,
        contentBounds
      );
    }

    if (isOpen && bounds && metrics.barRatio < 1) {
      stopPropagation(e);
    }

    cancelAnimationFrame(this.touch.animation);
  };

  handleWheel = (e: WheelEvent) => {
    if (!(e.currentTarget instanceof HTMLDivElement)) return;
    if (this.props.preventWheel) return;

    const { horizontal } = this.props;
    const { bounds, contentBounds, isOpen } = this.state;
    const wheel = normalizeWheel(e);

    if (horizontal) {
      // Check to see if the horizontal scrolling is greater than vertical
      // scrolling to allow this horizontal scroll view to operate.
      if (this.props.onlyHorizontalWheel) {
        if (Math.abs(wheel.pixelX) < Math.abs(wheel.pixelY)) return;
      }

      e.currentTarget.scrollLeft += wheel.pixelX;
      e.currentTarget.scrollLeft -= wheel.pixelY;
    } else e.currentTarget.scrollTop -= wheel.pixelY;

    const metrics = this.getScrollMetrics();

    if (horizontal) {
      e.currentTarget.scrollLeft = Math.min(
        e.currentTarget.scrollLeft,
        metrics.scrollSpace
      );
    } else {
      e.currentTarget.scrollTop = Math.min(
        e.currentTarget.scrollTop,
        metrics.scrollSpace
      );
    }

    this.setState({
      top: horizontal ? e.currentTarget.scrollLeft : e.currentTarget.scrollTop,
      animating: false,
    });

    if (this.props.onScroll && bounds && contentBounds) {
      this.props.onScroll(
        horizontal ? e.currentTarget.scrollLeft : e.currentTarget.scrollTop,
        metrics.scrollSpace,
        bounds,
        contentBounds
      );
    }

    if (isOpen && bounds && metrics.barRatio < 1) {
      if (this.props.allowScrollFlowThrough) {
        if (
          Math.floor(e.currentTarget.scrollTop) <
            Math.floor(metrics.scrollSpace) &&
          Math.floor(e.currentTarget.scrollTop) > 0
        ) {
          stopPropagation(e);
        }
      } else {
        stopPropagation(e);
      }
    }
  };

  handleBarDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const { horizontal } = this.props;
    const { bounds, contentBounds } = this.state;
    // Once the bar is mouse downed, we begin to start the dragging process which
    // should be registered across the whole document
    const metrics = this.getScrollMetrics();

    // We must calculate how much one pixel of movement would scroll the content
    const pixelScroll = metrics.scrollSpace / metrics.barSpace;
    let startY = horizontal ? e.nativeEvent.clientX : e.nativeEvent.clientY;

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

      const newY = horizontal ? e.clientX : e.clientY;
      const deltaY = newY - startY;
      startY = newY;

      if (this.container.current) {
        if (horizontal) {
          this.container.current.scrollLeft += deltaY * pixelScroll;
        } else this.container.current.scrollTop += deltaY * pixelScroll;

        if (horizontal) {
          this.container.current.scrollLeft = Math.min(
            this.container.current.scrollLeft,
            metrics.scrollSpace
          );
        } else {
          this.container.current.scrollTop = Math.min(
            this.container.current.scrollTop,
            metrics.scrollSpace
          );
        }

        this.setState({
          top: horizontal
            ? this.container.current.scrollLeft
            : this.container.current.scrollTop,
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
        this.container.current
      ) {
        this.props.onScroll(
          horizontal
            ? this.container.current.scrollLeft
            : this.container.current.scrollTop,
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
      side = ScrollBarSide.RIGHT,
      horizontal,
      alwaysShowScroll,
      mode = ScrollViewMode.DARK,
    } = this.props;

    let barTop = top;
    const metrics = this.getScrollMetrics();
    barTop += (top / metrics.scrollSpace) * metrics.barSpace;

    if (isNaN(barTop)) {
      barTop = 0;
    }

    const barStyle = (): React.CSSProperties => {
      if (horizontal) {
        return {
          left: barTop,
          width: when(
            ((isOpen || alwaysShowScroll || this.touch.animation >= 0) &&
              bounds &&
              metrics.barRatio < 1) ||
              isDragging,
            metrics.barHeight,
            0
          ),
          opacity: when(
            ((isOpen || alwaysShowScroll || this.touch.animation >= 0) &&
              bounds &&
              metrics.barRatio < 1) ||
              isDragging,
            1,
            0
          ),
          top: when(side === ScrollBarSide.LEFT, "0px"),
          bottom: when(side === ScrollBarSide.RIGHT, "0px"),
        };
      } else {
        return {
          top: barTop,
          height: when(
            ((isOpen || alwaysShowScroll || this.touch.animation >= 0) &&
              bounds &&
              metrics.barRatio < 1) ||
              isDragging,
            metrics.barHeight,
            0
          ),
          opacity: when(
            ((isOpen || alwaysShowScroll || this.touch.animation >= 0) &&
              bounds &&
              metrics.barRatio < 1) ||
              isDragging,
            1,
            0
          ),
          left: when(side === ScrollBarSide.LEFT, "0px"),
          right: when(side === ScrollBarSide.RIGHT, "0px"),
        };
      }
    };

    return (
      <div
        className={classnames("ScrollView", mode, className)}
        {...containerProps}
        ref={this.container}
        style={{
          ...containerProps?.style,
          flexDirection: horizontal ? "row" : void 0,
        }}
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
          className={classnames(
            "ScrollView__Content",
            when(horizontal, "ScrollView--horizontal-content"),
            contentClassName
          )}
          style={{
            height: scrollHeight,
            flex: `1 1 ${scrollHeight}px`,
            minHeight: scrollHeight,
          }}
          {...contentProps}
        >
          {children}
        </div>
        <div
          className={classnames(
            "ScrollView__Bar",
            horizontal ? "ScrollView--horizontal" : void 0
          )}
          style={barStyle()}
          onPointerDown={this.handleBarDown}
        />
      </div>
    );
  }
}
