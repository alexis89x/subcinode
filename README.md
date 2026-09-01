# subcinode

Your subs, now from your console.

**Subcino(de)** is an npm package to automatically download the correct subtitles for your video
files. It is the node version of [Subcino](http://www.subcino.com), and a thin, legit wrapper around
the [OpenSubtitles](https://www.opensubtitles.com) REST API.

## Requirements

* **Node.js >= 20**
* A free **OpenSubtitles API key** — register a consumer at
  <https://www.opensubtitles.com/consumers> and export it:

  ```shell
  export OPENSUBTITLES_API_KEY=your_key
  # optional, needed for the /download quota of a free account:
  export OPENSUBTITLES_USERNAME=your_user
  export OPENSUBTITLES_PASSWORD=your_pass
  ```

## Installation

```shell
npm install subcinode --global
```

## Documentation

```shell
subcinode [--langs <list>] [--extensions <list>] [--path <dir>] \
          [--recursive | --no-recursive] [--use-subs] \
          [--provider <name>] [--save] [--settings] [--debug]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--langs` | String | `all` | Comma-separated language codes to download. 2- or 3-letter codes are both accepted (`en` / `eng`). See the table below. |
| `--extensions` | String | `mp4,mkv,avi` | Comma-separated list of video extensions to look for. |
| `--path` | String | current directory | Directory to scan for video files. |
| `--recursive` / `--no-recursive` | Boolean | `true` | Whether to descend into sub-folders (the output `subs/` folder is always skipped). |
| `--use-subs` | Boolean | `false` | Save subtitles under a `subs/` folder instead of next to the video file. |
| `--provider` | String | `opensubtitles` | Subtitle provider to use. |
| `--save` | Flag | – | Persist the supplied options to `settings.json` as the new defaults. |
| `--settings` | Flag | – | Print the effective settings and exit. |
| `--debug` | Flag | – | Verbose logging. |

> **Legacy flags** — the old single-dash style (`-langs=eng,ita`, `-recursive=false`, `-useSubs`,
> `-path=…`, `-save`, `-debug`, `-settings`) is still accepted and mapped to the options above.

A subtitle is skipped when its target file (`Movie.<lang>.srt`) already exists.

### Valid languages

| Language      | Value       	|
|------------- |--------------|
| English 		| eng 			|
| Italiano 		| ita 			|
| French 		| fre 			|
| German 		| ger 			|
| Spanish 		| spa 			|
| Arabic 		| ara 			|
| Afrikaans 	| afr 			|
| Albanian 		| alb 			|
| Armenian 		| arm 			|
| Basque 		| baq 			|
| Belarusian 	| bel 			|
| Bengali 		| ben 			|
| Bosnian | bos |
| Breton | bre |
| Bulgarian | bul |
| Burmese | bur |
| Catalan | cat |
| Chinese (simplified) | chi |
| Croatian | hr |
| Czech | cze |
| Danish | dan |
| Dutch | dut |
| Esperanto | epo |
| Estonian | est |
| Finnish | fin |
| Galician | glg |
| Georgian | geo |
| Greek | ell |
| Hebrew | heb |
| Hindi | hin |
| Hungarian | hun |
| Icelandic | ice |
| Indonesian | ind |
| Japanese | jpn |
| Kazakh | kaz |
| Khmer | khm |
| Korean | kor |
| Latvian | lav |
| Lithuanian | lit |
| Luxembourgish | ltz |
| Macedonian | mac |
| Malay | may |
| Malayalam | mal |
| Mongolian | mon |
| Norwegian | nor |
| Occitan | oci |
| Persian | per |
| Polish | pol |
| Portuguese | por |
| Portuguese (BR) | pob |
| Romanian | rum |
| Russian | rus |
| Serbian | scc |
| Sinhalese | sin |
| Slovak | slo |
| Slovenian | slv |
| Swahili | swa |
| Swedish | swe |
| Syriac | syr |
| Tamil | tam |
| Telugu | tel |
| Thai | tha |
| Turkish | tur |
| Ukrainian | ukr |
| Urdu | urd |
| Vietnamese | vie |

## Usage Examples

### Search all subtitles with the default settings.

```shell
subcinode
```

### Search all English and Italian subtitles for any MP4 or AVI video file in the User Downloads folder, not recursively.

```shell
subcinode --langs eng,ita --no-recursive --extensions mp4,avi --path "/Users/my.user/Downloads"
```

### Search with specific settings and save them as default

```shell
subcinode --save --langs eng,ita --no-recursive --extensions mp4
```

So, from that moment on, it is possible to write

```shell
subcinode
```
 to perform the search with the default saved settings.

### Show the current settings ( and terminate the program )

```shell
subcinode --settings
```

## Development

```shell
npm install
npm test        # runs the node:test suite
```

The code is plain ESM under `src/` with a thin CLI in `bin/subcinode.js`. Subtitle back-ends live in
`src/providers/` and implement `init()`, `search(fileInfo, opts)` and `resolveDownloadUrl(result)`;
register a new one with `registerProvider(name, ProviderClass)`.

## Changelog

### Version 2.0.0
* Rewritten as ESM with `async`/`await` and split into small modules; requires Node >= 20.
* Switched to the OpenSubtitles **REST API** (the old XML-RPC endpoint was retired). An API key is
  now required.
* Pluggable provider layer (`src/providers/`).
* Modern `--flag value` CLI via `commander`; the legacy single-dash flags still work.
* Dropped the `async`, `http`, `jsonfile` and `subtitles-parser` dependencies; movie hashing is now
  built in; SRT handling moved to the maintained `subtitle` package.
* Fixed: crash on the default `langs: all` path, an always-true language filter, a broken
  `-extensions=` parser, `http` downloads of HTTPS links, a read-before-write race on the promo
  caption, and mutation of the shared default settings.
* Added a `node:test` test suite.

### Version 1.1.3
* Fixed dependency problems

### Version 1.1.2
* Fixed endsWith problem for some users

### Version 1.1.1
* Removed unnecessary files

### Version 1.1.0
* Added subtitle parsing
* Added -settings parameter

### Version 1.0.1
* Minor documentation fixes.

### Version 1.0.0

* Major version bump
* Fixed -langs settings bug
* Added possibility to set default settings.

### Version 0.0.7

* Renamed package as subcinode.

### Version 0.0.6

* Major refactoring.

### Version 0.0.5

* Added license, documentation, readme, changelog and authors.
* Fixed multiple bugs.

### Version 0.0.4

* Minor fixes to allow npm package installed globally.

### Version 0.0.3

* Implemented complete workflow

### Version 0.0.2

* Added directory tree navigation 

### Version 0.0.1

* Preliminary tests with nodeJS and npm


## License

The MIT License (MIT)

Copyright (c) 2015 Alessandro Piana

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.