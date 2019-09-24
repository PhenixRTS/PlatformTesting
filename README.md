# AcceptanceTestingPrivate

Phenix javascript SDK test framework

## Setup

```sh
npm install
```

## Run tests

To run test in browser, execute:
```sh
npm run test -- --browser=<browser> --tests=<path_to/test_file.js> --features=<features>
```

See all available commands with
```
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
