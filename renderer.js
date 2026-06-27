const PORT = new URLSearchParams(location.search).get("port");

const STATIONS = [
  { name: "Groove Salad · SomaFM", url: "https://ice1.somafm.com/groovesalad-128-mp3" },
  { name: "Drone Zone · SomaFM", url: "https://ice1.somafm.com/dronezone-128-mp3" },
  { name: "DEF CON Radio · SomaFM", url: "https://ice1.somafm.com/defcon-256-mp3" },
  { name: "Secret Agent · SomaFM", url: "https://ice1.somafm.com/secretagent-128-mp3" },
];

const $ = (id) => document.getElementById(id);

let mode = "radio";
let systemStream = null;

const audioListen = new Audio();
const audioDiscord = new Audio();
audioListen.crossOrigin = "anonymous";
audioDiscord.crossOrigin = "anonymous";

function setStatus(msg, cls) {
  const el = $("status");
  const dot = $("dot");
  el.textContent = msg;
  el.className = cls || "";
  dot.className = "dot" + (cls ? " " + cls : "");
}

function setPlaying(playing) {
  const rule = $("rule");
  if (playing) rule.classList.add("playing");
  else rule.classList.remove("playing");
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

async function playRadio() {
  const custom = $("custom").value.trim();
  const station = STATIONS[Number($("station").value)];
  const url = custom || (station && station.url);
  if (!url) return setStatus("No station or URL selected", "err");

  const src = `http://127.0.0.1:${PORT}/stream?url=${encodeURIComponent(url)}`;
  audioListen.srcObject = null;
  audioDiscord.srcObject = null;
  audioListen.src = src;
  audioDiscord.src = src;

  await routeAndPlay(audioListen, audioDiscord);
}

async function playSystem() {
  setStatus("Capturing system audio…");
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
    stream.getVideoTracks().forEach((t) => t.stop());

    systemStream = stream;
    const tracks = stream.getAudioTracks();
    if (!tracks.length) {
      setStatus("No audio captured — make sure something is playing", "err");
      return;
    }

    // No listen-back needed — user already hears it from the source app.
    audioDiscord.removeAttribute("src");
    audioDiscord.srcObject = new MediaStream(tracks);
    audioDiscord.volume = Number($("volume").value) / 100;

    if (audioDiscord.setSinkId) {
      try { await audioDiscord.setSinkId($("device-discord").value); }
      catch (e) { setStatus("Could not route Discord device: " + e.message, "err"); return; }
    }

    setStatus("Connecting…");
    await audioDiscord.play();
  } catch (e) {
    setStatus("Capture failed: " + e.message, "err");
  }
}

function play() {
  return mode === "radio" ? playRadio() : playSystem();
}

function stop() {
  for (const a of [audioListen, audioDiscord]) {
    a.pause();
    a.srcObject = null;
    a.removeAttribute("src");
    a.load();
  }
  if (systemStream) {
    systemStream.getTracks().forEach((t) => t.stop());
    systemStream = null;
  }
  setPlaying(false);
  setStatus("Idle");
}

function onPlayingHandler() {
  const discordLabel = $("device-discord").selectedOptions[0]?.textContent || "virtual cable";
  if (mode === "system") {
    setStatus(`Playing → ${discordLabel}`, "ok");
  } else {
    const listenLabel = $("device-listen").selectedOptions[0]?.textContent || "speakers";
    setStatus(`Playing → ${listenLabel}  ·  ${discordLabel}`, "ok");
  }
  setPlaying(true);
}
audioListen.onplaying = onPlayingHandler;
audioDiscord.onplaying = () => { if (mode === "system") onPlayingHandler(); };

audioListen.onerror = () => {
  if (audioListen.src || audioListen.srcObject) {
    setPlaying(false);
    setStatus("Stream error — bad URL or station offline", "err");
  }
};

$("volume").addEventListener("input", (e) => {
  const vol = Number(e.target.value) / 100;
  audioListen.volume = vol;
  audioDiscord.volume = vol;
  $("volval").textContent = e.target.value + "%";
});

$("tab-radio").addEventListener("click", () => {
  mode = "radio";
  $("tab-radio").classList.add("active");
  $("tab-system").classList.remove("active");
  $("section-radio").style.display = "";
  $("section-system").style.display = "none";
  $("field-listen").style.display = "";
  stop();
});

$("tab-system").addEventListener("click", () => {
  mode = "system";
  $("tab-system").classList.add("active");
  $("tab-radio").classList.remove("active");
  $("section-system").style.display = "";
  $("section-radio").style.display = "none";
  $("field-listen").style.display = "none";
  stop();
});

$("play").addEventListener("click", play);
$("stop").addEventListener("click", stop);
$("refresh").addEventListener("click", loadDevices);

fillStations();
loadDevices();
