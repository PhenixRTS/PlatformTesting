/**
 * Copyright 2019 Phenix Real Time Solutions, Inc. All Rights Reserved.
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
const fs = require('fs');
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
  .describe('backendUri', '')
  .describe('pcastUri', '')
  .describe('browsers', 'Browsers in which to run test. Can run same test in multiple instances, example "chrome, chrome"')
  .describe('tests', 'Path to test file')
  .describe('runtime', 'Runtime of the test in ISO 8601 duration format')
  .describe('profileFile', 'Full path to file containing video and audio profiles that will be used to assert quality')
  .describe('concurrency', 'Runs all tests concurrently')
  .describe('record', 'Record media duration in ISO 8601 format')
  .describe('recordPublisher', 'Record published media for duration in ISO 8601 format')
  .describe('media', 'Record video, audio or both')
  .describe('screenshotInterval', 'Create screenshot from video element after each duration whole testrun')
  .describe('screenshotName', 'Name of the screenshots that will be taken if screenshotInterval was provided')
  .describe('ignoreJsConsoleErrors', 'If true, ignore JavaScript errors logged by tested website')
  .describe('rtmpPushFile', 'Video file that will be published with RTMP Push')
  .describe('applicationId', 'Application ID used with API for managing RTMP push channel')
  .describe('secret', 'Secret used with API for managing RTMP push channel')
  .default({
    localServerPort: 3333,
    channelAlias: '',
    features: undefined,
    backendUri: 'https://demo.phenixrts.com',
    pcastUri: 'https://pcast.phenixrts.com',
    publisherBackendUri: 'https://demo.phenixrts.com/pcast',
    publisherPcastUri: 'https://pcast.phenixrts.com',
    browsers: 'chrome',
    tests: 'test/fixtures/channel-quality-test.js',
    runtime: 'PT1M',
    profileFile: 'test/profiles/default.js',
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
    rtmpPushFile: '',
    applicationId: '',
    secret: '',
    region: 'ingest-stg-europe-west',
    capabilities: 'multi-bitrate,streaming,on-demand,hd'
  })
  .example('npm run test -- --browser=firefox --tests=test/fixtures/channel-quality-test.js')
  .epilog('Available browsers: chrome chrome:headless firefox firefox:headless safari ie edge opera')
  .argv;

async function test() {
  config.args = parseTestArgs();
  config.testPageUrlAttributes =
    `?features=${config.args.features}` +
    `&channelAlias=${config.channelAlias}` +
    `&backendUri=${config.backendUri}` +
    `&publisherBackendUri=${config.args.publisherBackendUri}` +
    `&publisherPcastUri=${config.args.publisherPcastUri}` +
    `&pcastUri=${config.pcastUri}` +
    `&recordingMs=${config.args.recordingMs}` +
    `&recordingMedia=${config.args.recordingMedia}` +
    `&publisherRecordingMs=${config.args.publisherRecordingMs}` +
    `&screenshotAfterMs=${config.args.screenshotAfterMs}` +
    `&downloadImgName=${config.args.downloadImgName}` +
    `&syncFps=${config.args.videoProfile.syncPublishedVideoFps}` +
    `&rtmpPush=${config.args.rtmpPushFile !== ''}`;
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
    browsers: argv.browsers.replace(/\s/g, '').split(','),
    tests: argv.tests,
    features: argv.features,
    testRuntime: argv.runtime,
    testRuntimeMs: parseToMilliseconds(argv.runtime),
    videoProfile: defaultProfiles.videoProfile,
    audioProfile: defaultProfiles.audioProfile,
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
    rtmpPushFile: argv.rtmpPushFile,
    applicationId: argv.applicationId,
    secret: argv.secret,
    region: argv.region,
    capabilities: argv.capabilities
  };

  if (args.tests === 'all') {
    const testsPath = './test/fixtures/';
    args.tests = [];
    fs.readdirSync(testsPath).forEach(file => {
      args.tests.push(p.join(testsPath, file));
    });
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
    Object.keys(argv.video).forEach((key) => {
      if (args.videoProfile[key] === undefined) {
        exitWithMessage(
          `Error: unsupported argument override - key '${key}' does not exist on video profile!` +
          `\n\nAvailable keys:\n ${JSON.stringify(Object.keys(defaultProfiles.videoProfile), undefined, 2)}`
        );
      }

      if (key === 'interframeDelayTresholds') {
        Object.keys(argv.video.interframeDelayTresholds).forEach((index) => {
          if (args.videoProfile.interframeDelayTresholds[index]) {
            _.merge(args.videoProfile.interframeDelayTresholds[index], argv.video.interframeDelayTresholds[index]);
          } else {
            args.videoProfile.interframeDelayTresholds.push(argv.video.interframeDelayTresholds[index]);
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
        exitWithMessage(
          `Error: unsupported argument override - key '${key}' does not exist on audio profile!` +
          `\n\nAvailable keys:\n ${JSON.stringify(Object.keys(defaultProfiles.audioProfile), undefined, 2)}`
        );
      }

      args.audioProfile[key] = argv.audio[key];
    });
  }

  return args;
}

function exitWithMessage(msg) {
  console.log(msg);
  process.exit(0);
}

function parseToMilliseconds(time) {
  const timeAsDuration = moment.duration(time);

  return timeAsDuration.asMilliseconds();
}

module.exports = test();