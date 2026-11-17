const story = document.querySelector("ml-scrollytelling");
import { completeLoadingTask, failLoading, waitForSources } from "./startup.js";
const status = document.querySelector(".ice-velocity-status");
const legend = document.querySelector(".ice-velocity-legend");
const years = Array.from({ length: 10 }, (_, index) => 2015 + index);
const sourceId = year => `ice-velocity-source-${year}`;
const layerId = year => `ice-velocity-layer-${year}`;
let map, loading, timer;
let ready = false, active = false, index = 0;

function stop() {
  clearInterval(timer);
  timer = undefined;
}

function showFrame(frame = index) {
  if (!active || !ready || !map.isSourceLoaded(sourceId(years[frame]))) return;
  // Hold the current image until the next is loaded; disable raster fades.
  years.forEach((year, i) => {
    map.setPaintProperty(layerId(year), "raster-opacity", i === frame ? 1 : 0);
  });
  index = frame;
  status.hidden = true;
}

function play() {
  stop();
  if (!active || !ready || document.hidden) return;
  timer = setInterval(() => showFrame(status.hidden ? (index + 1) % years.length : index), 500);
}

async function loadLayers() {
  if (ready) return;
  if (loading) return loading;
  loading = (async () => {
    await customElements.whenDefined("ml-scrollytelling");
    map = await story.mapReady();
    const response = await fetch("img/ice-velocity-overlay/coordinates.json");
    if (!response.ok) throw new Error(`Overlay coordinates: ${response.status}`);
    const { coordinates } = await response.json();
    if (!Array.isArray(coordinates) || coordinates.length !== 4 ||
        !coordinates.every(p => Array.isArray(p) && p.length === 2 &&
          p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) {
      throw new Error("Invalid overlay longitude/latitude corners");
    }
    for (const year of years) {
      if (!map.getSource(sourceId(year))) {
        map.addSource(sourceId(year), {
          type: "image", url: `img/ice-velocity-overlay/${year}.png`, coordinates
        });
      }
      if (!map.getLayer(layerId(year))) {
        map.addLayer({
          id: layerId(year), type: "raster", source: sourceId(year),
          // Prepare all image sources invisibly behind the startup screen.
          layout: { visibility: "visible" },
          paint: {
            "raster-opacity": 0,
            "raster-opacity-transition": { duration: 0, delay: 0 },
            "raster-fade-duration": 0
          }
        }, "stream-ice-8000");
      }
    }
    await waitForSources(map, years.map(sourceId));
    map.on("sourcedata", event => {
      if (active && !status.hidden && event.sourceId?.startsWith("ice-velocity-source-")) showFrame();
    });
    ready = true;
    updateVisibility();
  })().catch(error => { loading = undefined; throw error; });
  return loading;
}

function updateVisibility() {
  if (!ready) return;
  for (const year of years) {
    map.setLayoutProperty(layerId(year), "visibility", active ? "visible" : "none");
    map.setPaintProperty(layerId(year), "raster-opacity", 0);
  }
}

async function updateChapter(chapterId) {
  active = chapterId === "ice-velocity";
  legend.hidden = !active;
  stop();
  status.hidden = !active;
  if (!active) { updateVisibility(); return; }
  index = 0;
  status.textContent = "Loading annual images...";
  try {
    await loadLayers();
    updateVisibility();
    if (!active) return;
    showFrame();
    play();
  } catch (error) {
    if (active) status.textContent = "Unable to load ice velocity overlay. Re-enter this chapter to retry.";
    console.error("Ice velocity overlay:", error);
  }
}

story.addEventListener("ml-scrollytelling:chapter", event => updateChapter(event.detail.chapterId));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
  else play();
});
loadLayers().then(() => {
  completeLoadingTask("ice");
  return updateChapter(story.activeChapterId);
}).catch(error => {
  failLoading(error);
  console.error("Ice velocity chapter setup:", error);
});
