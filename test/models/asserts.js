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

import {t} from 'testcafe';
import {ok} from 'assert';
import {isNull} from 'util';
import config from '../../config.js';
import Logger from '../../scripts/logger.js';
import _ from 'lodash';

const logger = new Logger('Test');

module.exports = class Asserts {
  constructor(page) {
    this.page = page;
  }

  async assert(name, firstArg, secondArg, sign, tolerance) {
    var assertionMsg = '';
    var assertion = false;

    if ((_.isString(firstArg) && /^\s*$/.test(firstArg)) || (_.isString(secondArg) && /^\s*$/.test(secondArg))) {
      logger.log(`Did not assert '${name}' because there was no collected stats for it`);

      return;
    } else if (_.isNumber(firstArg) && isNull(firstArg) || _.isNumber(secondArg) && isNull(secondArg)) {
      logger.log(`Did not assert '${name}' because there was no collected stats for it`);

      return;
    }

    switch (sign) {
      case 'deql':
        assertion = firstArg === secondArg;
        assertionMsg = 'deep equal to';

        break;
      case 'eql':
        assertion = firstArg == secondArg; // eslint-disable-line eqeqeq
        assertionMsg = 'equal to';

        break;
      case 'gt':
        assertion = firstArg > secondArg;
        assertionMsg = 'above';

        if (tolerance > 0 && !assertion) {
          firstArg = parseFloat(firstArg) + parseFloat(tolerance);
          assertion = firstArg > secondArg;
          assertionMsg = `(with tolerance ${tolerance}) above`;
        }

        break;
      case 'gte':
        assertion = firstArg >= secondArg;
        assertionMsg = 'greater or equal to';

        if (tolerance > 0 && !assertion) {
          firstArg = parseFloat(firstArg) + parseFloat(tolerance);
          assertion = firstArg >= secondArg;
          assertionMsg = `(with tolerance ${tolerance}) greater or equal to`;
        }

        break;
      case 'lt':
        assertion = firstArg < secondArg;
        assertionMsg = 'below';

        if (tolerance > 0 && !assertion) {
          firstArg = parseFloat(firstArg) - parseFloat(tolerance);
          assertion = firstArg < secondArg;
          assertionMsg = `(with tolerance ${tolerance}) below`;
        }

        break;
      case 'lte':
        assertion = firstArg <= secondArg;
        assertionMsg = 'less or equal to';

        if (tolerance > 0 && !assertion) {
          firstArg = parseFloat(firstArg) - parseFloat(tolerance);
          assertion = firstArg <= secondArg;
          assertionMsg = `(with tolerance ${tolerance}) less or equal to`;
        }

        break;
      default:
        t.ctx.testFailed = true;

        throw Error(`Unsupported assert sign operator "${sign}"`);
    }

    if (t.ctx.assertions === undefined) {
      t.ctx.assertions = [];
      t.ctx.failedAssertions = [];
    }

    const msg = `${name} expected ${assertionMsg} ${secondArg} was ${firstArg}`;

    if (!assertion) {
      t.ctx.testFailed = true;
      t.ctx.failedAssertions.push(msg);
    }

    ok(assertion, msg);
    t.ctx.assertions.push(`${name} ${assertionMsg} ${secondArg}`);
  }

  async assertInterframeThresholds() {
    config.videoAssertProfile.interframeDelayTresholds.forEach(threshold => {
      const msg = `Video interframe max delays per minute expected not more than ${threshold.timesPerMin} times above ${threshold.maxAllowed}`;

      this.page.meanVideoStats.interframeDelaysPerMin.forEach((delaysPerMin, index) => {
        var aboveMax = delaysPerMin.filter(el => el > threshold.maxAllowed);
        const assertion = aboveMax.length <= threshold.timesPerMin;
        const message = `${msg} but in test minute nr${index + 1}. got [${aboveMax}]`;

        if (!assertion) {
          t.ctx.testFailed = true;
          t.ctx.failedAssertions.push(message);
        }

        ok(assertion, message);
      });

      t.ctx.assertions.push(msg);
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
      this.page.meanVideoStats.targetDelay,
      this.page.meanVideoStats.currentDelay,
      'gte'
    );
    this.assert(
      'Video dropped frames',
      this.page.meanVideoStats.droppedFrames,
      config.videoAssertProfile.maxDroppedFrames * config.videoAssertProfile.minFramerateMean,
      'lte'
    );
    this.assert(
      'Video mean framerate',
      this.page.meanVideoStats.framerateMean,
      config.videoAssertProfile.minFramerateMean,
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
      this.page.meanVideoStats.nativeReport.packetsLost,
      config.videoAssertProfile.maxPacketLossPerMin / 1000 * config.args.testRuntimeMs,
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
      'Video first frame received to decode ms',
      this.page.meanVideoStats.nativeReport.googFirstFrameReceivedToDecodedMs,
      config.videoAssertProfile.maxMsToFirstFrameDecoded,
      'lte'
    );
    this.assert(
      'Video nacks sent',
      this.page.meanVideoStats.nativeReport.googNacksSent,
      config.videoAssertProfile.maxNacksSentPerMin / 1000 * config.args.testRuntimeMs,
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
      this.page.meanVideoStats.nativeReport.googPlisSent,
      config.videoAssertProfile.maxPlisSentPerMin / 1000 * config.args.testRuntimeMs,
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
      'gte'
    );
    this.assert(
      'Video freeze',
      this.page.meanVideoStats.freezesDetected,
      config.videoAssertProfile.maxVideoFreezes,
      'eql'
    );
    this.assert(
      'Video resolution change count',
      this.page.meanVideoStats.videoResolutionChangeCount,
      config.videoAssertProfile.maxResolutionChangeCountPerMin / 1000 * config.args.testRuntimeMs,
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
      this.page.meanAudioStats.nativeReport.packetsLost,
      config.audioAssertProfile.maxPacketsLossPerMin / 1000 * config.args.testRuntimeMs,
      'lt'
    );
    this.assert(
      'Audio total samples duration',
      this.page.meanAudioStats.totalSamplesDuration,
      this.page.meanAudioStats.statsCaptureDuration * config.audioAssertProfile.totalSamplesDurationPerc / 100,
      'gte'
    );
    this.assert(
      'Audio codec name',
      this.page.meanAudioStats.codecName,
      config.audioAssertProfile.codecName,
      'eql'
    );
  }
};