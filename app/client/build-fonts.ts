import { addFont, destroyAllFonts } from "../../util/add-font";

/**
 * Adds all the fonts to the application. This uses fonts that are bundled into
 * the package as base64 encoded strings.
 *
 * This method returns a disposer to clean out the fonts when they are no longer
 * needed.
 */
export function buildFonts() {
  addFont(
    "example-app",
    "Lato",
    require("../asset/fonts/Lato-Regular.ttf"),
    "truetype",
    400,
    "normal"
  );

  addFont(
    "example-app",
    "Lato",
    require("../asset/fonts/Lato-Italic.ttf"),
    "truetype",
    400,
    "italic"
  );

  addFont(
    "example-app",
    "Lato",
    require("../asset/fonts/Lato-Black.ttf"),
    "truetype",
    900,
    "normal"
  );

  addFont(
    "example-app",
    "Lato",
    require("../asset/fonts/Lato-Black.ttf"),
    "truetype",
    900,
    "normal"
  );

  addFont(
    "example-app",
    "Lato",
    require("../asset/fonts/Lato-Bold.ttf"),
    "truetype",
    700,
    "normal"
  );

  addFont(
    "example-app",
    "Lato",
    require("../asset/fonts/Lato-BoldItalic.ttf"),
    "truetype",
    700,
    "italic"
  );

  addFont(
    "example-app",
    "Lato",
    require("../asset/fonts/Lato-Light.ttf"),
    "truetype",
    300,
    "normal"
  );

  addFont(
    "example-app",
    "Lato",
    require("../asset/fonts/Lato-LightItalic.ttf"),
    "truetype",
    300,
    "italic"
  );

  addFont(
    "example-app",
    "Lato",
    require("../asset/fonts/Lato-Thin.ttf"),
    "truetype",
    100,
    "normal"
  );

  addFont(
    "example-app",
    "Lato",
    require("../asset/fonts/Lato-ThinItalic.ttf"),
    "truetype",
    100,
    "italic"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-Bold.woff2"),
    "woff2",
    700,
    "normal"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-BoldItalic.woff2"),
    "woff2",
    700,
    "italic"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-ExtraLight.woff2"),
    "woff2",
    200,
    "normal"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-ExtraLightItalic.woff2"),
    "woff2",
    200,
    "italic"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-Regular.woff2"),
    "woff2",
    400,
    "normal"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-Italic.woff2"),
    "woff2",
    400,
    "italic"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-Light.woff2"),
    "woff2",
    300,
    "normal"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-LightItalic.woff2"),
    "woff2",
    300,
    "italic"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-Medium.woff2"),
    "woff2",
    500,
    "normal"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-MediumItalic.woff2"),
    "woff2",
    500,
    "italic"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-SemiBold.woff2"),
    "woff2",
    600,
    "normal"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-SemiBoldItalic.woff2"),
    "woff2",
    600,
    "italic"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-Thin.woff2"),
    "woff2",
    100,
    "normal"
  );

  addFont(
    "example-app",
    "IBM Plex Mono",
    require("../asset/fonts/IBMPlexMono-ThinItalic.woff2"),
    "woff2",
    100,
    "italic"
  );

  addFont(
    "example-app",
    "Inter",
    require("../asset/fonts/Inter-Black.ttf"),
    "",
    900,
    "normal"
  );

  addFont(
    "example-app",
    "Inter",
    require("../asset/fonts/Inter-Bold.ttf"),
    "",
    700,
    "normal"
  );

  addFont(
    "example-app",
    "Inter",
    require("../asset/fonts/Inter-ExtraBold.ttf"),
    "",
    800,
    "normal"
  );

  addFont(
    "example-app",
    "Inter",
    require("../asset/fonts/Inter-ExtraLight.ttf"),
    "",
    200,
    "normal"
  );

  addFont(
    "example-app",
    "Inter",
    require("../asset/fonts/Inter-Light.ttf"),
    "",
    300,
    "normal"
  );

  addFont(
    "example-app",
    "Inter",
    require("../asset/fonts/Inter-Medium.ttf"),
    "",
    500,
    "normal"
  );

  addFont(
    "example-app",
    "Inter",
    require("../asset/fonts/Inter-Regular.ttf"),
    "",
    400,
    "normal"
  );

  addFont(
    "example-app",
    "Inter",
    require("../asset/fonts/Inter-SemiBold.ttf"),
    "",
    600,
    "normal"
  );

  addFont(
    "example-app",
    "Inter",
    require("../asset/fonts/Inter-Thin.ttf"),
    "",
    100,
    "normal"
  );

  return () => {
    destroyAllFonts("example-app");
  };
}
