const PORT = new URLSearchParams(location.search).get("port");

const STATIONS = [
  { name: "Groove Salad · SomaFM", url: "https://ice1.somafm.com/groovesalad-128-mp3" },
  { name: "Drone Zone · SomaFM", url: "https://ice1.somafm.com/dronezone-128-mp3" },
  { name: "DEF CON Radio · SomaFM", url: "https://ice1.somafm.com/defcon-256-mp3" },
  { name: "Secret Agent · SomaFM", url: "https://ice1.somafm.com/secretagent-128-mp3" },
];

const $ = (id) => document.getElementById(id);

const audioListen = new Audio();
const audioDiscord = new Audio();
audioListen.crossOrigin = "anonymous";
audioDiscord.crossOrigin = "anonymous";

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

  for (const selId of ["device-listen", "device-discord"]) {
    const sel = $(selId);
    const prev = sel.value;
    sel.innerHTML = "";
    for (const d of outs) {
      const o = document.createElement("option");
      o.value = d.deviceId;
      o.textContent = d.label || `Output ${d.deviceId.slice(0, 6)}`;
      sel.appendChild(o);
    }
    if (prev) sel.value = prev;
  }
  setStatus(`${outs.length} output device${outs.length !== 1 ? "s" : ""} found`);
}

async function routeAndPlay(listenEl, discordEl) {
  const vol = Number($("volume").value) / 100;
  listenEl.volume = vol;
  discordEl.volume = vol;

  if (listenEl.setSinkId) {
    try { await listenEl.setSinkId($("device-listen").value); }
    catch (e) { setStatus("Could not route listen device: " + e.message, "err"); return; }
  }
  if (discordEl.setSinkId) {
    try { await discordEl.setSinkId($("device-discord").value); }
    catch (e) { setStatus("Could not route Discord device: " + e.message, "err"); return; }
  }

  setStatus("Connecting…");
  try {
    await Promise.all([listenEl.play(), discordEl.play()]);
  } catch (e) {
    setStatus("Playback failed: " + e.message, "err");
  }
}

async function play() {
  const custom = $("custom").value.trim();
  const station = STATIONS[Number($("station").value)];
  const url = custom || (station && station.url);
  if (!url) return setStatus("No station or URL selected", "err");

  const src = `http://127.0.0.1:${PORT}/stream?url=${encodeURIComponent(url)}`;
  audioListen.src = src;
  audioDiscord.src = src;

  await routeAndPlay(audioListen, audioDiscord);
}

function stop() {
  for (const a of [audioListen, audioDiscord]) {
    a.pause();
    a.removeAttribute("src");
    a.load();
  }
  setStatus("Idle");
}

audioListen.onplaying = () => {
  const listenLabel = $("device-listen").selectedOptions[0]?.textContent || "speakers";
  const discordLabel = $("device-discord").selectedOptions[0]?.textContent || "virtual cable";
  setStatus(`Playing → ${listenLabel}  ·  ${discordLabel}`, "ok");
};

audioListen.onerror = () => {
  if (audioListen.src) {
    setStatus("Stream error — bad URL or station offline", "err");
  }
};

$("volume").addEventListener("input", (e) => {
  const vol = Number(e.target.value) / 100;
  audioListen.volume = vol;
  audioDiscord.volume = vol;
  $("volval").textContent = e.target.value + "%";
});

$("play").addEventListener("click", play);
$("stop").addEventListener("click", stop);
$("refresh").addEventListener("click", loadDevices);

fillStations();
loadDevices();
