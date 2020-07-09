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

/* eslint-disable no-unused-vars */
const chalk = require('chalk');

const shared = require('../../../shared/shared');
const config = require('../../../config.js');

function getTestConfiguration() {
  const {args, publisherArgs, rtmpPushArgs, backendUri, channelAlias, pcastUri} = config;
  let configuration = {
    backendUri,
    pcastUri,
    channelAlias
  };

  for (const key in args) {
    if (key.indexOf('videoProfile') > -1 || key.indexOf('audioProfile') > -1) {
      continue;
    }

    configuration[key] = args[key];
  }

  if (!args.tests.includes('test/fixtures/channel-quality-test.js')) {
    for (const key in publisherArgs) {
      if (key === 'secret') {
        configuration.secret = publisherArgs.secret === '' ? '' : '<secret>';
      } else {
        configuration[key] = publisherArgs[key];
      }
    }

    if (rtmpPushArgs.rtmpPushFile !== '') {
      for (const key in rtmpPushArgs) {
        configuration[key] = rtmpPushArgs[key];
      }
    }
  }

  return configuration;
}

function parseAssertions(title, assertions) {
  let report = `\n\n${title}:\n\n`;

  if (assertions.length === 0) {
    return report + '-';
  }

  assertions.forEach(assertion => {
    report += `${assertion}\n`;
  });

  return report;
}

module.exports = {
  async CreateConsoleDump(testController) {
    const obj = await testController.getBrowserConsoleMessages();
    const {error, info, log, warn} = obj;

    return new Date() +
      '\n\nERRORS:\n' + error +
      '\n\nWARNINGS:\n' + warn +
      '\n\nINFO:\n' + info +
      '\n\nLOGS:\n' + log;
  },

  async CreateTestReport(testController, page, header, content, additionalInfo = '') {
    const {args, backendUri, channelAlias} = config;
    const {browser, ctx} = testController;
    const {errors, assertionResults} = ctx;
    const obj = await testController.getBrowserConsoleMessages();

    const reportHeader = new Date() +
      `\n${backendUri}#${channelAlias}` +
      '\n\nBrowser: ' + browser.name + ' (' + browser.version + ')' +
      `\nTest runtime: ${args.testRuntime}` +
      additionalInfo +
      (errors && errors.length > 0 ? '\n\nErrors:\n' + JSON.stringify(errors, undefined, 2) : '') +
      (obj.error.length > 0 ? '\n\nConsole errors:\n' + JSON.stringify(obj.error, undefined, 2) : '');

    let reportDetails =
      '\n\nConfiguration:\n' +
      JSON.stringify(getTestConfiguration(), undefined, 2);

    for (const memberID in assertionResults) {
      const {passed, failed, skipped} = assertionResults[memberID];

      const screenName = shared.getMemberScreenNameFromID(memberID);
      const sessionID = shared.getMemberSessionIDFromID(memberID);

      const title =
        memberID === 'default'
          ? ''
          : `\n\nResults for ${screenName} (session ID: ${sessionID})`;

      const memberHeader = header[memberID] || header;
      const memberContent = content[memberID] || content;

      reportDetails += '\n\n' + title + '\n' + memberHeader;

      reportDetails += parseAssertions('ASSERTIONS PASSED', passed);
      reportDetails += parseAssertions('FAILURES', failed);
      reportDetails += parseAssertions('SKIPPED', skipped);

      reportDetails += '\n' + memberContent;

      const allStats = page.stats[memberID] || page.stats;

      reportDetails +=
        args.logAllStatsInReport === 'true'
          ? `\n\nAll Stats:\n + ${JSON.stringify(allStats, undefined, 2)}`
          : '';
    }

    return reportHeader + reportDetails;
  },

  LogAssertionResults: function(assertions, memberID) {
    const color = {
      fail: '#ed1113',
      pass: '#3cb244'
    };

    if (config.args.silent === true) {
      return;
    }

    const screenName = shared.getMemberScreenNameFromID(memberID);
    const sessionID = shared.getMemberSessionIDFromID(memberID);

    const member = screenName ? ` FOR ${screenName}` : '';

    console.log(`\n=============== ASSERTIONS${member} ===============`);

    if (sessionID) {
      console.log(`Session ID: ${sessionID}`);
      console.log(`============================================`);
    }

    console.log(
      `${chalk.bgHex(color.pass).bold('PASS')}: ${
        assertions.filter(({assertion}) => assertion).length
      }`
    );
    console.log(
      `${chalk.bgHex(color.fail).bold('FAIL')}: ${
        assertions.filter(({assertion}) => assertion === false).length
      }`
    );
    console.log(`============================================`);

    assertions.forEach(({assertion, msg}) => {
      const status = assertion ?
        `${chalk.bgHex(color.pass).bold('PASS')}` :
        `${chalk.bgHex(color.fail).bold('FAIL')}`;

      console.log(`${status}: ${msg}`);
    });

    console.log(`============================================\n`);
  },

  LogReportPath: function(filePath) {
    if (config.args.silent !== true){
      console.log(`\n================== REPORT ==================`);
      console.log(`${filePath}`);
      console.log(`============================================\n`);
    }
  }
};