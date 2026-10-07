/**
 * Script every in-app preview document carries, compiled registry documents and authored
 * originals alike. Kept out of exported documents: it only talks to the playground.
 *
 * Two jobs, both about the frame's relationship with the page around it:
 *
 * - Escape. A key pressed inside a frame is delivered to the frame's document and never
 *   reaches the page, so once someone clicked into a full-screen preview, Escape did
 *   nothing. It is forwarded, and the full-screen view closes on it. A component that
 *   handles Escape itself and says so (preventDefault) keeps it.
 *
 * - WebGL. A context lives until its canvas is garbage collected, which can be long after
 *   the frame is gone, and Chrome caps a page at about sixteen live contexts before it
 *   starts dropping the oldest — in the grid, that was other cards' scenes going black and
 *   the GPU process growing until the tab died. Every context the document creates is
 *   recorded and explicitly lost on pagehide, which fires when the frame is removed.
 *   Wrapping getContext rather than querying canvases afterwards matters: asking a bare
 *   canvas for "webgl" would create a context where there was none.
 */
export const FRAME_HOST_SCRIPT = `(function(){
addEventListener("keydown",function(e){if(e.key==="Escape"&&!e.defaultPrevented){try{parent.postMessage({type:"dp-escape"},"*")}catch(_){}}});
var contexts=[],original=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(type){var context=original.apply(this,arguments);if(context&&/webgl/i.test(String(type))&&contexts.indexOf(context)<0)contexts.push(context);return context};
addEventListener("pagehide",function(){contexts.forEach(function(gl){try{var ext=gl.getExtension("WEBGL_lose_context");if(ext)ext.loseContext()}catch(_){}});contexts.length=0});
})();`;

/** Message type a frame sends when Escape is pressed inside it. */
export const FRAME_ESCAPE = "dp-escape";
