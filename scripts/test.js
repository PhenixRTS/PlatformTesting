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
const moment = require('moment');
const path = require('path');
const fetch = require('node-fetch');
const {getFileExtensionBasedOnTestcafeReporterType, getFileNameFromTestsConfigArgument} = require('../shared/shared');
const {byteSize} = require('../src/public/js/chat/publisher');
const {parseColor} = require('../test/models/format.js');
const {prepareProfiles} = require('../test/models/profiles.js');
const {exitWithErrorMessage} = require('../test/models/console-messaging.js');
const {reportsPath} = config;
const TokenBuilder = require('phenix-edge-auth');
const argv = require('yargs')
  .help()
  .strict()
  .describe('localServerPort', 'Port that will be used for the server')
  .describe('channelAlias', '')
  .describe('roomAlias', 'Alias of the room to view')
  .describe('backendUri', '')
  .describe('pcastUri', '')
  .describe('pcastUriSecondSubscriber', 'pcastUri for second subscriber in sync watch test')
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
  .describe('ignoreJsConsoleErrors', 'When present, ignores JavaScript errors logged by tested website')
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
  .describe('dateFormat', 'Date format in which timestamps in test report will be formatted')
  .describe('reportFormat', 'Format in which test report will be generated. Available formats [json, text]')
  .describe('silent', 'When present, silences the normal std output from the tool')
  .describe('verbose', 'When present, logs more info to stdout')
  .describe('dumpReport', 'When present, dumps the report file to std out')
  .describe('logAllStatsInReport', 'When present, logs all stats in the report')
  .describe('saveConsoleLogs', 'When present, saves console logs to a separate file')
  .describe('browserstackUser', 'Browserstack user name. Can skip if using local browsers')
  .describe('browserstackKey', 'Browserstack access key. Can skip if using local browsers')
  .describe('browserstackProjectName', 'Browserstack project name. Can skip if using local browsers')
  .describe('browserstackBuildId', 'Browserstack build ID. Can skip if using local browsers')
  .describe('testcafeReporterType', 'Name of a built-in TestCafe reporter that outputs test report to stdout [spec, list, minimal, xunit, json]')
  .describe('mode', 'Room chat test action type [send, receive]')
  .describe('messageInterval', 'Message sending interval')
  .describe('numMessages', 'Message sending limit')
  .describe('disableSDKConsoleLogging', 'Toggle console logs from websdk')
  .describe('messageSize', 'Byte size of a message that gets sent. Can also be a range of numbers from which a random number gets chosen each time a message is sent, example "100-500"')
  .describe('submitTelemetry', 'When present, submits telemetry records')
  .describe('chatAPI', 'Send message using chosen API [REST, ChatService]')
  .describe('telemetryURI', 'Uri where to submit telemetry records')
  .describe('telemetrySource', 'Source of telemetry')
  .describe('audioMode', 'Mode of published audio in sync and lag tests [mono, stereo]')
  .describe('webSdkSource', 'Phenix Web SDK source url')
  .default({
    localServerPort: 3333,
    channelAlias: '',
    roomAlias: '',
    features: undefined,
    backendUri: 'https://demo.phenixrts.com',
    pcastUri: 'https://pcast.phenixrts.com',
    pcastUriSecondSubscriber: '',
    publisherBackendUri: 'https://demo.phenixrts.com/pcast',
    publisherPcastUri: 'https://pcast.phenixrts.com',
    browsers: 'chrome',
    tests: 'test/fixtures/channel-quality-test.js',
    runtime: 'PT1M',
    profileFile: 'test/profiles/default.js',
    screenName: '',
    concurrency: 1,
    record: 'PT0S',
    recordPublisher: 'PT0S',
    media: 'video,audio',
    screenshotInterval: 'PT0S',
    screenshotName: 'phenix_test_screenshot',
    audio: undefined,
    video: undefined,
    chat: undefined,
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
    noSignalWaitingTime: 'PT10S',
    dateFormat: 'YYYY-MM-DDTHH:mm:ss.SSS[Z]',
    reportFormat: 'text',
    testcafeReporterType: 'spec',
    browserstackUser: '',
    browserstackKey: '',
    browserstackProjectName: 'PlatformTestingTool',
    browserstackBuildId: 'PlatformTestingTool Daily Run',
    mode: 'receive',
    messageInterval: 'PT5S',
    numMessages: 1,
    disableSDKConsoleLogging: false,
    messageSize: 100,
    chatAPI: 'ChatService',
    telemetryURI: 'https://telemetry.phenixrts.com',
    telemetrySource: undefined,
    audioMode: 'mono',
    webSdkSource: 'https://dl.phenixrts.com/WebSDK/2020.2.25/phenix-web-sdk.min.js'
  })
  .example('npm run test -- --browser=firefox --tests=test/fixtures/channel-quality-test.js')
  .epilog('Available browsers: chrome, chrome:headless, firefox, firefox --headless, safari, ie, edge, opera')
  .argv;

async function test() {
  config.args = parseTestArgs();
  config.publisherArgs = parsePublisherArgs();
  config.rtmpPushArgs = parseRtmpPushArgs();
  CreateEdgeTokenIfNecessary();
  CreateAuthTokenIfNecessary();
  config.testPageUrlAttributes =
    `?features=${config.args.features}` +
    `&channelAlias=${config.channelAlias}` +
    `&roomAlias=${config.args.roomAlias}` +
    `&screenName=${config.args.screenName}` +
    `&backendUri=${config.backendUri}` +
    `&publisherBackendUri=${config.publisherArgs.publisherBackendUri}` +
    `&publisherPcastUri=${config.publisherArgs.publisherPcastUri}` +
    `&pcastUri=${config.pcastUri}` +
    `&pcastUriSecondSubscriber=${config.pcastUriSecondSubscriber}` +
    `&edgeToken=${encodeURIComponent(config.args.edgeToken)}` +
    `&streamToken=${encodeURIComponent(config.publisherArgs.streamToken)}` +
    `&authToken=${encodeURIComponent(config.args.authToken)}` +
    `&applicationId=${config.args.applicationId}` +
    `&secret=${encodeURIComponent(config.publisherArgs.secret)}` +
    `&rtmpPush=${config.rtmpPushArgs.rtmpPushFile !== ''}` +
    `&media=${config.args.media}` +
    `&recordMs=${config.args.recordMs}` +
    `&publisherRecordingMs=${config.publisherArgs.publisherRecordingMs}` +
    `&screenshotIntervalMs=${config.args.screenshotIntervalMs}` +
    `&screenshotName=${config.args.screenshotName}` +
    `&syncFps=${config.args.videoProfile.syncPublishedVideoFps}` +
    `&failIfMemberHasNoStream=${config.args.failIfMemberHasNoStream}` +
    `&channelJoinRetries=${config.args.channelJoinRetries}` +
    `&mode=${config.args.mode}` +
    `&messageInterval=${config.args.messageIntervalMs}` +
    `&numMessages=${config.args.numMessages}` +
    `&disableConsoleLogging=${config.args.disableSDKConsoleLogging}` +
    `&messageSize=${config.args.messageSize}` +
    `&dateFormat=${config.args.dateFormat}` +
    `&chatAPI=${config.args.chatAPI}` +
    `&audioMode=${config.args.audioMode}`;
  config.videoAssertProfile = config.args.videoProfile;
  config.audioAssertProfile = config.args.audioProfile;
  config.chatAssertProfile = config.args.chatProfile;

  let testcafe = null;

  return createTestCafe('localhost').then(async tc => {
    app.startServer(config.args.localServerPort);

    const runner = tc.createRunner();
    testcafe = tc;
    logger.log(`Will run: ${config.args.tests}`);

    const fileName = getFileNameFromTestsConfigArgument(config.args.tests);
    const extension = getFileExtensionBasedOnTestcafeReporterType(config.args.testcafeReporterType);
    const reporterFilePath = path.join(reportsPath, `${fileName}-${config.args.testcafeReporterType}-${moment().format(config.args.dateFormat)}.${extension}`);

    let reporters = [{
      name: config.args.testcafeReporterType,
      output: reporterFilePath
    }];

    if (argv.verbose === true) {
      // Also log the report to stdout. Note: "output" defaults to stdout.
      reporters.push({name: config.args.testcafeReporterType});
    }

    try {
      await fetch(config.args.webSdkSource)
        .then(response => response.text())
        .then(body => {
          runner.clientScripts({content: body});
        });
    } catch (error) {
      exitWithErrorMessage(error);
    }

    return runner
      .src(config.args.tests)
      .browsers(parseBrowsers(config.args.browsers))
      .reporter(reporters)
      .concurrency(config.args.concurrency)
      .run({skipJsErrors: config.args.ignoreJsConsoleErrors === true || config.args.ignoreJsConsoleErrors === 'true'});
  }).then(failedCount => {
    logger.log(`Failed tests: ${failedCount}`);
    app.stopServer();
    testcafe.close();

    if (failedCount > 0) {
      process.exit(1);
    }
  });
}

function CreateAuthTokenIfNecessary() {
  if (config.args.authToken !== '') {
    return;
  }

  if (config.args.applicationId === '' || config.args.secret === '') {
    logger.log('Will not create authToken with TokenBuilder because secret and/or applicationId is undefined');

    return;
  }

  const authToken = new TokenBuilder()
    .withApplicationId(config.args.applicationId)
    .withSecret(config.args.secret)
    .expiresInSeconds(config.args.testRuntimeMs)
    .forChannelAlias(config.channelAlias)
    .forAuthenticateOnly()
    .build();

  config.args.authToken = authToken;
  logger.log('Auth Token created using TokenBuilder');
}

function CreateEdgeTokenIfNecessary() {
  if (config.args.edgeToken !== '') {
    return;
  }

  if (config.args.applicationId === '' || config.args.secret === '') {
    logger.log('Will not create edgeToken with TokenBuilder because secret and/or applicationId is undefined');

    return;
  }

  const edgeTokenForPublish = new TokenBuilder()
    .withApplicationId(config.args.applicationId)
    .withSecret(config.args.secret)
    .expiresInSeconds(config.args.testRuntimeMs)
    .forChannelAlias(config.channelAlias)
    .forPublishingOnly()
    .build();

  config.args.edgeToken = edgeTokenForPublish;
  logger.log('Edge Token for publishing created using TokenBuilder');
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

function setEnvironmentVariables() {
  // BrowserStack Chrome autoplay
  process.env.BROWSERSTACK_USE_AUTOMATE = '1';
  process.env.BROWSERSTACK_CHROME_ARGS = '--autoplay-policy=no-user-gesture-required --disable-gesture-requirement-for-media-playback --use-fake-ui-for-media-stream';
  // BrowserStack access
  process.env.BROWSERSTACK_USERNAME = argv.browserstackUser;
  process.env.BROWSERSTACK_ACCESS_KEY = argv.browserstackKey;
  // BrowserStack configuration
  process.env.BROWSERSTACK_PROJECT_NAME = argv.browserstackProjectName;
  process.env.BROWSERSTACK_BUILD_ID = argv.browserstackBuildId;
}

function parseTestArgs() {
  setEnvironmentVariables();
  validateTestTypeArguments();
  validateBrowserstackArguments();

  config.backendUri = argv.backendUri;
  config.pcastUri = argv.pcastUri;
  config.pcastUriSecondSubscriber = argv.pcastUriSecondSubscriber !== '' ? argv.pcastUriSecondSubscriber : argv.pcastUri;

  if (argv.channelAlias !== '') {
    config.channelAlias = argv.channelAlias;
  } else {
    config.channelAlias = argv.rtmpPushFile !== '' ? 'PlatformTestingRtmp' : `PlatformTesting-${moment().format('YYYY-MM-DD.HH.mm')}`;
  }

  let parsedColor = argv.noSignalColor;

  if (parsedColor !== '') {
    const {parsedColor, error} = parseColor(argv.noSignalColor); // eslint-disable-line no-unused-vars

    if (error) {
      exitWithErrorMessage(error);
    }
  }

  const args = {
    startTimestamp: new Date(),
    localServerPort: argv.localServerPort,
    browsers: argv.browsers.toString().replace(/,\s/g, ',').split(','),
    tests: argv.tests,
    features: argv.features,
    testRuntime: argv.runtime,
    testRuntimeMs: parseToMilliseconds(argv.runtime),
    videoProfile: defaultProfiles.videoProfile,
    audioProfile: defaultProfiles.audioProfile,
    chatProfile: defaultProfiles.chatProfile,
    screenName: argv.screenName,
    failIfMemberHasNoStream: argv.failIfMemberHasNoStream === true,
    concurrency: argv.concurrency,
    logAllStatsInReport: argv.logAllStatsInReport,
    saveConsoleLogs: argv.saveConsoleLogs,
    record: argv.record,
    recordMs: parseToMilliseconds(argv.record),
    media: argv.media,
    screenshotInterval: argv.screenshotInterval,
    screenshotIntervalMs: parseToMilliseconds(argv.screenshotInterval),
    screenshotName: argv.screenshotName,
    ignoreJsConsoleErrors: argv.ignoreJsConsoleErrors,
    applicationId: argv.applicationId,
    secret: argv.secret,
    edgeToken: argv.edgeToken,
    authToken: argv.authToken,
    channelJoinRetries: argv.channelJoinRetries,
    publisherWaitTime: argv.publisherWaitTime,
    publisherWaitTimeMs: parseToMilliseconds(argv.publisherWaitTime),
    region: argv.region,
    capabilities: argv.capabilities,
    noSignalColor: parsedColor || argv.noSignalColor,
    noSignalColorTolerance: argv.noSignalColorTolerance,
    noSignalWaitingTime: argv.noSignalWaitingTime,
    dateFormat: argv.dateFormat,
    reportFormat: argv.reportFormat,
    silent: argv.silent,
    verbose: argv.verbose,
    dumpReport: argv.dumpReport,
    testcafeReporterType: argv.testcafeReporterType,
    roomAlias: argv.roomAlias,
    profileFile: argv.profileFile,
    mode: argv.mode,
    messageInterval: argv.messageInterval,
    messageIntervalMs: parseToMilliseconds(argv.messageInterval),
    numMessages: argv.numMessages,
    disableSDKConsoleLogging: argv.disableSDKConsoleLogging,
    messageSize: argv.messageSize,
    chatAPI: argv.chatAPI,
    submitTelemetry: argv.submitTelemetry,
    telemetryURI: argv.telemetryURI,
    telemetrySource: argv.telemetrySource === undefined ? argv.profileFile : argv.telemetrySource,
    audioMode: argv.audioMode,
    webSdkSource: argv.webSdkSource
  };

  if (argv.channelAlias !== '') {
    config.channelAlias = argv.channelAlias;
  } else {
    config.channelAlias = argv.rtmpPushFile !== '' ? 'PlatformTestingRtmp' : `PlatformTesting-${moment().format('YYYY-MM-DD.HH.mm')}`;
  }

  if (args.browsers.includes('ie')) {
    args.features = args.features || 'rtmp';
  } else {
    args.features = args.features || 'real-time';
  }

  prepareProfiles(path.join(__dirname, '../'), argv, args);

  return args;
}

function validateTestTypeArguments() {
  if (argv.tests.indexOf('room-quality-test') > -1) {
    if (argv.roomAlias === '') {
      exitWithErrorMessage(`Error: --roomAlias is required for room quality test`);
    }
  }

  if (argv.tests.indexOf('channel-sync-test') > -1) {
    if (argv.secret === '' || argv.applicationId === '') {
      exitWithErrorMessage(`Error: --secret and --applicationId are required for sync test`);
    }
  }

  if (argv.tests.indexOf('channel-sync-watch-test') > -1) {
    if (argv.secret === '' || argv.applicationId === '') {
      exitWithErrorMessage(`Error: --secret and --applicationId are required for sync test`);
    }
  }

  if (argv.tests.indexOf('channel-lag-test') > -1) {
    if (argv.secret === '' || argv.applicationId === '') {
      exitWithErrorMessage(`Error: --secret and --applicationId are required for lag test`);
    }
  }

  if (argv.tests.indexOf('room-chat-test') > -1) {
    if (argv.roomAlias === '') {
      exitWithErrorMessage(`Error: --roomAlias is required for room chat test`);
    }

    if (argv.mode === '' || argv.mode !== 'send' && argv.mode !== 'receive') {
      exitWithErrorMessage(`Error: --mode=send or --mode=receive is required for room chat test`);
    }

    if (argv.chatAPI === 'REST') {
      if (argv.secret === '' || argv.applicationId === '') {
        exitWithErrorMessage(`Error: --secret and --applicationId are required for room chat test`);
      }
    }

    validateMessageSizeArgument();
  }
}

function validateMessageSizeArgument() {
  const maxSize = 1024;
  const minSize = byteSize(JSON.stringify({
    sentTimestamp: moment().format(argv.dateFormat),
    payload: ''
  }));

  if (argv.messageSize < minSize) {
    exitWithErrorMessage(`Error: --messageSize [${argv.messageSize}] is less than minSize [${minSize}].`);

    return;
  }

  if (argv.messageSize > maxSize) {
    exitWithErrorMessage(`Error: --messageSize [${argv.messageSize}] is greater than maxSize [${maxSize}].`);

    return;
  }

  if (typeof argv.messageSize !== 'number' && argv.messageSize.includes('-')) {
    const messageByteSizeValues = argv.messageSize.split('-');
    const minGivenValue = parseInt(messageByteSizeValues[0]);
    const maxGivenValue = parseInt(messageByteSizeValues[1]);

    if (minGivenValue > maxGivenValue) {
      exitWithErrorMessage(`Error: --messageSize range [${argv.messageSize}] min value is greater then max value.`);

      return;
    }

    if (minGivenValue < minSize || maxGivenValue < minSize){
      exitWithErrorMessage(`Error: --messageSize range [${argv.messageSize}] includes numbers under allowed minSize [${minSize}].`);

      return;
    }

    if (minGivenValue > maxSize || maxGivenValue > maxSize) {
      exitWithErrorMessage(`Error: --messageSize range [${argv.messageSize}] includes numbers over allowed maxSize [${maxSize}].`);

      return;
    }
  }
}

function validateBrowserstackArguments() {
  if (argv.browsers.indexOf('browserstack') > -1) {
    if (argv.browserstackUser === '' || argv.browserstackKey === '') {
      exitWithErrorMessage(`Error: --browserstackUser and --browserstackKey are required to run tests in BrowserStack`);
    }
  }

  if (argv.browserstackUser !== '' && argv.browsers.indexOf('browserstack') === -1) {
    exitWithErrorMessage(`Error: --browserstackUser should not be provided when not running tests in BrowserStack`);
  }

  if (argv.browserstackKey !== '' && argv.browsers.indexOf('browserstack') === -1) {
    exitWithErrorMessage(`Error: --browserstackKey should not be provided when not running tests in BrowserStack`);
  }
}

function parsePublisherArgs() {
  const publisherArgs = {
    publisherBackendUri: argv.publisherBackendUri,
    publisherPcastUri: argv.publisherPcastUri,
    publisherWaitTime: argv.publisherWaitTime,
    publisherWaitTimeMs: parseToMilliseconds(argv.publisherWaitTime),
    publisherRecording: argv.recordPublisher,
    publisherRecordingMs: parseToMilliseconds(argv.recordPublisher),
    region: argv.region,
    capabilities: argv.capabilities,
    streamToken: argv.streamToken,
    secret: argv.secret
  };

  return publisherArgs;
}

function parseRtmpPushArgs() {
  const rtmpPushArgs = {
    rtmpLinkProtocol: argv.rtmpLinkProtocol,
    rtmpPort: argv.rtmpPort,
    rtmpPushFile: argv.rtmpPushFile
  };

  validateRtmpSupport();

  return rtmpPushArgs;
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

function parseToMilliseconds(time) {
  const timeAsDuration = moment.duration(time);

  return timeAsDuration.asMilliseconds();
}

module.exports = test();