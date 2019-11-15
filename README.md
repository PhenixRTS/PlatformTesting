# Phenix Channel DevOps Tool

The Phenix channel devops tool provides a way to monitor and test channels for uptime and other operational parameters.

## Setup

```sh
npm install
```

## Run tests

To run test in browser, execute:
```sh
npm run test -- --browser=<browser> --tests=<path_to/test_file.js> --features=<features>
```

Overwrite backend and channel alias with `--channelAlias=<yourChannelAlias>` and `--backendUri=<yourBackendUri>`:
```sh
npm run test -- --tests=<path_to/test_file.js> --channelAlias=<yourChannelAlias> --backendUri=<yourBackend>
```
Same for PCast `--pcastUri=<yourPCastUri>`

See all available commands with:
```sh
npm run test -- --help
```

Currently available browsers:
* `chrome`
* `chrome:headless`
* `firefox`
* `firefox:headless`
* `safari`
* `ie`
* `opera`

Note: browser must be installed before you can run tests in desired browser, otherwise you will get an error.

To run all browsers and all tests defined under 'test/fixtures/' use `all`:
```
npm run test -- --browser=all
```

Example - run tests defined in test/fixtures/channel-video-audio-quality-short.js file in Google Chrome:
```sh
npm run test -- --browser=chrome --tests=test/fixtures/channel-video-audio-quality-short.js
```

or in multiple browsers:
```
npm run test -- --browser=chrome safari --tests=test/fixtures/channel-video-audio-quality-short.js
```

## Video and audio profiles

Profiles are used in asserts to detect video and audio quality.

`test/profiles/default.js` holds all the values.

You can pass custom profiles file:
```sh
npm run test -- --profileFile=test/profiles/1080p.js
```

And also override values with flags like this:
```sh
npm run test -- --video.frameWidth=1280 --video.frameHeight=720 --audio.minAudioOutputLevel=20
```

## Record media

Recorded media will be saved in browsers default downloads folder.

You can record multimedia (video + audio) from tests by passing duration in `--record` argument:
```
npm run test -- --record=PT1M
```

To record just audio pass additional `--media` argument and specify `audio`
```
npm run test -- --record=PT1M --media=audio
```

Or to record just video use `video`
```
npm run test -- --record=PT1M --media=video
```

## Screenshots

Captured screenshots will be saved in browsers default downloads folder.

You can pass duration for time interval after which screenshot will be created and downloaded:
```
npm run test -- --screenshotInterval=PT10S
```
This will create a screenshot after each 10 seconds during the test.
