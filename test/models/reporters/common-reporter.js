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

/* eslint-disable no-unused-vars */

import {t} from 'testcafe';
import config from '../../../config.js';

module.exports = {
  async CreateConsoleDump() {
    const obj = await t.getBrowserConsoleMessages();

    return new Date() +
      '\n\nERRORS:\n' + JSON.stringify(obj.error, undefined, 2) +
      '\n\nWARNINGS:\n' + JSON.stringify(obj.warn, undefined, 2) +
      '\n\nINFO:\n' + JSON.stringify(obj.info, undefined, 2) +
      '\n\nLOGS:\n' + JSON.stringify(obj.log, undefined, 2);
  },

  async CreateTestReport(page, header, content) {
    const obj = await t.getBrowserConsoleMessages();

    return new Date() +
      `\n${config.backendUri}#${config.channelAlias}` +
      '\n\nBrowser: ' + JSON.stringify(page.browser, undefined, 2) +
      `\nTest runtime: ${config.args.testRuntime}` +
      header +
      (t.ctx.errors && t.ctx.errors.length > 0 ? '\n\nErrors:\n' + JSON.stringify(t.ctx.errors, undefined, 2) : '') +
      (obj.error.length > 0 ? '\n\nConsole errors:\n' + JSON.stringify(obj.error, undefined, 2) : '') +
      '\n\nAssertions passed:\n' + JSON.stringify(t.ctx.assertions, undefined, 2) +
      '\n\nFailures:\n' + JSON.stringify(t.ctx.failedAssertions, undefined, 2) +
      '\n\nSkipped:\n' + JSON.stringify(t.ctx.skippedAssertions, undefined, 2) +
      content +
      (config.args.logAllStatsInReport === 'true' ? `\n\nAll Stats:\n + ${JSON.stringify(page.stats, undefined, 2)}` : '');
  }
};