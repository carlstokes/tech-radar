const params = new URLSearchParams(window.location.search);
const selector = document.getElementById("radar-selector");

let radarRegistry;
let currentRadar;
let activeRadarId;
let radarRequest = 0;

const displayOptions = {
  sidebar: params.get("sidebar") !== "false",
  entries: params.get("entries") !== "false",
  guidance: params.get("guidance") !== "false",
  controls: params.get("controls") !== "false",
  title: params.get("title") !== "false",
  radarSelector: params.get("radarSelector") !== "false",
  ohno: params.get("ohno") !== "false",
  theme: params.get("theme") || "system"
};

const radarOptions = { display: displayOptions };

async function loadRadarRegistry() {
  const response = await fetch("radars/radars.json");

  if (!response.ok) {
    throw new Error("Could not load radar registry.");
  }

  return response.json();
}

function getRadarDefinition(registry, id) {
  return registry.radars.find(radar => radar.id === id);
}

function getSelectedRadarId(registry) {
  const currentParams = new URLSearchParams(window.location.search);
  const requestedRadar = currentParams.get("radar") || registry.default;

  return getRadarDefinition(registry, requestedRadar)
    ? requestedRadar
    : registry.default;
}

function buildRadarSelector(registry) {
  selector.innerHTML = "";

  registry.radars.forEach(radar => {
    const option = document.createElement("option");
    option.value = radar.id;
    option.textContent = radar.label;
    selector.appendChild(option);
  });
}

async function fetchRadarData(registry, id) {
  const radarDefinition = getRadarDefinition(registry, id);

  if (!radarDefinition) {
    throw new Error(`Unknown radar: ${id}`);
  }

  const response = await fetch(`${radarDefinition.file}`);

  if (!response.ok) {
    throw new Error(`Could not load radar config: ${id}`);
  }

  return response.json();
}

async function switchRadar(id, updateUrl = true) {
  if (!id) return;

  // Invalidate pending work even when history returns to the displayed radar.
  const request = ++radarRequest;
  document.body.dataset.radarLoading = "true";
  selector.disabled = true;

  try {
    if (id === activeRadarId) {
      selector.value = id;
      return;
    }

    const radarData = await fetchRadarData(radarRegistry, id);
    if (request !== radarRequest) return;

    const nextRadar = new TechRadar(radarData, radarOptions);
    currentRadar?.destroy();
    currentRadar = nextRadar.render();
    activeRadarId = id;
    selector.value = id;

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("radar", id);
      window.history.pushState({}, "", url);
    }
  } catch (error) {
    if (request !== radarRequest) return;
    reportLoadError(error);
    selector.value = activeRadarId || selector.value;
  } finally {
    if (request === radarRequest) {
      selector.disabled = false;
      delete document.body.dataset.radarLoading;
    }
  }
}

function reportLoadError(error) {
  console.error(error);
  if (!currentRadar) {
    document.getElementById("legend").textContent =
      "Unable to load radar configuration.";
  }
}

async function initialise() {
  radarRegistry = await loadRadarRegistry();
  const selectedRadar = getSelectedRadarId(radarRegistry);

  buildRadarSelector(radarRegistry);
  selector.value = selectedRadar;

  selector.addEventListener("change", event => {
    switchRadar(event.target.value);
  });

  window.addEventListener("popstate", () => {
    switchRadar(getSelectedRadarId(radarRegistry), false);
  });

  await switchRadar(selectedRadar, false);
}

initialise().catch(reportLoadError);
