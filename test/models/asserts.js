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

import {t} from 'testcafe';
import {ok} from 'assert';
import {isNull} from 'util';
import _ from 'lodash';

import config from '../../config.js';
import Logger from '../../scripts/logger.js';

import {audioLag, videoLag} from './assertions/lag.js';
import reporter from './reporters/common-reporter';
import format from './format';

const logger = new Logger('Test');

module.exports = class Asserts {
  constructor(page) {
    this.page = page;
    this.assertions = [];
  }

  async assert(name, actualValue, expectedValue, sign, tolerance) {
    let assertionMsg = '';
    let assertion = false;

    if (t.ctx.assertions === undefined) {
      t.ctx.assertions = [];
      t.ctx.failedAssertions = [];
      t.ctx.skippedAssertions = [];
    }

    let actual = actualValue;
    let expected = expectedValue;

    if (expected === null || tolerance === null) {
      t.ctx.skippedAssertions.push(name);

      return;
    }

    if ((_.isString(actual) && /^\s*$/.test(actual)) || (_.isString(expected) && /^\s*$/.test(expected))) {
      logger.log(`Did not assert '${name}' because there was no collected stats for it`);

      return;
    } else if (_.isNumber(actual) && isNull(actual) || _.isNumber(expected) && isNull(expected)) {
      logger.log(`Did not assert '${name}' because there was no collected stats for it`);

      return;
    }

    if (format.isISO8601(expected)) {
      expected = format.formatTime(expected, 'ms');
    }

    switch (sign) {
      case 'deql':
        assertion = actual === expected;
        assertionMsg = 'deep equal to';

        break;
      case 'eql':
        assertion = actual == expected; // eslint-disable-line eqeqeq
        assertionMsg = 'equal to';

        break;
      case 'gt':
        assertion = actual > expected;
        assertionMsg = 'above';

        if (tolerance > 0 && !assertion) {
          actual = parseFloat(actual) + parseFloat(tolerance);
          assertion = actual > expected;
          assertionMsg = `(with tolerance ${tolerance}) ${assertionMsg}`;
        }

        break;
      case 'gte':
        assertion = actual >= expected;
        assertionMsg = 'greater or equal to';

        if (tolerance > 0 && !assertion) {
          actual = parseFloat(actual) + parseFloat(tolerance);
          assertion = actual >= expected;
          assertionMsg = `(with tolerance ${tolerance}) ${assertionMsg}`;
        }

        break;
      case 'lt':
        assertion = actual < expected;
        assertionMsg = 'below';

        if (tolerance > 0 && !assertion) {
          actual = parseFloat(actual) - parseFloat(tolerance);
          assertion = actual < expected;
          assertionMsg = `(with tolerance ${tolerance}) ${assertionMsg}`;
        }

        break;
      case 'lte':
        assertion = actual <= expected;
        assertionMsg = 'less or equal to';

        if (tolerance > 0 && !assertion) {
          actual = parseFloat(actual) - parseFloat(tolerance);
          assertion = actual <= expected;
          assertionMsg = `(with tolerance ${tolerance}) ${assertionMsg}`;
        }

        break;
      default:
        t.ctx.testFailed = true;

        throw Error(`Unsupported assert sign operator "${sign}"`);
    }

    actual = format.round(actual, 1);

    if (format.isISO8601(expected)) {
      actual = format.formatTime(actual);
    }

    let msg = assertion ?
      `${name} ${assertionMsg} ${expected} (was ${actual})` :
      `${name} expected ${assertionMsg} ${expected} was ${actual}`;

    this.assertions.push({
      assertion,
      msg
    });

    if (!assertion) {
      t.ctx.testFailed = true;
      t.ctx.failedAssertions.push(msg);

      return;
    }

    t.ctx.assertions.push(`${name} ${assertionMsg} ${expected} (was ${actual})`);
  }

  async finishTest() {
    reporter.LogAssertionResults(this.assertions);

    await Promise.all(this.assertions.map(async ({assertion, msg}) => {
      await t.expect(assertion).ok(msg);

      return;
    }));
  }

  async assertInterframeThresholds() {
    const {interframeDelayThresholds} = config.videoAssertProfile;

    if (interframeDelayThresholds === null) {
      t.ctx.skippedAssertions.push('Video interframe max delays per minute');

      return;
    }

    interframeDelayThresholds.forEach(threshold => {
      const {maxAllowed, timesPerMinute} = threshold;
      const msg = `Video interframe delay treshold ${timesPerMinute} times above ${maxAllowed} milliseconds`;
      let passed = true;

      this.page.meanVideoStats.interframeDelaysPerMin.forEach((delaysPerMin, index) => {
        const aboveMax = delaysPerMin.filter(el => el > maxAllowed);
        const assertion = aboveMax.length <= timesPerMinute;

        if (assertion) {
          return;
        }

        const message = `${msg} were exceeded during test minute ${index + 1}. Observations: [${aboveMax}]`;

        passed = false;
        t.ctx.testFailed = true;
        t.ctx.failedAssertions.push(message);

        this.assertions.push({
          assertion: false,
          msg: message
        });
      });

      if (!passed) {
        return;
      }

      t.ctx.assertions.push(msg);

      this.assertions.push({
        assertion: passed,
        msg
      });
    });
  }

  async assertKPIs() {
    this.assert(
      'PTTFF',
      this.page.stats.streamReceivedAt - this.page.stats.loadedAt,
      config.videoAssertProfile.maxPTTFF,
      'lte'
    );
  }

  async assertVideoQuality() {
    this.assert(
      'Video mean bitrate',
      this.page.meanVideoStats.bitrateMean,
      config.videoAssertProfile.minBitrateMeanKbps,
      'gte'
    );
    this.assert(
      'Video max mean bitrate',
      this.page.meanVideoStats.bitrateMean,
      config.videoAssertProfile.maxBitrateMeanKps,
      'lte'
    );
    this.assert(
      'Video mean delay',
      this.page.meanVideoStats.currentDelay,
      config.videoAssertProfile.maxMeanDelay,
      'lte'
    );
    this.assert(
      'Video max delay',
      this.page.meanVideoStats.maxDelay,
      config.videoAssertProfile.maxDelay,
      'lte'
    );
    this.assert(
      'Video target delay with current delay',
      this.page.meanVideoStats.currentDelay,
      this.page.meanVideoStats.targetDelay,
      'gte'
    );
    this.assert(
      'Video dropped frames',
      this.page.meanVideoStats.droppedFrames,
      config.videoAssertProfile.maxDroppedFrames * config.videoAssertProfile.minFrameRateMean,
      'lte'
    );
    this.assert(
      'Video mean framerate',
      this.page.meanVideoStats.framerateMean,
      config.videoAssertProfile.minFrameRateMean,
      'gte',
      0.05
    );
    this.assert(
      'Video max framerate',
      this.page.meanVideoStats.framerateMax,
      config.videoAssertProfile.maxFrameRate,
      'lte'
    );
    this.assert(
      'Video min framerate',
      this.page.meanVideoStats.framerateMin,
      config.videoAssertProfile.minFrameRate,
      'gte'
    );
    this.assert(
      'Video packet loss',
      this.page.meanVideoStats.nativeReport.packetsLost / (config.args.testRuntimeMs / 60000),
      config.videoAssertProfile.maxPacketLossPerMinute,
      'lte'
    );
    this.assert(
      'Video average frame width',
      this.page.meanVideoStats.avgFrameWidth,
      config.videoAssertProfile.frameWidth,
      'eql'
    );
    this.assert(
      'Video average frame height',
      this.page.meanVideoStats.avgFrameHeight,
      config.videoAssertProfile.frameHeight,
      'eql'
    );
    this.assert(
      'Video first frame received to decode',
      this.page.meanVideoStats.nativeReport.googFirstFrameReceivedToDecodedMs,
      config.videoAssertProfile.timeToFirstFrameDecoded,
      'lte'
    );
    this.assert(
      'Video nacks sent',
      this.page.meanVideoStats.nativeReport.googNacksSent / (config.args.testRuntimeMs / 60000),
      config.videoAssertProfile.maxNacksSentPerMinute,
      'lte'
    );
    this.assert(
      'Video firs sent',
      this.page.meanVideoStats.nativeReport.googFirsSent,
      config.videoAssertProfile.firsSent,
      'eql'
    );
    this.assert(
      'Video plis sent',
      this.page.meanVideoStats.nativeReport.googPlisSent / (config.args.testRuntimeMs / 60000),
      config.videoAssertProfile.maxPlisSentPerMinute,
      'lte'
    );
    this.assert(
      'Video codec name',
      this.page.meanVideoStats.codecName,
      config.videoAssertProfile.codecName,
      'eql'
    );
    this.assert(
      'Video frame rate decoded',
      this.page.meanVideoStats.avgFrameRateDecoded,
      this.page.meanVideoStats.avgFrameRateOutput,
      'gte',
      config.videoAssertProfile.decodedFrameRateTolerance
    );
    this.assert(
      'Video freeze',
      this.page.meanVideoStats.freezesDetected,
      config.videoAssertProfile.maxVideoFreezes,
      'eql'
    );
    this.assert(
      'Video resolution change count',
      this.page.meanVideoStats.videoResolutionChangeCount / (config.args.testRuntimeMs / 60000),
      config.videoAssertProfile.maxResolutionChangeCountPerMinute,
      'lte'
    );
    await this.assertInterframeThresholds();
  }

  async assertAudioQuality() {
    this.assert(
      'Audio mean bitrate',
      this.page.meanAudioStats.bitrateMean,
      config.audioAssertProfile.minBitrateMeanKbps,
      'gte'
    );
    this.assert(
      'Audio mean jitter',
      this.page.meanAudioStats.jitter,
      config.audioAssertProfile.maxJitter,
      'lt'
    );
    this.assert(
      'Audio mean jitter buffer',
      this.page.meanAudioStats.jitterBuffer,
      this.page.meanAudioStats.jitter,
      'gt'
    );
    this.assert(
      'Audio mean output level',
      this.page.meanAudioStats.audioOutputLevel,
      config.audioAssertProfile.minAudioOutputLevel,
      'gte'
    );
    this.assert(
      'Audio mean delay',
      this.page.meanAudioStats.currentDelay,
      config.audioAssertProfile.maxMeanDelay,
      'lte'
    );
    this.assert(
      'Audio max delay',
      this.page.meanAudioStats.maxDelay,
      config.audioAssertProfile.maxDelay,
      'lte'
    );
    this.assert(
      'Audio packets loss',
      this.page.meanAudioStats.nativeReport.packetsLost / (config.args.testRuntimeMs / 60000),
      config.audioAssertProfile.maxPacketsLossPerMinute,
      'lt'
    );
    this.assert(
      'Audio total samples duration',
      this.page.meanAudioStats.totalSamplesDuration,
      config.audioAssertProfile.totalSamplesDurationPerc ? this.page.meanAudioStats.statsCaptureDuration * config.audioAssertProfile.totalSamplesDurationPerc / 100 : null,
      'gte'
    );
    this.assert(
      'Audio codec name',
      this.page.meanAudioStats.codecName,
      config.audioAssertProfile.codecName,
      'eql'
    );

    await this.finishTest();
  }

  async assertAudioLag(rtmpPush) {
    audioLag(this.page, rtmpPush, this.assert.bind(this));

    await this.finishTest();
  }

  async assertVideoLag(rtmpPush) {
    videoLag(rtmpPush, this.page, this.assert.bind(this));
  }

  async assertSync() {
    this.assert(
      'Average video sync with audio',
      this.page.stats.averageSync,
      config.videoAssertProfile.maxAverageSync,
      'lte'
    );

    this.assert(
      'Max video sync with audio',
      this.page.stats.maxSync,
      config.videoAssertProfile.maxSingleSync,
      'lte'
    );
    
    await this.finishTest();
  }
};