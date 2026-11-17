const story = document.querySelector("ml-scrollytelling");
const loader = document.querySelector(".atlas-loader");
const detail = loader.querySelector(".atlas-loader-detail");
const count = loader.querySelector(".atlas-loader-count");
const retry = loader.querySelector(".atlas-loader-retry");
const tasks = new Map([
  ["map", { done: false, label: "Preparing satellite map" }],
  ["streams", { done: false, label: "Downloading stream data" }],
  ["ice", { done: false, label: "Loading annual ice images" }],
  ["assets", { done: false, label: "Loading images and fonts" }]
]);
let map;
let failed = false;
let finishing = false;
retry.addEventListener("click", () => location.reload());

export function setLoadingDetail(id, label) {
  if (!tasks.has(id) || failed) return;
  tasks.get(id).label = label;
  render();
}

export function failLoading(error) {
  if (failed) return;
  failed = true;
  loader.querySelector("h1").textContent = "Unable to load the atlas";
  detail.textContent = "Please check your connection and try again.";
  retry.hidden = false;
  loader.classList.add("has-error");
  console.error("Atlas startup:", error);
}

export function completeLoadingTask(id) {
  if (!tasks.has(id) || failed) return;
  tasks.get(id).done = true;
  render();
  if ([...tasks.values()].every(task => task.done) && !finishing) {
    finishing = true;
    reveal().catch(failLoading);
  }
}

function render() {
  const remaining = [...tasks.values()].filter(task => !task.done);
  count.textContent = `${tasks.size - remaining.length} / ${tasks.size}`;
  detail.textContent = remaining.map(task => task.label).join(" · ") || "Preparing the first view";
}

export function waitForSources(map, ids) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error("Map source loading timed out")), 120000);
    function finish(error) {
      clearTimeout(timeout);
      map.off("sourcedata", check);
      map.off("error", onError);
      if (error) reject(error);
      else resolve();
    }
    function check() {
      if (ids.every(id => map.getSource(id) && map.isSourceLoaded(id))) finish();
    }
    function onError(event) {
      if (ids.includes(event.sourceId)) finish(event.error || new Error("Map source failed"));
    }
    map.on("sourcedata", check);
    map.on("error", onError);
    check();
  });
}

async function reveal() {
  // Warm hidden story layers for the initial viewport, then restore them.
  // Remote satellite tiles for future pans/zooms still load on demand.
  const ids = ["Greenland_Bed_Visual", "stream-ice-8000"];
  const originals = ids.map(id => ({
    id, visibility: map.getLayoutProperty(id, "visibility") ?? "visible",
    property: map.getLayer(id).type === "raster" ? "raster-opacity" : "line-opacity",
    opacity: map.getPaintProperty(id, map.getLayer(id).type === "raster" ? "raster-opacity" : "line-opacity")
  }));
  try {
    for (const layer of originals) {
      map.setPaintProperty(layer.id, layer.property, 0);
      map.setLayoutProperty(layer.id, "visibility", "visible");
    }
    await waitForSources(map, ["satellite", ...ids.map(id => map.getLayer(id).source)]);
  } finally {
    for (const layer of originals) {
      map.setLayoutProperty(layer.id, "visibility", layer.visibility);
      map.setPaintProperty(layer.id, layer.property, layer.opacity ?? null);
    }
  }
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (failed) return;
  document.documentElement.classList.remove("atlas-loading");
  loader.hidden = true;
}

// Report library download failures instead of leaving a permanent spinner.
document.addEventListener("atlas-library-error", () => failLoading(new Error("Map library failed to load")));
const startupTimeout = setTimeout(() => failLoading(new Error("Atlas startup timed out")), 300000);
async function prepareMap() {
  await customElements.whenDefined("ml-scrollytelling");
  map = await story.mapReady();
  completeLoadingTask("map");
}
async function prepareAssets() {
  await Promise.all([
    document.fonts.ready,
    ...["img/fisk02.jpg", "img/flow-controls/Icon.png", "img/flow-controls/icon2.png", "img/flow-controls/icon3.png"].map(url => {
      const image = new Image();
      image.src = url;
      return image.decode();
    })
  ]);
  completeLoadingTask("assets");
}
Promise.all([prepareMap(), prepareAssets()]).catch(failLoading);
// Stop the watchdog once the actual loading screen has been dismissed.
new MutationObserver((_, observer) => {
  if (loader.hidden || failed) {
    clearTimeout(startupTimeout);
    observer.disconnect();
  }
}).observe(loader, { attributes: true, attributeFilter: ["hidden", "class"] });
render();
