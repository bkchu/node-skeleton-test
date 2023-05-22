import * as React from "react";
import { ScrollRegion } from "../../../components";
import { StoryFn } from "@storybook/react";

export default {
  title: "SwapiTest/Components/primitive/ScrollRegion",
  component: ScrollRegion,
  args: {},
  argTypes: {
    children: { table: { disable: true } },
    className: { table: { disable: true } },
    containerProps: { table: { disable: true } },
  },
};

const Template = (children?: any) => (args: any) =>
  (
    <div
      style={{
        width: "200px",
        height: "400px",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <ScrollRegion {...args}>{children}</ScrollRegion>
    </div>
  );

export const Basic: StoryFn = Template(
  <div
    style={{
      width: 2000,
      height: 1000,
      background: "#e9e9e9",
      borderBottom: "1px solid red",
      borderTop: "1px solid blue",
      boxSizing: "border-box",
    }}
  />
).bind({});

Basic.args = {};
