import * as Page from "./page";
import React from "react";
import { Application } from "./store";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { buildFonts } from "./build-fonts";
import { createRoot } from "react-dom/client";
import { ENV } from "../config/env";
import { observer } from "mobx-react";
import { useEffect } from "react";
import "./app.scss";

/**
 * This is the top level component and entry point of this application. It is
 * responsible for setting up session and initial state as well as configuring
 * routes etc.
 */
export const App = observer(() => {
  const location = useLocation();
  const navigate = useNavigate();

  // onMount
  useEffect(() => {
    // Font instantiating
    const destroyFonts = buildFonts();

    return () => {
      // Ensure all fonts associated with this context are removed so we don't
      // clutter the DOM.
      destroyFonts();
    };
  }, []);

  // Keep track of location changes so we can update the session as needed.
  useEffect(() => {
    // Update the sessions search params with the latest params in the URL
    Application.session.updateSearchParams();
    // Perform Application state changes based on page
    Application.session.pageDidLoad(location, navigate);
  }, [location]);

  // User is logged in
  return (
    <>
      <Routes>
        <Route path={ENV.routes.example} element={<Page.ExamplePage />} />
        <Route path="*" element={<Page.ExamplePage />} />
      </Routes>
    </>
  );
});

// Initialize the session with everything we are able to determine from the
// current state of the browser.
Application.session.init();

const root = createRoot(document.getElementById("main")!);

// Start up the application with the appropriate HTML.
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
