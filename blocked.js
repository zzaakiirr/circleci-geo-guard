const api = globalThis.browser ?? chrome;
const RETRY_MS = 5000;
const status = document.getElementById("status");

async function run() {
  status.textContent = "Checking your location...";
  const { location: ip, allowed, url } = await api.runtime.sendMessage({ type: "check", target: location.hash.slice(1) });
  if (allowed) return location.replace(url);

  status.textContent = ip
    ? `Your IP is in ${[ip.region, ip.country].filter(Boolean).join(", ")}. CircleCI stays blocked. ` +
      "Switch VPN location; this page retries every 5 seconds."
    : "Could not detect your location. CircleCI stays blocked. Retrying every 5 seconds.";
  setTimeout(run, RETRY_MS);
}

run();
