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
  }
};