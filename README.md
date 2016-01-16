# subcinode

Your subs, now from your console.

**Subcino(de)** is a npm package to automatically download the correct subtitles for your video files. It is the node version of [Subcino](http://www.subcino.com).

It is completely free, and does not require registration. Basically, it is a legit wrapper for [Open Subtitles](http://www.opensubtitles.org) APIs.

## Installation

Install with NPM:

```shell
npm install subcinode --global
```

## Documentation

```shell
subcinode -useSubs -langs=<String> -recursive=<Boolean> -extensions=<String> -path=<String> -save -debug
```

| Options | Type | Default | Description |
|---|---|---|---|
| langs | String | 'all' | Comma-separated value to specify the langs to download. Default is 'all'. See below for valid values for languages.
| recursive | Boolean | true | If true, navigates through all folders under the current one. |
| useSubs | Boolean | false | If true, subtitles are saved under a 'subs/' folder. Otherwise, they are same in the same folder as the video file. |
| extensions | String | 'mp4,mkv,avi' | Comma-separated value of the extensions to search for. |
| path | String | Current shell directory | If specified, looks for video files under that path. |
| save | String | <Not used> | If `-save` is specified, the current settings will be saved as default. |
| debug | String | <Not used> | If `-debug` is specified, more information is given in the console. |
| settings | String | <Not used> | If `-settings` is specified, subcino shows the current settings ( and terminates ). |

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
subcinode -langs=eng,ita -recursive=false -extensions=mp4,avi -path="/Users/my.user/Downloads"
```

### Search with specific settings and save them as default

```shell
subcinode -save -langs=eng,ita -recursive=false -extensions=mp4
```

So, from that moment on, it is possible to write

```shell
subcinode
```
 to perform the search with the default saved settings.
 
### Show the current settings ( and terminate the program )

```shell
subcinode -settings
```

## Changelog

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