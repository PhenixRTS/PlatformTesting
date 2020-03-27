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
    this.allAssertions = [];
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

  async finishTest(memberID = '') {
    reporter.LogAssertionResults(this.assertions, memberID);

    const member = memberID === '' ? 'default' : memberID;

    if (!t.ctx.assertionResults) {
      t.ctx.assertionResults = {};
    }

    t.ctx.assertionResults[member] = {
      passed: [...t.ctx.assertions],
      failed: [...t.ctx.failedAssertions],
      skipped: [...t.ctx.skippedAssertions]
    };

    t.ctx.assertions = [];
    t.ctx.failedAssertions = [];
    t.ctx.skippedAssertions = [];

    this.allAssertions = [...this.allAssertions, ...this.assertions];
    this.assertions = [];
  }

  async runAssertions() {
    await Promise.all(this.allAssertions.map(async({assertion, msg}) => {
      await t.expect(assertion).ok(msg);

      return;
    }));
  }

  async assertInterframeThresholds(streamStats) {
    const {interframeDelayThresholds} = config.videoAssertProfile;

    if (interframeDelayThresholds === null) {
      t.ctx.skippedAssertions.push('Video interframe max delays per minute');

      return;
    }

    interframeDelayThresholds.forEach(threshold => {
      const {maxAllowed, timesPerMinute} = threshold;
      const msg = `Video interframe delay treshold ${timesPerMinute} times above ${maxAllowed} milliseconds`;
      let passed = true;

      streamStats.interframeDelaysPerMin.forEach((delaysPerMin, index) => {
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

  async assertKPIs(streamStats) {
    this.assert(
      'PTTFF',
      streamStats.streamReceivedAt - streamStats.loadedAt,
      config.videoAssertProfile.maxPTTFF,
      'lte'
    );
  }

  async assertVideoQuality(streamStats) {
    const {maxTargetDelayOvershoot} = config.videoAssertProfile;
    const videoTargetDelay = 'Video current delay';

    this.assert(
      'Video mean bitrate',
      streamStats.bitrateMean,
      config.videoAssertProfile.minBitrateMeanKbps,
      'gte'
    );
    this.assert(
      'Video max mean bitrate',
      streamStats.bitrateMean,
      config.videoAssertProfile.maxBitrateMeanKps,
      'lte'
    );
    this.assert(
      'Video mean delay',
      streamStats.currentDelay,
      config.videoAssertProfile.maxMeanDelay,
      'lte'
    );
    this.assert(
      'Video max delay',
      streamStats.maxDelay,
      config.videoAssertProfile.maxDelay,
      'lte'
    );

    if (maxTargetDelayOvershoot !== null) {
      this.assert(
        videoTargetDelay,
        streamStats.currentDelay,
        parseFloat(streamStats.targetDelay) + parseFloat(maxTargetDelayOvershoot),
        'lte'
      );
    } else {
      t.ctx.skippedAssertions.push(videoTargetDelay);
    }

    this.assert(
      'Video dropped frames',
      streamStats.droppedFrames,
      config.videoAssertProfile.maxDroppedFrames * config.videoAssertProfile.minFrameRateMean,
      'lte'
    );
    this.assert(
      'Video mean framerate',
      streamStats.framerateMean,
      config.videoAssertProfile.minFrameRateMean,
      'gte',
      0.05
    );
    this.assert(
      'Video max framerate',
      streamStats.framerateMax,
      config.videoAssertProfile.maxFrameRate,
      'lte'
    );
    this.assert(
      'Video min framerate',
      streamStats.framerateMin,
      config.videoAssertProfile.minFrameRate,
      'gte'
    );
    this.assert(
      'Video packet loss',
      streamStats.nativeReport.packetsLost / (config.args.testRuntimeMs / 60000),
      config.videoAssertProfile.maxPacketLossPerMinute,
      'lte'
    );
    this.assert(
      'Video average frame width',
      streamStats.avgFrameWidth,
      config.videoAssertProfile.frameWidth,
      'eql'
    );
    this.assert(
      'Video average frame height',
      streamStats.avgFrameHeight,
      config.videoAssertProfile.frameHeight,
      'eql'
    );
    this.assert(
      'Video first frame received to decode',
      streamStats.nativeReport.googFirstFrameReceivedToDecodedMs,
      config.videoAssertProfile.timeToFirstFrameDecoded,
      'lte'
    );
    this.assert(
      'Video nacks sent',
      streamStats.nativeReport.googNacksSent / (config.args.testRuntimeMs / 60000),
      config.videoAssertProfile.maxNacksSentPerMinute,
      'lte'
    );
    this.assert(
      'Video firs sent',
      streamStats.nativeReport.googFirsSent,
      config.videoAssertProfile.firsSent,
      'eql'
    );
    this.assert(
      'Video plis sent',
      streamStats.nativeReport.googPlisSent / (config.args.testRuntimeMs / 60000),
      config.videoAssertProfile.maxPlisSentPerMinute,
      'lte'
    );
    this.assert(
      'Video codec name',
      streamStats.codecName,
      config.videoAssertProfile.codecName,
      'eql'
    );
    this.assert(
      'Video frame rate decoded',
      streamStats.avgFrameRateDecoded,
      streamStats.avgFrameRateOutput,
      'gte',
      config.videoAssertProfile.decodedFrameRateTolerance
    );
    this.assert(
      'Video freeze',
      streamStats.freezesDetected,
      config.videoAssertProfile.maxVideoFreezes,
      'eql'
    );
    this.assert(
      'Video resolution change count',
      streamStats.videoResolutionChangeCount / (config.args.testRuntimeMs / 60000),
      config.videoAssertProfile.maxResolutionChangeCountPerMinute,
      'lte'
    );
    await this.assertInterframeThresholds(streamStats);
  }

  async assertAudioQuality(audioStats, memberID) {
    this.assert(
      'Audio mean bitrate',
      audioStats.bitrateMean,
      config.audioAssertProfile.minBitrateMeanKbps,
      'gte'
    );
    this.assert(
      'Audio mean jitter',
      audioStats.jitter,
      config.audioAssertProfile.maxJitter,
      'lt'
    );
    this.assert(
      'Audio mean jitter buffer',
      audioStats.jitterBuffer,
      audioStats.jitter,
      'gt'
    );
    this.assert(
      'Audio mean output level',
      audioStats.audioOutputLevel,
      config.audioAssertProfile.minAudioOutputLevel,
      'gte'
    );
    this.assert(
      'Audio mean delay',
      audioStats.currentDelay,
      config.audioAssertProfile.maxMeanDelay,
      'lte'
    );
    this.assert(
      'Audio max delay',
      audioStats.maxDelay,
      config.audioAssertProfile.maxDelay,
      'lte'
    );
    this.assert(
      'Audio packets loss',
      audioStats.nativeReport.packetsLost / (config.args.testRuntimeMs / 60000),
      config.audioAssertProfile.maxPacketsLossPerMinute,
      'lt'
    );
    this.assert(
      'Audio total samples duration',
      audioStats.totalSamplesDuration,
      config.audioAssertProfile.totalSamplesDurationPerc ? audioStats.statsCaptureDuration * config.audioAssertProfile.totalSamplesDurationPerc / 100 : null,
      'gte'
    );
    this.assert(
      'Audio codec name',
      audioStats.codecName,
      config.audioAssertProfile.codecName,
      'eql'
    );

    await this.finishTest(memberID);
  }

  async assertAudioLag(rtmpPush) {
    audioLag(this.page, rtmpPush, this.assert.bind(this));

    await this.finishTest();
  }

  async assertVideoLag(rtmpPush) {
    videoLag(this.page, rtmpPush, this.assert.bind(this));
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