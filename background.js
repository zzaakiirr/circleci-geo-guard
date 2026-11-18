const api = globalThis.browser ?? chrome;

// CircleCI "Sanctioned Locations": https://support.circleci.com/hc/en-us/articles/360043679453
const BLOCKED_COUNTRIES = new Set(["BY", "CU", "IR", "KP", "RU"]);
const PARTLY_BLOCKED_COUNTRIES = { UA: /crimea|sevastopol|donetsk|luhansk|lugansk/i };

// Each entry also covers its subdomains. Keep in sync with manifest host_permissions.
const CIRCLECI_DOMAINS = [
  "circleci.com",
  "circleci.io",
  "circleci.dev",
  "circle-artifacts.com",
  "d2qm0z2kzhiwa.cloudfront.net",
];
const CIRCLECI_TABS = { url: CIRCLECI_DOMAINS.map((domain) => `*://*.${domain}/*`) };
const FALLBACK_URL = "https://app.circleci.com/";
const RECHECK_ALARM = "recheck";
const LOOKUP_TIMEOUT_MS = 4000;

const RULES = [
  {
    id: 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { regexSubstitution: `${api.runtime.getURL("blocked.html")}#\\0` },
    },
    condition: { regexFilter: "^.*$", requestDomains: CIRCLECI_DOMAINS, resourceTypes: ["main_frame"] },
  },
  {
    id: 2,
    priority: 1,
    action: { type: "block" },
    condition: { requestDomains: CIRCLECI_DOMAINS },
  },
];
const RULE_IDS = RULES.map((rule) => rule.id);

const LOOKUPS = [
  async () => {
    const { country, region } = await fetchJson("https://ipinfo.io/json");
    return { country, region };
  },
  async () => {
    const { country, subdivision } = await fetchJson("https://api.country.is/?fields=subdivision");
    return { country, region: subdivision };
  },
];

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

async function lookupLocation() {
  for (const lookup of LOOKUPS) {
    try {
      const location = await lookup();
      if (/^[A-Z]{2}$/.test(location.country)) return location;
    } catch (error) {
      console.warn("Geo lookup failed", error);
    }
  }
  return null;
}

function isSafe(location) {
  if (!location || BLOCKED_COUNTRIES.has(location.country)) return false;

  const blockedRegions = PARTLY_BLOCKED_COUNTRIES[location.country];
  if (!blockedRegions) return true;

  return Boolean(location.region) && !blockedRegions.test(location.region);
}

function forwardUrl(target) {
  try {
    const url = new URL(target);
    const circleci = CIRCLECI_DOMAINS.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
    if (circleci && ["https:", "http:"].includes(url.protocol)) return url.href;
  } catch {}
  return FALLBACK_URL;
}

async function block() {
  await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds: RULE_IDS, addRules: RULES });
  await api.alarms.clear(RECHECK_ALARM);
}

async function allow() {
  await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds: RULE_IDS });
  await api.alarms.create(RECHECK_ALARM, { periodInMinutes: 0.5 });
}

async function check() {
  const location = await lookupLocation();
  await (isSafe(location) ? allow() : block());
  return location;
}

async function recheck() {
  const tabs = await api.tabs.query(CIRCLECI_TABS);
  if (tabs.length === 0) return block();

  if (isSafe(await lookupLocation())) return;

  await block();
  await Promise.all(tabs.map((tab) => api.tabs.reload(tab.id)));
}

api.runtime.onInstalled.addListener(block);
api.runtime.onStartup.addListener(block);

api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RECHECK_ALARM) recheck();
});

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "check") return false;

  check().then((location) => {
    sendResponse({ location, allowed: isSafe(location), url: forwardUrl(message.target) });
  });
  return true;
});
