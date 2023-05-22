import React from "react";
import { IChildren } from "../ui/types";

export class CustomChildren<
  TChildren extends object,
  TProps extends IChildren<TChildren>,
  TState
> extends React.Component<TProps, TState> {
  children: Partial<TChildren>;

  /**
   * Handles the deprecated lifecycle but performs the same behavior as getSnapShotBeforeUpdate
   */
  componentWillUpdate() {
    this.getSnapshotBeforeUpdate();
  }

  /**
   * This executes to update the children property on this component which gathers the children from props and children
   * into a single object for ease of use.
   */
  getSnapshotBeforeUpdate() {
    this.children;
    this.children = Object.assign({}, this.props.children, this.props);
  }
}
