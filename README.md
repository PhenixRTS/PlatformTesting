# Phenix Channel DevOps Tool

The Phenix channel devops tool provides a way to monitor and test channels for uptime and other operational parameters.

## Setup

```sh
npm install
```

## Run tests

To run test in browser, execute:
```sh
npm run test -- --browsers=<browser> --tests=<path_to/test_file.js> --features=<features>
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
* `firefox --headless`
* `safari`
* `ie`
* `edge` (Chromium-based versions)
* `opera`

Note: browser must be installed before you can run tests in desired browser, otherwise you will get an error.

To run all browsers and all tests defined under 'test/fixtures/' use `all`:
```
npm run test -- --browsers=all
```

Example - run tests defined in test/fixtures/channel-video-audio-quality-short.js file in Google Chrome:
```sh
npm run test -- --browsers=chrome --tests=test/fixtures/channel-video-audio-quality-short.js
```

or in multiple browsers:
```
npm run test -- --browsers="chrome, safari" --tests=test/fixtures/channel-video-audio-quality-short.js
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

To override `minFrameRate`, `maxFrameRate` or `interframeDelayThresholds` use:
```sh
npm run test -- --video.minFrameRate.0.allowed=20 --video.maxFrameRate.0.allowed=61 --video.maxFrameRate.0.timesPerMinute=1 --video.interframeDelayThresholds.0.maxAllowed=50
```

## Record subscriber media

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

## Record published media

You can also record published multimedia (video + audio) from test by passing duration in `--recordPublisher` argument:
```
npm run test -- --recordPublisher=PT1M
```

Note that in this case, there will be added 5 seconds delay before the recording will start

## Screenshots

Captured screenshots will be saved in browsers default downloads folder.

You can pass duration for time interval after which screenshot will be created and downloaded:
```
npm run test -- --screenshotInterval=PT10S
```
This will create a screenshot after each 10 seconds during the test.

## Lag tests

There are `./test/fixtures/channel-lag-test.js` test for measuring and asserting delay between time when media (audio and video) was published and received.

Example:
```
npm run test -- --tests=./test/fixtures/channel-lag-test.js --runtime=PT10S
```

Add these args to override subscribers backend and pcast uris:

`--backendUri=<backendUri>` and `--pcastUri=<pcastUri>`

And same for publisher uris:

`--publisherBackendUri=<backendUri>` and `--publisherPcastUri=<pcastUri>`

Asserts are made against video and audio profile `maxLag` variables.
Change them in profile file or override with:

`--video.maxLag=<newValue>` and `--audio.maxLag=<newValue>`

Example:
```
npm run test -- --tests=./test/fixtures/channel-lag-test.js --video.maxLag=200 --audio.maxLag=300
```

## Media sync tests

Media sync test is defined in `./test/fixtures/channel-sync-test.js`

To set published video fps change the value under the key `syncPublishedVideoFps` in video profile or override with `--video.syncPublishedVideoFps=<desiredFPS>` argument.

Example:
```
npm run test -- --tests=./test/fixtures/channel-sync-test.js --video.syncPublishedVideoFps=10
```
This will run test where published video is at 10 fps and after the test it will assert video and audio synchronisation.

Average sync is asserted against value named `maxAverageSync` which is defined in video profile.

You can override it with argument `--video.maxAverageSync=<maxAllowedAverageVideoAndAudioSyncDelay>` (or change it in the video profile)

Also max single sync value got during the test is asserted. Override it with argument `--video.maxSingleSync=<maxAllowedSingleSyncDelay>`

## RTMP Push

You can also run sync tests with RTMP Push.

First, save published sync video in desired length with:
```
npm run test -- --tests=./test/fixtures/channel-sync-test.js --video.syncPublishedVideoFps=30 --runtime=PT5M10S --recordPublisher=PT5M
```

Then convert it:
```
ffmpeg -i sync-5m.webm -filter:v fps=fps=<desired_fps> -max_muxing_queue_size 400 sync-5m.mp4
```

And publish it with RTMP Push:
```
npm run test -- --tests=./test/fixtures/channel-sync-test.js --applicationId=<yourApplicationId> --secret=<yourSecret> --rtmpPushFile=sync-5m.mp4 --runtime=PT5M
```

## Signal validation by screen color

You can also check for no signal (by screen color) during the test. This is disabled by default.
To enable this, set `noSignalColor` argument to the color (in HEX or RGB value) that is visible if the signal is lost:

```
npm run test -- --runtime=PT1M --noSignalColor="rgb(0, 0, 0)"
```

Add these args to override signal waiting time -
`--noSignalWaitingTime=<seconds>` or color tolerance value - `--noSignalColorTolerance=<newTolerance>`.
By default signal waiting time is set to 10 seconds and color tolerance value is set to 5.

## Room quality test for all members in the room using ExpressRoom API

There is `./test/fixtures/room-quality-test.js` test for running quality test against all members in the room.

Example:
```
npm run test -- --tests=test/fixtures/room-quality-test.js --roomAlias=MyAwesomeRoomAlias
```

In case there is need to check only one member's stream in the room, you can specify the member by setting `--screenName=AwesomeScreenName`.

If `--failIfMemberHasNoStream` argument is set, the test will fail if there will be member with no stream in the room.

## Date formats

You can specify date format with `--dateFormat` argument. Timestamps in test reports will be formatted using this format.

Example:
```
npm run test -- --dateFormat=YYYY-MM-DDTHH:mm
```

Default format is `YYYY-MM-DD HH:mm:ss.SSS z`

You can find tokens that can be used in [moment.js documentation](https://momentjs.com/docs/#/parsing/string-format)

## Console outputs

You can silence the normal std output from the tool with `--silent` argument. This will make sure there will be no test progress and results reported in the console. 

Example:
```
npm run test -- --tests="test/fixtures/channel-sync-test.js" --silent
```

But to suppress the output of npm script and node overall, you need to pass `--silent` argument to npm.

Example:
```
npm run --silent test -- --tests="test/fixtures/channel-sync-test.js"
```