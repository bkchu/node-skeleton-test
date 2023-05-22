import React from "react";
import { Application } from "../../store";
import { observer } from "mobx-react";
import { when } from "../../../../util/when";
import "./example-page.scss";

/**
 * An example of a page being made
 */
export const ExamplePage = observer(
  () => (
    when(
      Application.domain.example.isLoading,
      <div>Loading...</div>,
      <div>
        <div>{Application.ui.example.formattedThing}</div>
      </div>
    ),
    (
      <div>
        {Application.ui.example.filteredList.map((item, i) => (
          <div key={i}>
            <div>{item.name}</div>
            <div>{item.age}</div>
          </div>
        ))}
        <button onClick={() => Application.ui.example.setFilter("HAHA")}>
          Click me
        </button>
      </div>
    )
  )
);
