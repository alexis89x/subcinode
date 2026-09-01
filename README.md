# subcinode

**Your subs, now — from your console.**

`subcinode` is a command-line tool that automatically finds and downloads the *right* subtitles for
your local video files. Point it at a folder, it scans for video files, identifies each one by its
content hash, asks [OpenSubtitles](https://www.opensubtitles.com) for the best matching subtitle in
the languages you want, and drops the `.srt` next to the video.

- Content-hash matching — subtitles are matched to the exact release, not guessed from the filename.
- Batch + recursive — process a whole library in one run.
- Multi-language — download several languages per file in a single pass.
- Idempotent — files that already have a subtitle are skipped.
- Pluggable back-ends — OpenSubtitles today, other providers via a small interface.

---

## How it works

For every video file found under the target path, `subcinode`:

1. **Hashes** it with the OpenSubtitles/OSDb algorithm (file size + checksums of the first and last
   64 KiB).
2. **Searches** the provider for subtitles matching that hash, filtered to your languages.
3. **Downloads** the most-downloaded subtitle per language to `Movie.<lang>.srt` (or into a
   `subs/` sub-folder with `--use-subs`).
4. **Tags** the downloaded `.srt` with a single short caption in a silent gap
   (`Downloaded with subcinode …`).

A language is skipped when its target file already exists, so re-running is cheap.

---

## Requirements

- **Node.js ≥ 20**
- A **free OpenSubtitles API key** (see below). Anonymous search works, but downloads require a key,
  and the per-day download quota is tied to a (free) OpenSubtitles account.

### Getting an OpenSubtitles API key

1. Create a free account at <https://www.opensubtitles.com>.
2. Go to <https://www.opensubtitles.com/consumers> and register a new **consumer** — this gives you
   an API key.
3. Make the key (and, for downloads, your account login) available to `subcinode` via environment
   variables:

   ```shell
   export OPENSUBTITLES_API_KEY=your_api_key
   export OPENSUBTITLES_USERNAME=your_username   # needed for the download quota
   export OPENSUBTITLES_PASSWORD=your_password
   ```

   Put these in your shell profile (`~/.zshrc`, `~/.bashrc`, …) to make them permanent. `subcinode`
   never writes credentials to disk.

---

## Installation

```shell
npm install --global subcinode
```

Or run it without installing:

```shell
npx subcinode --langs eng,ita
```

---

## Quick start

```shell
cd ~/Movies
export OPENSUBTITLES_API_KEY=your_api_key
subcinode --langs eng,ita
```

This scans `~/Movies` (recursively), and for each `.mp4` / `.mkv` / `.avi` downloads the best English
and Italian subtitles next to the video.

---

## Usage

```shell
subcinode [--langs <list>] [--extensions <list>] [--path <dir>]
          [--recursive | --no-recursive] [--use-subs]
          [--provider <name>] [--save] [--settings] [--debug]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--langs <list>` | string | `all` | Comma-separated language codes to download. 2- and 3-letter codes are both accepted (`en` = `eng`). `all` downloads every available language. |
| `--extensions <list>` | string | `mp4,mkv,avi` | Comma-separated video extensions to look for. |
| `--path <dir>` | string | current directory | Directory to scan. |
| `--recursive` / `--no-recursive` | boolean | `true` | Descend into sub-folders. The output `subs/` folder is always skipped. |
| `--use-subs` | flag | off | Save subtitles into a `subs/` sub-folder instead of next to the video. |
| `--provider <name>` | string | `opensubtitles` | Subtitle back-end to use. |
| `--save` | flag | – | Persist the supplied options to `./settings.json` as the new defaults, then continue. |
| `--settings` | flag | – | Print the effective settings and exit. |
| `--debug` | flag | – | Verbose logging. |
| `--version` / `--help` | flag | – | Print version / help and exit. |

`subcinode` exits `0` on success and `1` if any download failed or a fatal error occurred (for
example, a missing API key).

### Legacy flags

The single-dash style from older versions still works and is mapped to the options above:

```shell
subcinode -langs=eng,ita -recursive=false -useSubs -path=/movies -save -debug -settings
```

---

## Configuration (`settings.json`)

Running with `--save` writes the current options to `settings.json` in the working directory:

```shell
subcinode --save --langs eng,ita --no-recursive --extensions mp4
```

After that, a bare `subcinode` in the same directory reuses those defaults. Precedence is:

```
built-in defaults  <  ./settings.json  <  command-line flags
```

`settings.json` is git-ignored by this repo and should not contain secrets — credentials always come
from the environment.

---

## Examples

```shell
# Every language, default settings, current folder (recursive)
subcinode

# English + Italian for MP4/AVI in a specific folder, non-recursive
subcinode --langs eng,ita --no-recursive --extensions mp4,avi --path "/Users/me/Downloads"

# Keep subtitles in a subs/ folder
subcinode --langs eng --use-subs

# Save these as the defaults for this folder, then run
subcinode --save --langs eng,ita --no-recursive --extensions mp4

# Show what settings would be used
subcinode --settings
```

---

## Language codes

`--langs` accepts ISO 639 2- or 3-letter codes. Common values:

| Language | Code | Language | Code | Language | Code |
|---|---|---|---|---|---|
| English | `eng` | Italian | `ita` | French | `fre` |
| German | `ger` | Spanish | `spa` | Portuguese | `por` |
| Portuguese (BR) | `pob` | Dutch | `dut` | Polish | `pol` |
| Russian | `rus` | Arabic | `ara` | Hebrew | `heb` |
| Greek | `ell` | Turkish | `tur` | Czech | `cze` |
| Danish | `dan` | Finnish | `fin` | Swedish | `swe` |
| Norwegian | `nor` | Romanian | `rum` | Hungarian | `hun` |
| Chinese | `chi` | Japanese | `jpn` | Korean | `kor` |
| Hindi | `hin` | Thai | `tha` | Vietnamese | `vie` |
| Indonesian | `ind` | Ukrainian | `ukr` | Croatian | `hr` |

The full list of codes OpenSubtitles supports is at
<https://www.opensubtitles.com/en/languages>.

---

## Programmatic use

`subcinode` is plain ESM and can be driven from code:

```js
import { run } from 'subcinode';

const result = await run(
  { cli: { langs: ['eng'], path: '/movies', useSubs: true } },
  { version: '2.0.0', env: process.env }
);

console.log(result.downloaded); // string[] of written paths
console.log(result.errors);     // [{ file, error }]
```

### Adding a provider

A provider is a class implementing three async methods:

```js
class MyProvider {
  get name() { return 'myprovider'; }

  // Validate credentials, obtain tokens, etc.
  async init() {}

  // fileInfo: { moviehash, moviebytesize }
  // opts:     { languages: string[] | string }  ("all" / [] means every language)
  // returns:  [{ langId, fileId, fileName, downloadCount }]
  async search(fileInfo, opts) {}

  // result: one entry from search()
  // returns: { url, fileName }
  async resolveDownloadUrl(result) {}
}
```

Register it, then select it with `--provider`:

```js
import { registerProvider } from 'subcinode/providers';
import { MyProvider } from './my-provider.js';

registerProvider('myprovider', MyProvider);
```

---

## Development

```shell
git clone https://github.com/alexis89x/subcinode.git
cd subcinode
npm install
npm test          # node:test suite, no test framework needed
```

Layout:

```
bin/subcinode.js        CLI entry point (arg parsing + wiring)
src/run.js              orchestrator: scan → hash → search → download → tag
src/config.js           defaults, settings.json, credentials from env
src/args.js             commander setup + legacy-flag shim
src/files.js            directory walking, filename helpers, language normalisation
src/hash.js             OSDb movie hash
src/download.js         streaming HTTPS download (redirects, gzip, atomic-ish)
src/promo.js            the "Downloaded with subcinode" caption
src/providers/          subtitle back-ends (opensubtitles.js) + registry
test/                   one *.test.js per module
```

---

## Changelog

### 2.0.0
- Rewritten as ESM with `async`/`await`, split into small single-purpose modules; **requires Node ≥ 20**.
- Switched to the OpenSubtitles **REST API** — the legacy XML-RPC endpoint was retired. An API key is
  now required.
- Pluggable provider layer (`src/providers/`, `subcinode/providers`).
- Modern `--flag value` CLI via `commander`; legacy single-dash flags still accepted.
- Dropped the `async`, `http`, `jsonfile` and `subtitles-parser` dependencies. Movie hashing is now
  built in; SRT handling uses the maintained `subtitle` package.
- Fixed: crash on the default `langs: all` path; an always-true language filter; a broken
  `-extensions=` parser; HTTP downloads of HTTPS links; a read-before-write race on the subtitle
  tag; mutation of the shared defaults object.
- Removed references to the defunct `www.subcino.com`.
- Added a `node:test` test suite.

### 1.1.3
- Fixed dependency problems

### 1.1.2
- Fixed `endsWith` problem for some users

### 1.1.1
- Removed unnecessary files

### 1.1.0
- Added subtitle parsing
- Added `-settings` parameter

### 1.0.1
- Minor documentation fixes

### 1.0.0
- Major version bump
- Fixed `-langs` settings bug
- Added the ability to save default settings

### 0.0.x
- Initial development: directory-tree navigation, full workflow, global install, license/docs.

---

## Authors

- Alessandro Piana ([@alexis89x](https://github.com/alexis89x)) — lead
- Matteo Silvestri ([@matteosilv](https://github.com/matteosilv))
- Paola Piatti

---

## License

[MIT](LICENSE.txt) © 2015 Alessandro Piana
