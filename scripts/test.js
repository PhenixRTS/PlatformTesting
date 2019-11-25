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
  .describe('channelAlias', '')
  .describe('backendUri', '')
  .describe('pcastUri', '')
  .describe('browsers', 'Browsers in which to run test. Can run same test in multiple instances, example "chrome, chrome"')
  .describe('tests', 'Path to test file')
  .describe('runtime', 'Runtime of the test in ISO 8601 duration format')
  .describe('profileFile', 'Full path to file containing video and audio profiles that will be used to assert quality')
  .describe('concurrency', 'Runs all tests concurrently')
  .describe('record', 'Record media duration in ISO 8601 format')
  .describe('media', 'Record video, audio or both')
  .describe('screenshotInterval', 'Create screenshot from video element after each duration whole testrun')
  .describe('screenshotName', 'Name of the screenshots that will be taken if screenshotInterval was provided')
  .describe('ignoreJsConsoleErrors', 'If true, ignore JavaScript errors logged by tested website')
  .default({
    channelAlias: 'clock',
    backendUri: 'https://demo.phenixrts.com/pcast',
    pcastUri: 'https://pcast.phenixrts.com',
    publisherBackendUri: 'https://demo.phenixrts.com/pcast',
    publisherPcastUri: 'https://pcast.phenixrts.com',
    browsers: 'chrome',
    tests: 'all',
    runtime: 'PT1M',
    profileFile: 'test/profiles/default.js',
    concurrency: 1,
    logAllStatsInReport: false,
    saveConsoleLogs: false,
    record: 0,
    media: 'video,audio',
    screenshotInterval: 0,
    screenshotName: 'phenix_test_screenshot',
    ignoreJsConsoleErrors: false,
    audio: undefined,
    video: undefined
  })
  .example('npm run test -- --browser=firefox --tests=test/fixtures/channel-video-and-audio-quality.js')
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
    `&screenshotAfterMs=${config.args.screenshotAfterMs}` +
    `&downloadImgName=${config.args.downloadImgName}`;
  config.videoAssertProfile = config.args.videoProfile;
  config.audioAssertProfile = config.args.audioProfile;

  let testcafe = null;

  return createTestCafe('localhost').then(tc => {
    app.startServer();

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
  config.channelAlias = argv.channelAlias;

  const args = {
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
    screenshotAfterMs: parseToMilliseconds(argv.screenshotInterval),
    downloadImgName: argv.screenshotName,
    publisherBackendUri: argv.publisherBackendUri,
    publisherPcastUri: argv.publisherPcastUri,
    ignoreJsConsoleErrors: argv.ignoreJsConsoleErrors
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
        )
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
        )
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