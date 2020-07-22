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

const sinon = require('sinon');
const assert = require('assert');
const yargs = require('yargs');
const config = require('../../config');
const Logger = require('../../scripts/logger');

const loggerPrefix = 'Unit Test';

describe('When using the logger utility', function() {
  describe('Given silent argument flag is present', function() {
    let testToolLogger, consoleLog, consoleError;
    const msg = 'This is a test!';

    const argv = yargs('--silent')
      .option('silent')
      .argv;

    const args = {silent: argv.silent};

    beforeEach(function() {
      testToolLogger = new Logger(loggerPrefix);
      consoleLog = sinon.spy(console, 'log');
      consoleError = sinon.spy(console, 'error');
      config.args = args;
    });

    afterEach(function() {
      consoleLog.restore();
      consoleError.restore();
    });

    it('it logs no normal message to standard output', function() {
      testToolLogger.log(msg);
      assert(!consoleLog.calledWith(`[${testToolLogger.format(new Date())}] [${loggerPrefix}] ${msg}`));
    });

    it('it logs no error message to standard output', function() {
      testToolLogger.error(msg);
      assert(!consoleError.calledWith(`[${testToolLogger.format(new Date())}] [${loggerPrefix} ERROR] ${msg}\n`));
    });
  });

  describe('Given silent argument flag is NOT present', function() {
    let testToolLogger, consoleLog, consoleError;
    const msg = 'This is a test!';

    const argv = yargs('')
      .option('silent')
      .argv;

    const args = {silent: argv.silent};

    beforeEach(function() {
      testToolLogger = new Logger(loggerPrefix);
      consoleLog = sinon.spy(console, 'log');
      consoleError = sinon.spy(console, 'error');
      config.args = args;
    });

    afterEach(function() {
      consoleLog.restore();
      consoleError.restore();
    });

    it('it logs normal message to standard output', function() {
      testToolLogger.log(msg);
      assert(consoleLog.calledWith(`[${testToolLogger.format(new Date())}] [${loggerPrefix}] ${msg}`));
    });

    it('it logs error message to standard output', function() {
      testToolLogger.error(msg);
      assert(consoleError.calledWith(`[${testToolLogger.format(new Date())}] [${loggerPrefix} ERROR] ${msg}\n`));
    });
  });

  describe('Given a date to format', function() {
    let testToolLogger;
    const date = new Date('2020-07-17T11:11:12.989');

    beforeEach(function() {
      testToolLogger = new Logger(loggerPrefix);
    });

    it('it formats given date to hour:minutes:seconds', function() {
      assert.deepStrictEqual(testToolLogger.format(date), '11:11:12');
    });

    it('it returns formatted date as a string', function() {
      assert.deepStrictEqual(typeof testToolLogger.format(date), 'string');
    });

    it('it adds a zero to hour number if it is less than 10', function() {
      const tempDate = new Date('2020-07-17T08:11:12.989');
      assert.deepStrictEqual(testToolLogger.format(tempDate).substring(0, 2), '08');
    });

    it('it adds a zero to minutes number if it is less than 10', function() {
      const tempDate = new Date('2020-07-17T08:08:12.989');
      assert.deepStrictEqual(testToolLogger.format(tempDate).substring(3, 5), '08');
    });

    it('it adds a zero to seconds number if it is less than 10', function() {
      const tempDate = new Date('2020-07-17T08:11:08.989');
      assert.deepStrictEqual(testToolLogger.format(tempDate).substring(6), '08');
    });
  });
});