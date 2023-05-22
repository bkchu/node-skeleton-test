import React from "react";
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
export declare function debugProps<T>(WrappedComponent: React.ComponentType<T>): React.ComponentType<T>;
/**
 * This allows debugging a component through inheritance. This method requires
 * that all implementations of componentDidMount and componentDidUpdate call
 * their super method.
 */
export declare class DebugProps<T extends IDebugProps> extends React.Component<T> {
    componentDidMount(): void;
    componentDidUpdate(): void;
    debug(): void;
}
