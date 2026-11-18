# CircleCI Geo Guard

<img src="icons/icon-128.png" alt="" width="64" align="right">

A browser extension for Chrome and Firefox that stops you from opening CircleCI while your VPN puts you in a
location CircleCI blocks. One wrong VPN server pick can get a CircleCI account restricted, and free-plan restrictions
are permanent.

## What it blocks

CircleCI's [U.S. Sanctions Policy](https://support.circleci.com/hc/en-us/articles/360043679453) (list dated
2026-07-09) names these Sanctioned Locations:

- Russia
- Belarus
- Cuba
- Iran
- North Korea
- Crimea, Donetsk and Luhansk regions of Ukraine (the rest of Ukraine is allowed)

The extension blocks every request to CircleCI domains while your IP is in one of them: `circleci.com`,
`circleci.io`, `circleci.dev`, `circle-artifacts.com`, CircleCI's CloudFront asset host, and all their subdomains.

## How it works

- Every CircleCI page load first shows a check page. It looks up your IP location
  ([ipinfo.io](https://ipinfo.io), fallback [country.is](https://country.is)). A safe location forwards you to the page
  you asked for. A blocked location keeps CircleCI blocked and retries every 5 seconds, so switching VPN unblocks it.
- While a CircleCI tab is open, it rechecks every 30 seconds. If you move to a blocked location, it blocks CircleCI and
  reloads those tabs, which also stops their background requests.
- It fails closed: browser start, a failed lookup, or Ukraine with an unknown region all block.
- Closing the last CircleCI tab blocks again, so the next visit gets a fresh check.

It sends nothing anywhere except the two location lookups, which see only your IP.

## Install

### Chrome (and other Chromium browsers)

1. Download this repository: `git clone https://github.com/zzaakiirr/circleci-geo-guard.git`, or **Code > Download ZIP**
   and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the `circleci-geo-guard` folder.
4. Chrome may list warnings about `background.scripts` and `browser_specific_settings`. They are for Firefox and are
   safe to ignore.

It stays installed after restarts. To update: `git pull`, then click the reload arrow on the extension card.

### Firefox (and Firefox-based browsers)

Temporary install (removed when the browser restarts):

1. Download this repository as above.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and pick `manifest.json` in the folder.
4. Open `about:addons`, click the extension, open **Permissions**, and turn on every site permission. Without them it
   cannot block CircleCI or check your location.

Permanent install: Firefox only keeps signed add-ons. Signing is free and automatic:

1. Zip the folder contents (not the folder itself):
   `cd circleci-geo-guard && zip -r ../circleci-geo-guard.zip . -x '.git/*'`
2. Upload the zip at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/addon/submit/distribution)
   and pick **On your own** (unlisted). Only you get the file.
3. Download the signed `.xpi` and open it in the browser.
4. Check the site permissions as in step 4 above.

### Check that it works

1. Open [app.circleci.com](https://app.circleci.com). You should see "Checking your location..." for a moment, then
   CircleCI.
2. Switch your VPN to a blocked location, for example Russia. Within 30 seconds the tab should switch to the block page.
3. Switch back. The block page should forward you within 5 seconds.

## Set it up with an AI assistant

Paste this into an AI coding assistant that can run shell commands (Claude Code, Codex, Cursor, and so on):

```text
Install the CircleCI Geo Guard browser extension from https://github.com/zzaakiirr/circleci-geo-guard for me.

1. Clone it into ~/circleci-geo-guard (or `git pull` if it is already there).
2. Read README.md and the files it describes, and tell me in two sentences what the extension does and which
   network requests it makes, so I know it is safe.
3. Find which browsers I have installed (Chrome or other Chromium-based browsers, Firefox or other Firefox-based browsers).
4. For each one, walk me through the install steps from the README one at a time, waiting for me to confirm each
   step. You cannot click in the browser for me, so give me the exact page to open and the exact button to press.
5. For Firefox, ask whether I want the temporary install or the permanent signed one. For the signed one,
   build the zip for me with the command in the README.
6. Finish by walking me through "Check that it works".
```

## Change the blocked list

Edit the top of [`background.js`](background.js):

- `BLOCKED_COUNTRIES`: two-letter country codes blocked everywhere.
- `PARTLY_BLOCKED_COUNTRIES`: countries where only some regions are blocked, matched against the region name.
- `CIRCLECI_DOMAINS`: domains to guard. Keep `host_permissions` in [`manifest.json`](manifest.json) in sync.

Then reload the extension.

## Limits

- You can still reach CircleCI for up to 30 seconds after switching VPN while a CircleCI tab is open.
- Location databases differ. CircleCI may place an IP in a different country or region than ipinfo does,
  especially near borders, and region names vary.
- It only guards the browser. The `circleci` CLI, `curl`, and other browsers without the extension are not covered.
- CircleCI says its automated process flags user IDs. The extension only stops you from reaching CircleCI from a
  blocked location. It does not lift a restriction that already happened.

## License

[MIT](LICENSE)
