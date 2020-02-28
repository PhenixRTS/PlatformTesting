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
import chalk from 'chalk';

import config from '../../../config.js';

module.exports = {
  async CreateConsoleDump(testController) {
    const obj = await testController.getBrowserConsoleMessages();
    const {error, info, log, warn} = obj;

    return new Date() +
      '\n\nERRORS:\n' + JSON.stringify(error, undefined, 2) +
      '\n\nWARNINGS:\n' + JSON.stringify(warn, undefined, 2) +
      '\n\nINFO:\n' + JSON.stringify(info, undefined, 2) +
      '\n\nLOGS:\n' + JSON.stringify(log, undefined, 2);
  },

  async CreateTestReport(testController, page, header, content, additionalInfo = '') {
    const {backendUri, channelAlias, args} = config;
    const {browser, ctx} = testController;
    const {assertions, failedAssertions, errors, skippedAssertions} = ctx;
    const obj = await testController.getBrowserConsoleMessages();

    return new Date() +
      `\n${backendUri}#${channelAlias}` +
      '\n\nBrowser: ' + browser.name + ' ('+ browser.version +')' +
      `\nTest runtime: ${args.testRuntime}` +
      header +
      additionalInfo +
      (errors && errors.length > 0 ? '\n\nErrors:\n' + JSON.stringify(errors, undefined, 2) : '') +
      (obj.error.length > 0 ? '\n\nConsole errors:\n' + JSON.stringify(obj.error, undefined, 2) : '') +
      '\n\nAssertions passed:\n' + JSON.stringify(assertions, undefined, 2) +
      '\n\nFailures:\n' + JSON.stringify(failedAssertions, undefined, 2) +
      '\n\nSkipped:\n' + JSON.stringify(skippedAssertions, undefined, 2) +
      content +
      (args.logAllStatsInReport === 'true' ? `\n\nAll Stats:\n + ${JSON.stringify(page.stats, undefined, 2)}` : '');
  },

  LogAssertionResults: function(assertions) {
    const color = {
      fail: '#ed1113',
      pass: '#3cb244'
    };

    console.log(`\n=============== ASSERTIONS ===============`);
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
    console.log(`\n================== REPORT ==================`);
    console.log(`${filePath}`);
    console.log(`============================================\n`);
  }
};