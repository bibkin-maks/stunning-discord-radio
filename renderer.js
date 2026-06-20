const PORT = new URLSearchParams(location.search).get("port");

const STATIONS = [
  { name: "Groove Salad · SomaFM", url: "https://ice1.somafm.com/groovesalad-128-mp3" },
  { name: "Drone Zone · SomaFM", url: "https://ice1.somafm.com/dronezone-128-mp3" },
  { name: "DEF CON Radio · SomaFM", url: "https://ice1.somafm.com/defcon-256-mp3" },
  { name: "Secret Agent · SomaFM", url: "https://ice1.somafm.com/secretagent-128-mp3" },
];

const $ = (id) => document.getElementById(id);

const audio = new Audio();
audio.crossOrigin = "anonymous";

function setStatus(msg, cls) {
  const el = $("status");
  el.textContent = msg;
  el.className = cls || "";
}

function fillStations() {
  const sel = $("station");
  STATIONS.forEach((s, i) => {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = s.name;
    sel.appendChild(o);
  });
}

async function loadDevices() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
  } catch {}
  const devices = await navigator.mediaDevices.enumerateDevices();
  const outs = devices.filter((d) => d.kind === "audiooutput");
  const sel = $("device");
  const prev = sel.value;
  sel.innerHTML = "";
  for (const d of outs) {
    const o = document.createElement("option");
    o.value = d.deviceId;
    o.textContent = d.label || `Output ${d.deviceId.slice(0, 6)}`;
    sel.appendChild(o);
  }
  if (prev) sel.value = prev;
  setStatus(`${outs.length} output device${outs.length !== 1 ? "s" : ""} found`);
}

async function play() {
  const custom = $("custom").value.trim();
  const station = STATIONS[Number($("station").value)];
  const url = custom || (station && station.url);
  if (!url) return setStatus("No station or URL selected", "err");

  audio.volume = Number($("volume").value) / 100;

  if (audio.setSinkId) {
    try { await audio.setSinkId($("device").value); }
    catch (e) { setStatus("Could not route audio: " + e.message, "err"); return; }
  }

  audio.src = `http://127.0.0.1:${PORT}/stream?url=${encodeURIComponent(url)}`;
  setStatus("Connecting…");
  try {
    await audio.play();
  } catch (e) {
    setStatus("Playback failed: " + e.message, "err");
  }
}

function stop() {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  setStatus("Idle");
}

audio.onplaying = () => {
  const label = $("device").selectedOptions[0]?.textContent || "output";
  setStatus(`Playing → ${label}`, "ok");
};

audio.onerror = () => {
  if (audio.src) setStatus("Stream error — bad URL or station offline", "err");
};

$("volume").addEventListener("input", (e) => {
  audio.volume = Number(e.target.value) / 100;
  $("volval").textContent = e.target.value + "%";
});

$("play").addEventListener("click", play);
$("stop").addEventListener("click", stop);
$("refresh").addEventListener("click", loadDevices);

fillStations();
loadDevices();
