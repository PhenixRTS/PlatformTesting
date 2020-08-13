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
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const XMLWriter = require('xml-writer');
const persistence = require('../persistence.js');

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

    if (!key.match(/\b.*Ms\b/g)){
      configuration[key] = args[key];
    }
  }

  if (!args.tests.includes('test/fixtures/channel-quality-test.js')) {
    for (const key in publisherArgs) {
      if (key === 'secret') {
        configuration.secret = publisherArgs.secret === '' ? '' : '<secret>';
      } else if (!key.match(/\b.*Ms\b/g)){
        configuration[key] = publisherArgs[key];
      }
    }

    if (rtmpPushArgs.rtmpPushFile !== '') {
      for (const key in rtmpPushArgs) {
        if (!key.match(/\b.*Ms\b/g)){
          configuration[key] = rtmpPushArgs[key];
        }
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

async function CreateHumanReadableTestReport(testController, page, header, content, additionalInfo = '') {
  const {args, backendUri, channelAlias} = config;
  const {browser, ctx} = testController;
  const {errors, assertionResults} = ctx;
  const obj = await testController.getBrowserConsoleMessages();

  const reportHeader = moment.utc(new Date()).format(config.args.dateFormat) +
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

    if (args.logAllStatsInReport === true || args.logAllStatsInReport === 'true'){
      reportDetails += `\n\nAll Stats:\n + ${JSON.stringify(allStats, undefined, 2)}`;
    }
  }

  return reportHeader + reportDetails;
}

async function CreateJSONTestReport(testController, page, header, content, additionalInfo = '') {
  const {args, backendUri, channelAlias} = config;
  const {browser, ctx} = testController;
  const {errors, assertionResults} = ctx;
  const obj = await testController.getBrowserConsoleMessages();

  const jsonReport = {
    timestamp: moment.utc(new Date()).format(config.args.dateFormat),
    channel: `${backendUri}#${channelAlias}`,
    browser: browser.name + ' (' + browser.version + ')',
    testRuntime: args.testRuntime,
    testStatus: ctx.testFailed ? 'failed' : 'passed',
    additionalInfo: additionalInfo,
    errors: JSON.stringify(errors, undefined, 2),
    consoleErrors: obj.error,
    configuration: getTestConfiguration(),
    members: [],
    error: ctx.error
  };

  for (const memberID in assertionResults) {
    const {passed, failed, skipped} = assertionResults[memberID];
    const screenName = shared.getMemberScreenNameFromID(memberID);
    const sessionID = shared.getMemberSessionIDFromID(memberID);
    const memberHeader = header[memberID] || header;

    const failedAssertions = [];
    for (const failedAssertion in failed) {
      failedAssertions.push({
        status: 'failed',
        message: failed[failedAssertion]
      });
    }

    const passedAssertions = [];
    for (const passedAssertion in passed) {
      passedAssertions.push({
        status: 'passed',
        message: passed[passedAssertion]
      });
    }

    const skippedAssertions = [];
    for (const skippedAssertion in skipped) {
      skippedAssertions.push({
        status: 'skipped',
        message: skipped[skippedAssertion]
      });
    }

    jsonReport['members'].push({
      screenName: memberID === 'default' ? '' : screenName,
      memberId: memberID,
      assertions: failedAssertions.concat(passedAssertions).concat(skippedAssertions),
      stats: memberHeader,
      memberContent: content[memberID] !== undefined ? content[memberID] : {}
    });

    if (args.logAllStatsInReport === true || args.logAllStatsInReport === 'true') {
      const allStats = page.stats[memberID] || page.stats;
      jsonReport['allStats'] = allStats;
    }
  }

  return JSON.stringify(jsonReport, undefined, 2);
}

function CreatePostResultsJSON(testController) {
  const {args, backendUri, channelAlias} = config;
  const {browser, ctx} = testController;
  const jsonReport = {
    failedAssertions: [],
    passedAssertions: [],
    skippedAssertions: [],
    timestamp: moment.utc(new Date()).format(config.args.dateFormat),
    backendUri: backendUri,
    channelAlias: `#${channelAlias}`,
    testName: path.basename(args.tests),
    profileFile: path.basename(args.profileFile),
    browser: browser.name + ' (' + browser.version + ')',
    testRuntime: args.testRuntime,
    testStatus: ctx.testFailed ? 'failed' : 'passed'
  };

  for (const memberID in ctx.assertionResults) {
    const {passed, failed, skipped} = ctx.assertionResults[memberID];
    const screenName = shared.getMemberScreenNameFromID(memberID);
    const sessionID = shared.getMemberSessionIDFromID(memberID);

    for (const failedAssertion in failed) {
      jsonReport.failedAssertions.push(failed[failedAssertion]);
    }

    for (const passedAssertion in passed) {
      jsonReport.passedAssertions.push(passed[passedAssertion]);
    }

    for (const skippedAssertion in skipped) {
      jsonReport.skippedAssertions.push(skipped[skippedAssertion]);
    }
  }

  return JSON.stringify(jsonReport, undefined, 2);
}

module.exports = {
  async CreateConsoleDump(testController) {
    const obj = await testController.getBrowserConsoleMessages();
    const {error, info, log, warn} = obj;

    if (error.length > 0) {
      error.forEach(e => {
        console.error(`${chalk.red(e)}\n`);
      });
    }

    return new Date() +
      '\n\nERRORS:\n' + error +
      '\n\nWARNINGS:\n' + warn +
      '\n\nINFO:\n' + info +
      '\n\nLOGS:\n' + log;
  },

  async CreateTestReport(testController, page, header, content, additionalInfo = '') {
    const {args} = config;
    persistence.saveToFile(`results`, 'post', CreatePostResultsJSON(testController), 'json', false);

    if (args.reportFormat === 'json') {
      return await CreateJSONTestReport(testController, page, header, content, additionalInfo);
    }

    return await CreateHumanReadableTestReport(testController, page, header, content, additionalInfo);
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
    if (config.args.silent !== true) {
      console.log(`\n================== REPORT ==================`);
      console.log(`${filePath}`);
      console.log(`============================================\n`);
    }
  },

  CreateXMLTestReport: function(t, reportFileName) {
    const {reportsPath} = config;
    const assertionResults = t.ctx.assertionResults;
    const testName = t.testRun.test.testFile.currentFixture.name;
    let xmlContent = new XMLWriter(true);

    xmlContent.startDocument('1.0', 'UTF-8');
    xmlContent.startElement('testsuite');
    xmlContent.writeAttribute('name', `${t.testRun.test.name}`);
    xmlContent.writeAttribute('time', `${config.args.testRuntimeMs}`);
    xmlContent.writeAttribute('timestamp', `${moment.utc(new Date()).format(config.args.dateFormat)}`);

    for (const memberID in assertionResults) {
      const {passed, failed, skipped} = assertionResults[memberID];

      this.CreateCustomXMLAssertElements(passed, 'passed', xmlContent, testName);
      this.CreateCustomXMLAssertElements(failed, 'failed', xmlContent, testName);
      this.CreateCustomXMLAssertElements(skipped, 'skipped', xmlContent, testName);

      xmlContent.endElement();
    }

    xmlContent.endDocument();

    const xmlFilePath = path.join(reportsPath, `${reportFileName}-XML-report-${moment().format(config.args.dateFormat)}.xml`);
    fs.writeFileSync(xmlFilePath, xmlContent);
  },

  CreateCustomXMLAssertElements: function(assertArray, assertType, xmlContent, testName) {
    for (const assert in assertArray) {
      xmlContent.startElement('testcase');
      xmlContent.writeAttribute('classname', `${testName}`);
      xmlContent.writeAttribute('name', `${assertArray[assert]}`);

      if (assertType === 'failed') {
        xmlContent.startElement('error').writeAttribute('message', `${assertArray[assert]}`).endElement();
      }

      if (assertType === 'skipped'){
        xmlContent.startElement('skipped').endElement();
      }

      xmlContent.endElement();
    }
  }
};