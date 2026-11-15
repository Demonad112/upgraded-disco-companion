/**
 * PXB-2. In <head>: marks <html data-returning> before first paint when the saved state holds a character
 * snapshot, so the home hero starts at its compact size instead of collapsing after hydration
 * (the `:has(.lc-plate)` rule only matches once LastCharacterCard has rendered).
 */
export const RETURNING_BOOTSTRAP = `(function(){try{if(/"snapshots":\\[\\{/.test(localStorage.getItem("poe2-endgame-companion:v1")||""))document.documentElement.setAttribute("data-returning","")}catch(e){}})()`
