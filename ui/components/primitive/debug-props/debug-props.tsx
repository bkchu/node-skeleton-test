import React from "react";
import { toJS } from "mobx";

/**
 * DebugProps props
 */
export interface IDebugProps {
  /**
   * When set to true, the props of this component will be output to the console
   * on every mount and update.
   */
  debug?: boolean;
}

/**
 * We use this to make production warnings get emitted only once to reduce log
 * clutter.
 */
const issuedWarnings = new Set<string>();

/**
 * This is a Higher Order Component (HOC) that is used to wrap a component,
 * providing that component with debug functionality. The recommended pattern
 * for this is to provide two component outputs:
 *
 * export class Component;
 * export const ComponentDebug = debugProps(Component);
 *
 * This way there is a distinctive use of the debug component. Debug components
 * should not make it into production.
 */

export function debugProps<T>(
  WrappedComponent: React.ComponentType<T>
): React.ComponentType<T> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "";

  class HOC extends React.Component<T> {
    componentDidMount() {
      if (!issuedWarnings.has(displayName)) {
        issuedWarnings.add(displayName);
        console.warn(
          "DEBUG COMPONENT IN USE. ENSURE THIS IS REMOVED BEFORE PRODUCTION:",
          displayName
        );
      }

      this.debug();
    }

    componentDidUpdate() {
      this.debug();
    }

    debug() {
      const cache = new Set<any>();

      console.warn(`Props for ${displayName} -> \n\n`, {
        json: this.props,
        string: JSON.stringify(toJS(this.props), (_, value) => {
          if (React.isValidElement(value)) {
            return `<${value.type}>`;
          }

          if (typeof value === "object" && value !== null) {
            // Duplicate reference found, discard key
            if (cache.has(value)) return;

            // Store value in our collection
            cache.add(value);
          }
          return value;
        }),
      });

      cache.clear();
    }

    render() {
      // The only requirement for JSX intrinsic attributes, is an optional key
      // prop. We use "any" here because we don't need to enforce an optional
      // key
      return <WrappedComponent {...(this.props as any)} />;
    }
  }

  (HOC as React.ComponentType<any>).displayName = displayName;
  return HOC as React.ComponentType<T & IDebugProps> as any;
}

/**
 * This allows debugging a component through inheritance. This method requires
 * that all implementations of componentDidMount and componentDidUpdate call
 * their super method.
 */
export class DebugProps<T extends IDebugProps> extends React.Component<T> {
  componentDidMount() {
    this.debug();
  }

  componentDidUpdate() {
    this.debug();
  }

  debug() {
    if (this.props.debug) {
      const cache = new Set<any>();

      console.warn(`DEBUG ->\n`, {
        json: this.props,
        string: JSON.stringify(toJS(this.props), (_, value) => {
          if (React.isValidElement(value)) {
            return `<${value.type}>`;
          }

          if (typeof value === "object" && value !== null) {
            // Duplicate reference found, discard key
            if (cache.has(value)) return;

            // Store value in our collection
            cache.add(value);
          }
          return value;
        }),
      });

      cache.clear();
    }
  }
}
