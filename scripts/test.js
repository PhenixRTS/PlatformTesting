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
const app = new App();
const logger = new Logger('Test script');
var argv = require('yargs').help()
  .describe('browser', 'Browser in which to run test')
  .describe('tests', 'Path to test file')
  .default({
    browser: 'chrome',
    tests: 'all'
  })
  .example('npm run test -- --browser=firefox --tests=test/fixtures/channel-video-and-audio-quality.js')
  .epilog('Currently available browsers: chrome chrome:headless firefox firefox:headless safari ie edge opera')
  .argv;

async function test() {
  config.args = parseTestArgs();
  config.testPageUrl = `${config.localServerAddress}:${config.localServerPort}?features=${config.args.features}`;

  var testcafe = null;

  return createTestCafe('localhost').then(tc => {
    app.startServer();

    let runner = tc.createRunner();
    testcafe = tc;
    logger.log(`Will run: ${config.args.tests}`);

    return runner
      .src(config.args.tests)
      .browsers(config.args.browser)
      .reporter('list')
      .run();
  }).then(failedCount => {
    logger.log(`Failed tests: ${failedCount}`);
    app.stopServer();
    testcafe.close();
  });
}

function parseTestArgs() {
  var args = {
    browser: argv.browser,
    tests: argv.tests,
    features: argv.features
  };

  if (args.tests === 'all') {
    let testsPath = './test/fixtures/';
    args.tests = '';
    fs.readdirSync(testsPath).forEach(file => {
      args.tests = [];
      args.tests.push(p.join(testsPath, file));
    });
  }

  if (args.browser === 'ie') {
    args.features = args.features || 'rtmp';
  } else {
    args.features = args.features || 'real-time';
  }

  return args;
}

module.exports = test();