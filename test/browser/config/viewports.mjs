// These exercise an exact 4:3 fit, horizontal letterboxing, and vertical
// letterboxing/mobile pressure without multiplying every other test case.
export const viewports = {
  design4x3: { width: 1440, height: 1080 },
  widescreen: { width: 1600, height: 900 },
  portrait: { width: 900, height: 1200 },
};

export const primaryViewport = viewports.design4x3;
