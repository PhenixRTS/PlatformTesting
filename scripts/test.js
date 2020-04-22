/**
 * Copyright 2020 Phenix Real Time Solutions, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const createTestCafe = require('testcafe');
const p = require('path');
const config = require('../config.js');
const App = require('../src/app.js');
const Logger = require('../scripts/logger.js');
const defaultProfiles = require('../test/profiles/default.js');
const app = new App();
const logger = new Logger('Test script');
const _ = require('lodash');
const moment = require('moment');
const argv = require('yargs')
  .help()
  .strict()
  .describe('localServerPort', 'Port that will be used for the server')
  .describe('channelAlias', '')
  .describe('roomAlias', 'Alias of the room to view')
  .describe('backendUri', '')
  .describe('pcastUri', '')
  .describe('browsers', 'Browsers in which to run test. Can run same test in multiple instances, example "chrome, chrome"')
  .describe('tests', 'Path to test file')
  .describe('runtime', 'Runtime of the test in ISO 8601 duration format')
  .describe('profileFile', 'Full path to file containing video and audio profiles that will be used to assert quality')
  .describe('screenName', 'Specify member to subscribe to')
  .describe('failIfMemberHasNoStream', 'Fail test if member has no stream')
  .describe('concurrency', 'Runs all tests concurrently')
  .describe('record', 'Record media duration in ISO 8601 format')
  .describe('recordPublisher', 'Record published media for duration in ISO 8601 format')
  .describe('media', 'Record video, audio or both')
  .describe('screenshotInterval', 'Create screenshot from video element after each duration whole testrun')
  .describe('screenshotName', 'Name of the screenshots that will be taken if screenshotInterval was provided')
  .describe('ignoreJsConsoleErrors', 'If true, ignore JavaScript errors logged by tested website')
  .describe('rtmpLinkProtocol', 'Link protocol that will be used for RTMP push')
  .describe('rtmpPort', 'Port that will be used for RTMP push')
  .describe('rtmpPushFile', 'Video file that will be published with RTMP Push')
  .describe('applicationId', 'Application ID used with API for managing RTMP push channel')
  .describe('secret', 'Secret used with API for managing RTMP push channel')
  .describe('edgeToken', 'Used as auth and stream token in case they are not provided individually')
  .describe('authToken', 'An authentication token used to connect to the platform')
  .describe('streamToken', 'A stream token used to connect to the stream')
  .describe('channelJoinRetries', 'Max retry attempt count for joining the channel')
  .describe('publisherWaitTime', 'Time how log to wait for publisher to subscribe to channel in ISO 8601 format')
  .describe('noSignalColor', 'Screen color that is displayed in case there is no signal')
  .describe('noSignalColorTolerance', 'Describes how big the difference between the defined noScreenColor and actual screen color can be')
  .describe('noSignalWaitingTime', 'Time how long to wait for the signal in seconds')
  .default({
    localServerPort: 3333,
    channelAlias: '',
    roomAlias: '',
    features: undefined,
    backendUri: 'https://demo.phenixrts.com',
    pcastUri: 'https://pcast.phenixrts.com',
    publisherBackendUri: 'https://demo.phenixrts.com/pcast',
    publisherPcastUri: 'https://pcast.phenixrts.com',
    browsers: 'chrome',
    tests: 'test/fixtures/channel-quality-test.js',
    runtime: 'PT1M',
    profileFile: 'test/profiles/default.js',
    screenName: '',
    concurrency: 1,
    logAllStatsInReport: false,
    saveConsoleLogs: false,
    record: 0,
    recordPublisher: 0,
    media: 'video,audio',
    screenshotInterval: 0,
    screenshotName: 'phenix_test_screenshot',
    ignoreJsConsoleErrors: false,
    audio: undefined,
    video: undefined,
    syncPublishedVideoFps: 1,
    rtmpLinkProtocol: 'rtmp',
    rtmpPort: '80',
    rtmpPushFile: '',
    applicationId: '',
    secret: '',
    edgeToken: '',
    authToken: '',
    streamToken: '',
    channelJoinRetries: 0,
    publisherWaitTime: 'PT8S',
    region: 'ingest-stg-europe-west',
    capabilities: 'multi-bitrate,streaming,on-demand,hd',
    noSignalColor: '',
    noSignalColorTolerance: 5,
    noSignalWaitingTime: 'PT10S'
  })
  .example('npm run test -- --browser=firefox --tests=test/fixtures/channel-quality-test.js')
  .epilog('Available browsers: chrome chrome:headless firefox firefox:headless safari ie edge opera')
  .argv;

async function test() {
  config.args = parseTestArgs();
  config.testPageUrlAttributes =
    `?features=${config.args.features}` +
    `&channelAlias=${config.channelAlias}` +
    `&roomAlias=${config.args.roomAlias}` +
    `&screenName=${config.args.screenName}` +
    `&failIfMemberHasNoStream=${config.args.failIfMemberHasNoStream}` +
    `&backendUri=${config.backendUri}` +
    `&publisherBackendUri=${config.args.publisherBackendUri}` +
    `&publisherPcastUri=${config.args.publisherPcastUri}` +
    `&pcastUri=${config.pcastUri}` +
    `&edgeToken=${config.args.edgeToken}` +
    `&authToken=${config.args.authToken}` +
    `&streamToken=${config.args.streamToken}` +
    `&recordingMs=${config.args.recordingMs}` +
    `&recordingMedia=${config.args.recordingMedia}` +
    `&publisherRecordingMs=${config.args.publisherRecordingMs}` +
    `&screenshotAfterMs=${config.args.screenshotAfterMs}` +
    `&downloadImgName=${config.args.downloadImgName}` +
    `&syncFps=${config.args.videoProfile.syncPublishedVideoFps}` +
    `&rtmpPush=${config.args.rtmpPushFile !== ''}` +
    `&channelJoinRetries=${config.args.channelJoinRetries}`;
  config.videoAssertProfile = config.args.videoProfile;
  config.audioAssertProfile = config.args.audioProfile;

  let testcafe = null;

  return createTestCafe('localhost').then(tc => {
    app.startServer(config.args.localServerPort);

    const runner = tc.createRunner();
    testcafe = tc;
    logger.log(`Will run: ${config.args.tests}`);

    return runner
      .src(config.args.tests)
      .browsers(parseBrowsers(config.args.browsers))
      .concurrency(config.args.concurrency)
      .reporter('list')
      .run({skipJsErrors: config.args.ignoreJsConsoleErrors === 'true'});
  }).then(failedCount => {
    logger.log(`Failed tests: ${failedCount}`);
    app.stopServer();
    testcafe.close();

    if (failedCount > 0) {
      process.exit(1);
    }
  });
}

function parseBrowsers(browsers) {
  const configuredBrowsers = [];
  browsers.map(browser => {
    if (browser === 'chrome' || browser === 'chrome:headless' || browser === 'opera') {
      configuredBrowsers.push(
        `${browser} ` +
        '--autoplay-policy=no-user-gesture-required ' +
        '--disable-gesture-requirement-for-media-playback ' +
        '--use-fake-ui-for-media-stream '
      );
    } else if (browser === 'firefox' || browser === 'firefox:headless') {
      const firefoxProfilePath = p.join(config.projectDir, 'configured_browser_profiles', 'firefox-profile');
      configuredBrowsers.push(`${browser} -profile ${firefoxProfilePath}`);
    } else {
      configuredBrowsers.push(browser);
    }
  });

  return configuredBrowsers;
}

function parseTestArgs() {
  config.backendUri = argv.backendUri;
  config.pcastUri = argv.pcastUri;

  if (argv.channelAlias !== '') {
    config.channelAlias = argv.channelAlias;
  } else {
    config.channelAlias = argv.rtmpPushFile !== '' ? 'PlatformTestingRtmp' : `PlatformTesting-${moment().format('YYYY-MM-DD.HH.mm')}`;
  }

  const args = {
    localServerPort: argv.localServerPort,
    browsers: argv.browsers.replace(/,\s/g, ',').split(','),
    tests: argv.tests,
    features: argv.features,
    testRuntime: argv.runtime,
    testRuntimeMs: parseToMilliseconds(argv.runtime),
    videoProfile: defaultProfiles.videoProfile,
    audioProfile: defaultProfiles.audioProfile,
    screenName: argv.screenName,
    failIfMemberHasNoStream: argv.failIfMemberHasNoStream === true,
    concurrency: argv.concurrency,
    logAllStatsInReport: argv.logAllStatsInReport,
    saveConsoleLogs: argv.saveConsoleLogs,
    recordingMs: parseToMilliseconds(argv.record),
    recordingMedia: argv.media,
    publisherRecordingMs: parseToMilliseconds(argv.recordPublisher),
    screenshotAfterMs: parseToMilliseconds(argv.screenshotInterval),
    downloadImgName: argv.screenshotName,
    publisherBackendUri: argv.publisherBackendUri,
    publisherPcastUri: argv.publisherPcastUri,
    ignoreJsConsoleErrors: argv.ignoreJsConsoleErrors,
    rtmpLinkProtocol: argv.rtmpLinkProtocol,
    rtmpPort: argv.rtmpPort,
    rtmpPushFile: argv.rtmpPushFile,
    applicationId: argv.applicationId,
    secret: argv.secret,
    edgeToken: argv.edgeToken,
    authToken: argv.authToken,
    streamToken: argv.streamToken,
    channelJoinRetries: argv.channelJoinRetries,
    publisherWaitTime: parseToMilliseconds(argv.publisherWaitTime),
    region: argv.region,
    capabilities: argv.capabilities,
    noSignalColor: parseColor(argv.noSignalColor),
    noSignalColorTolerance: argv.noSignalColorTolerance,
    noSignalWaitingTime: argv.noSignalWaitingTime
  };

  if (argv.channelAlias !== '') {
    config.channelAlias = argv.channelAlias;
  } else {
    config.channelAlias = argv.rtmpPushFile !== '' ? 'PlatformTestingRtmp' : `PlatformTesting-${moment().format('YYYY-MM-DD.HH.mm')}`;
  }

  if (args.tests.indexOf('room-quality-test') > -1) {
    if (argv.roomAlias === '') {
      exitWithErrorMessage(
        `Error: roomAlias is requred`
      );
    }

    args.roomAlias = argv.roomAlias;
  }

  if (args.browsers.includes('ie')) {
    args.features = args.features || 'rtmp';
  } else {
    args.features = args.features || 'real-time';
  }

  if (argv.profileFile) {
    const customProfile = require(p.join('..', argv.profileFile));

    if (customProfile.videoProfile) {
      _.merge(args.videoProfile, customProfile.videoProfile);
    }

    if (customProfile.audioProfile) {
      _.merge(args.audioProfile, customProfile.audioProfile);
    }
  }

  if (argv.video) {
    Object.keys(argv.video).forEach(key => {
      if (args.videoProfile[key] === undefined) {
        exitWithErrorMessage(
          `Error: unsupported argument override - key '${key}' does not exist on video profile!` +
            `\n\nAvailable keys:\n ${JSON.stringify(
              Object.keys(defaultProfiles.videoProfile),
              undefined,
              2
            )}`
        );
      }

      if (
        key === 'interframeDelayThresholds' ||
        key === 'minFrameRate' ||
        key === 'maxFrameRate'
      ) {
        const {timesPerMinute} = argv.video[key];
        const allowedKey = key === 'interframeDelayThresholds' ? 'maxAllowed' : 'allowed';
        const allowed = argv.video[key][allowedKey];

        if (!Array.isArray(argv.video[key][allowedKey])) {
          argv.video[key][allowedKey] = [allowed];
          argv.video[key].timesPerMinute = [timesPerMinute];
        }

        if (args.videoProfile[key] === null) {
          args.videoProfile[key] = [{
            [allowedKey]: allowed,
            timesPerMinute
          }];

          return;
        }

        argv.video[key][allowedKey].forEach((allowedValue, index) => {
          const {timesPerMinute} = argv.video[key];
          const existingIndex = args.videoProfile[key].findIndex(
            frameRate => frameRate[allowedKey] === allowedValue
          );

          if (existingIndex === -1) {
            args.videoProfile[key].push({
              [allowedKey]: allowedValue,
              timesPerMinute: timesPerMinute[index]
            });
          } else {
            args.videoProfile[key][existingIndex].timesPerMinute = timesPerMinute[index];
          }
        });
      } else {
        args.videoProfile[key] = argv.video[key];
      }
    });
  }

  if (argv.audio) {
    Object.keys(argv.audio).forEach((key) => {
      if (args.audioProfile[key] === undefined) {
        exitWithErrorMessage(
          `Error: unsupported argument override - key '${key}' does not exist on audio profile!` +
          `\n\nAvailable keys:\n ${JSON.stringify(Object.keys(defaultProfiles.audioProfile), undefined, 2)}`
        );
      }

      args.audioProfile[key] = argv.audio[key];
    });
  }

  validateRtmpSupport();

  return args;
}

function validateRtmpSupport() {
  const rtmpSupportedTests = [
    'test/fixtures/channel-lag-test.js',
    'test/fixtures/channel-sync-test.js'
  ];

  if (argv.rtmpPushFile !== '' && !rtmpSupportedTests.includes(argv.tests)) {
    exitWithErrorMessage(
      `Error: RTMP Push is not supported in ${argv.tests}. Please remove --rtmpPushFile argument.`
    );
  }
}

function exitWithErrorMessage(msg) {
  console.log(`${msg}\n`);
  process.exit(1);
}

function parseToMilliseconds(time) {
  const timeAsDuration = moment.duration(time);

  return timeAsDuration.asMilliseconds();
}

function parseColor(color) {
  const rgbRegex = /^rgb\((0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d)\)$/;
  const hexRegex = /^#[0-9a-f]{6}$/;
  let rgb = color.replace(/\s/g, '');

  if (color === '') {
    return color;
  }

  if (!rgbRegex.test(rgb) && !hexRegex.test(rgb)) {
    exitWithErrorMessage(
      'Error: unsupported color value. Color should be in RGB or HEX'
    );

    return null;
  }

  if (hexRegex.test(rgb)) {
    rgb = hexToRgb(rgb);
  }

  const {0: r, 1: g, 1: b} = rgb.match(/\d+/g);

  return {
    r,
    g,
    b
  };
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result ?
    `rgb(
      ${parseInt(result[1], 16)},
      ${parseInt(result[2], 16)},
      ${parseInt(result[3], 16)}
    )` : '';
}

module.exports = test();