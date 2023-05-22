// import { faker } from '@faker-js/faker';
import React from "react";
import { ScrollView } from "../../../components";
import { StoryFn } from "@storybook/react";

export default {
  title: "SwapiTest/Components/primitive/ScrollView",
  component: ScrollView,
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
        width: "100%",
        height: "400px",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <ScrollView {...args}>{children}</ScrollView>
    </div>
  );

// export const Basic = Template(
//   <div>
//     {faker.lorem.paragraph(50)}
//   </div>
// ).bind({});

// Basic.args = {};

export const Horizontal: StoryFn = Template(
  <div
    style={{
      width: 5000,
      height: 400,
      background: "linear-gradient(to right, blue, pink)",
    }}
  >
    .
  </div>
).bind({});

Horizontal.args = {
  horizontal: true,
};
