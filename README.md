# havResonance

![havResonance logo](public/havResonance-light.svg#gh-light-mode-only)
![havResonance logo](public/havResonance-dark.svg#gh-dark-mode-only)

havResonance is an Angular-based music player for an OpenSubsonic-compatible music collection.

It is built as a static browser application: you bring an OpenSubsonic-compatible server, enter
your connection details, and browse and play the music exposed by that server.

## Table of Contents

- [Features](#features)
- [Status](#status)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [Proxy-Backed Providers](#proxy-backed-providers)
- [Scripts](#scripts)
- [GitHub Pages](#github-pages)
- [Privacy](#privacy)
- [Assets](#assets)
- [License Files](#license-files)
- [Contributing](#contributing)
- [License](#license)

## Features

- Browse newest albums from an OpenSubsonic-compatible server
- Search albums and artists
- Open album pages with track lists, cover art, durations, and album playback
- Play albums or individual tracks with a persistent player bar
- Manage the playback queue, shuffle, repeat, and volume
- Show lyrics when the connected server provides them
- Switch between English and German
- Switch between light and dark mode
- Build for static hosting, including GitHub Pages

## Status

This project is currently in early development. The current focus is a small, usable music player
for an existing OpenSubsonic-compatible music collection.

## Requirements

- Node.js and npm
- An OpenSubsonic-compatible music server or a compatible provider proxy
- For hosted/static builds, direct server connections must be reachable over HTTPS and allow
  browser CORS requests from the app origin

## Getting Started

Install dependencies:

```bash
npm ci
```

Start the local development server:

```bash
npm start
```

The app runs at `http://localhost:4200/`.

Local development uses `proxy.conf.json`, so `/api/opensubsonic` can be used as a
development-only proxy path. This dev-server proxy currently forwards to
`https://bandcamp.com/api/subsonic` and can be changed locally while testing another provider.
Hosted builds cannot use Angular's local dev-server proxy. Enter a full HTTPS OpenSubsonic server
URL or a deployed proxy URL instead.

## Proxy-Backed Providers

Some providers expose an OpenSubsonic-compatible API but do not allow direct cross-origin browser
requests from the app origin. Those providers need a proxy-backed deployment.

During local development, choose Proxy on the connection page and use:

```text
/api/opensubsonic
```

A hosted proxy deployment should mirror:

```text
/api/opensubsonic/rest/<endpoint>.view
```

to the provider's OpenSubsonic-compatible base URL, for example:

```text
https://bandcamp.com/api/subsonic/rest/<endpoint>.view
```

The proxy must forward query parameters and streaming headers such as `Range`. It should not log
request URLs because OpenSubsonic authentication values are sent as query parameters.

The proxy implementation is intentionally separate from this app repository. Keep it in its own
repository or deployment project, then use the deployed proxy URL in the hosted app.

## Scripts

| Command                     | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| `npm start`                 | Starts the Angular development server.                                   |
| `npm run build`             | Creates a production build.                                              |
| `npm run build:pages`       | Creates a GitHub Pages-ready production build with relative asset paths. |
| `npm test -- --watch=false` | Runs the unit tests once.                                                |
| `npm run sync:version`      | Updates the app version source from `package.json`.                      |
| `npm run sync:license`      | Copies the root `LICENSE` to `public/license.txt`.                       |
| `npm run sync:licenses`     | Regenerates `public/third-party-licenses.txt`.                           |

## GitHub Pages

The GitHub Pages site is published at:

```text
https://havresonance.havoc.de/
```

The same build uses relative asset paths so it can also run from the repository path if the custom
domain is removed:

```text
https://havoc7891.github.io/havResonance/
```

Deployments run through GitHub Actions when changes are pushed to `main`. The workflow can also be
started manually from the Actions tab.

Create the same GitHub Pages-ready build locally:

```bash
npm run build:pages
```

The generated files are written to:

```text
dist/havResonance/browser
```

The app uses Angular hash routing so static hosting can serve routes without server-side rewrites:

- `/#/library`
- `/#/album/<id>`
- `/havResonance/#/library`
- `/havResonance/#/album/<id>`

The workflow publishes `dist/havResonance/browser` as the GitHub Pages artifact.

## Privacy

havResonance has no user account system. In static/direct-server mode, connection details are stored
in the browser session and are only used to connect to the server URL you enter.

Proxy-backed deployments route OpenSubsonic requests through the configured proxy. That proxy
should be operated as part of the deployment and must avoid logging request URLs because
OpenSubsonic authentication values are sent as query parameters.

## Assets

Favicon and app icon assets are generated from the logo mark SVGs:

```bash
powershell -ExecutionPolicy Bypass -File scripts/create-favicon-assets.ps1
```

The generator creates the themed favicon variants and manifest icons used by the app.

## License Files

The app license is copied from `LICENSE` to `public/license.txt`. Runtime third-party licenses are
generated into `public/third-party-licenses.txt`. Both files are linked from the About page and
copied into the browser build output.

## Contributing

Thank you for your interest! Suggestions for features and bug reports are always welcome via issues.

To maintain a consistent design and quality for havResonance, changes are implemented by the
maintainer rather than via direct pull requests.

## License

Copyright © 2026 René Nicolaus

havResonance is released under the [MIT license](LICENSE).
