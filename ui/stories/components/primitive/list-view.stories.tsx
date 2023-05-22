import React from "react";
import { ListView } from "../../../components";
import { StoryFn } from "@storybook/react";

export default {
  title: "SwapiTest/Components/primitive/ListView",
  component: ListView,
  args: {},
  argTypes: {
    children: { table: { disable: true } },
    className: { table: { disable: true } },
    containerProps: { table: { disable: true } },
  },
};

const Template = (_children?: any) => (args: any) =>
  (
    <ListView {...args}>
      {(Index) => <div>{`option ${Index.index}`}</div>}
    </ListView>
  );

export const Basic: StoryFn = Template().bind({});
Basic.args = {
  rowSize: 40,
  total: 60,
};

export const Empty: StoryFn = Template().bind({});
Empty.args = {};
