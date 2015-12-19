# subcinode

Your subs, now from your console.

**Subcino(de)** is a npm packate to automatically download the correct subtitles for your video files. It is the node version of [Subcino](http://www.subcino.com).

It is completely free, and does not require registration. Basically, it is a legit wrapper for [Open Subtitles](http://www.opensubtitles.org) APIs;

## Installation

Install with NPM:

```shell
npm install subcinode --global
```

## Documentation

```shell
subcinode -useSubs -langs=<String> -recursive=<Boolean> -extensions=<String> -noOutput=<Boolean> -path=<String>
```

| Options | Type | Default | Description |
|---|---|---|---|
| langs | String | 'all' | Comma-separated value to specify the langs to download. Default is 'all'. Standard 2-letters code notation applied. E.g. 'en,it,de'. |
| recursive | Boolean | true | If true, navigates through all folders under the current one. |
| useSubs | Boolean | false | If true, subtitles are saved under a 'subs/' folder. Otherwise, they are same in the same folder as the video file. |
| extensions | String | 'mp4,mkv,avi' | Comma-separated value of the extensions to search for. |
| path | String | Current shell directory | If specified, looks for video files under that path. |

## Usage Examples

Search all subtitles for any video file in the current folder, recursively.

```shell
subcinode
```
Search all English and Italian subtitles for any MP4 video file in the User Downloads folder, not recursively.

```shell
subcinode -langs=en,it -recursive=false -extensions=mp4 -path="/Users/my.user/Downloads"
```

## Changelog

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