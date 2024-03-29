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

const _ = require('lodash');
const moment = require('moment');
const {t} = require('testcafe');
const {isNull} = require('util');

const config = require('../../config.js');
const Logger = require('../../scripts/logger.js');

const {audioLag, videoLag} = require('./assertions/lag.js');
const reporter = require('./reporters/common-reporter');
const format = require('./format');

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

    if (_.isNaN(expected) || _.isNil(expected) || expected === null || tolerance === null) {
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

        if (tolerance > 0 && !assertion) {
          assertion = actual >= (expected - tolerance) && actual <= (expected + tolerance);
          assertionMsg = `(with tolerance ${tolerance}) ${assertionMsg}`;
        }

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

    actual = isNaN(actual) ? actual : format.formatMsgActualValue(actual, expected, sign);

    if (format.isISO8601(expected)) {
      actual = format.formatTime(actual);
    }

    let msg = assertion ?
      `${name} ${assertionMsg} [${expected}], was [${actual}]` :
      `${name} expected ${assertionMsg} [${expected}], was [${actual}]`;

    this.assertions.push({
      assertion,
      msg
    });

    if (!assertion) {
      t.ctx.testFailed = true;
      t.ctx.failedAssertions.push(msg);

      return;
    }

    t.ctx.assertions.push(`${name} ${assertionMsg} [${expected}], was [${actual}]`);
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

  async reportAssertionResults() {
    await Promise.all(this.allAssertions.map(async({assertion, msg}) => {
      await t.expect(assertion).ok(msg);

      return;
    }));
  }

  formatObservations(observations, valueKey, unit) {
    return observations.map(obs => (
      moment.utc(obs.timestamp).format(config.args.dateFormat) + `: ${obs[valueKey]} ${unit}`
    ));
  }

  assertFramerate(streamStats, expected, type) {
    const {framerateMeansPerMinute} = streamStats;
    const name = `Video ${type} framerate`;

    if (_.isNil(expected) || expected === null) {
      t.ctx.skippedAssertions.push(name);

      return;
    }

    expected.forEach(allowedValue => {
      const {allowed, timesPerMinute} = allowedValue;
      const msg = `${name} ${timesPerMinute} times ${
        type === 'min' ? 'below' : 'above'
      } ${allowed}`;
      let passed = true;

      framerateMeansPerMinute.forEach((frameratesPerMin, index) => {
        let unexpected = [];

        if (type === 'min') {
          unexpected = frameratesPerMin.filter(fr => fr.framerate <= allowed);
        } else {
          unexpected = frameratesPerMin.filter(fr => fr.framerate >= allowed);
        }

        if (unexpected.length <= timesPerMinute) {
          return;
        }

        const observations = this.formatObservations(unexpected, 'framerate', 'fps');
        const message = `During minute ${index + 1}, video ${
          type === 'min' ? 'min framerate was less than or equal to' : 'max framerate was more than or equal to'
        } [${allowed}] fps [${unexpected.length}] times. Max allowed is [${timesPerMinute}] times. Observations: ${JSON.stringify(
          observations,
          undefined,
          2
        )}`;

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

  async assertInterframeThresholds(streamStats) {
    const {interframeDelayThresholds} = config.videoAssertProfile;

    if (interframeDelayThresholds === null) {
      t.ctx.skippedAssertions.push('Video interframe max delays per minute');

      return;
    }

    await this.assertThreshold(interframeDelayThresholds, streamStats.interframeDelaysPerMinute, 'video interframe delay');
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
    const videoCurrentDelay = 'Video current delay';

    this.assert(
      'Video mean bitrate',
      streamStats.bitrateMean,
      config.videoAssertProfile.minBitrateMeanKbps,
      'gte'
    );
    this.assert(
      'Video mean bitrate',
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
    this.assert(
      'Video max average target delay',
      streamStats.targetDelay,
      config.videoAssertProfile.maxAverageTargetDelay,
      'lte'
    );

    if (maxTargetDelayOvershoot !== null) {
      this.assert(
        videoCurrentDelay,
        streamStats.currentDelay,
        parseFloat(streamStats.targetDelay) + parseFloat(maxTargetDelayOvershoot),
        'lte'
      );
    } else {
      t.ctx.skippedAssertions.push(videoCurrentDelay);
    }

    const shouldSkipDroppedFramesAssertion = config.videoAssertProfile.maxDroppedFramesPerSecond === null || config.videoAssertProfile.minFrameRateMean === null;
    const maxAllowedDroppedFramesCountPerMinute = config.videoAssertProfile.maxDroppedFramesPerSecond * config.videoAssertProfile.minFrameRateMean;
    this.assert(
      'Video dropped frames',
      streamStats.droppedFrames,
      shouldSkipDroppedFramesAssertion ? null : maxAllowedDroppedFramesCountPerMinute * (config.args.testRuntimeMs / 60000),
      'lte'
    );

    this.assert(
      'Video mean framerate',
      streamStats.framerateMean,
      config.videoAssertProfile.minFrameRateMean,
      'gte',
      config.videoAssertProfile.frameRateMeanTolerance
    );

    const {minFrameRate, maxFrameRate} = config.videoAssertProfile;

    this.assertFramerate(streamStats, minFrameRate, 'min');
    this.assertFramerate(streamStats, maxFrameRate, 'max');

    let packetsLost = null;
    let nackCount = null;
    let firCount = null;
    let pliCount = null;

    if (streamStats.nativeReport) {
      if (streamStats.nativeReport.packetsLost !== undefined) {
        packetsLost = streamStats.nativeReport.packetsLost;
      }

      if (streamStats.nativeReport.googNacksSent !== undefined) {
        nackCount = streamStats.nativeReport.googNacksSent;
      }

      if (streamStats.nativeReport.nackCount !== undefined) {
        nackCount = streamStats.nativeReport.nackCount;
      }

      if (streamStats.nativeReport.googFirsSent !== undefined) {
        firCount = streamStats.nativeReport.googFirsSent;
      }

      if (streamStats.nativeReport.firCount !== undefined) {
        firCount = streamStats.nativeReport.firCount;
      }

      if (streamStats.nativeReport.googPlisSent !== undefined) {
        pliCount = streamStats.nativeReport.googPlisSent;
      }

      if (streamStats.nativeReport.pliCount !== undefined) {
        pliCount = streamStats.nativeReport.pliCount;
      }
    }

    this.assert(
      'Video packet loss',
      packetsLost / (config.args.testRuntimeMs / 60000),
      config.videoAssertProfile.maxPacketLossPerMinute,
      'lte'
    );
    this.assert(
      'Video average frame width',
      streamStats.avgFrameWidth,
      config.videoAssertProfile.frameWidth,
      'eql',
      config.videoAssertProfile.resolutionTolerance
    );
    this.assert(
      'Video average frame height',
      streamStats.avgFrameHeight,
      config.videoAssertProfile.frameHeight,
      'eql',
      config.videoAssertProfile.resoultionTolerance
    );
    this.assert(
      'Video nacks sent',
      nackCount / (config.args.testRuntimeMs / 60000),
      config.videoAssertProfile.maxNacksSentPerMinute,
      'lte'
    );
    this.assert(
      'Video FIRs sent',
      firCount,
      config.videoAssertProfile.firsSent,
      'eql'
    );
    this.assert(
      'Video PLIs sent',
      pliCount / (config.args.testRuntimeMs / 60000),
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
    let packetsLost = null;

    if (audioStats.nativeReport) {
      if (audioStats.nativeReport.packetsLost !== undefined) {
        packetsLost = audioStats.nativeReport.packetsLost;
      }
    }

    // TODO (NCS) 2023-11-15 FIX IMMEDIATELY: this.assert(
    // TODO (NCS) 2023-11-15 FIX IMMEDIATELY:   'Audio mean bitrate',
    // TODO (NCS) 2023-11-15 FIX IMMEDIATELY:   audioStats.bitrateMean,
    // TODO (NCS) 2023-11-15 FIX IMMEDIATELY:   config.audioAssertProfile.minBitrateMeanKbps,
    // TODO (NCS) 2023-11-15 FIX IMMEDIATELY:   'gte'
    // TODO (NCS) 2023-11-15 FIX IMMEDIATELY: );
    this.assert(
      'Audio mean jitter',
      audioStats.jitter,
      config.audioAssertProfile.maxJitter,
      'lt'
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
      'Audio packets loss',
      packetsLost / (config.args.testRuntimeMs / 60000),
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

    await this.assertAudioDelaysPerMinute(audioStats);
    await this.finishTest(memberID);
  }

  async assertAudioDelaysPerMinute(audioStats) {
    const {audioDelayThresholds} = config.audioAssertProfile;

    if (audioDelayThresholds === null) {
      t.ctx.skippedAssertions.push('Audio delays per minute');

      return;
    }

    await this.assertThreshold(audioDelayThresholds, audioStats.delaysPerMinute, 'audio max delay', 'audio delay');
  }

  async assertThreshold(allowedThresholds, collectedResults, assertMessageUnit, failedAssertMessageUnit) {
    if (_.isNil(allowedThresholds) || allowedThresholds === null) {
      t.ctx.skippedAssertions.push(assertMessageUnit);

      return;
    }

    allowedThresholds.forEach(threshold => {
      const {maxAllowed, timesPerMinute} = threshold;
      const msg = `${assertMessageUnit.charAt(0).toUpperCase() + assertMessageUnit.slice(1)} threshold ${
        timesPerMinute
      } times above ${
        maxAllowed
      } milliseconds`;
      let passed = true;

      collectedResults.forEach((delaysPerMin, index) => {
        const aboveMax = delaysPerMin.filter(el => el.delay > maxAllowed);
        const assertion = aboveMax.length <= timesPerMinute;

        if (assertion) {
          return;
        }

        const observations = this.formatObservations(aboveMax, 'delay', 'ms');
        const message = `During minute ${index + 1}, ${failedAssertMessageUnit || assertMessageUnit} threshold was above [${
          maxAllowed
        }] milliseconds [${
          aboveMax.length
        }] times. Max allowed is [${
          timesPerMinute
        }] times. Observations: ${JSON.stringify(observations, undefined, 2)}`;

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

  async assertAudioLag(rtmpPush) {
    audioLag(this.page, rtmpPush, this.assert.bind(this));

    await this.finishTest();
  }

  async assertVideoLag(rtmpPush) {
    videoLag(this.page, rtmpPush, this.assert.bind(this));

    this.assert(
      'Video max framerate',
      this.page.stats.framerateMax,
      config.videoAssertProfile.maxFrameRateMean,
      'lte'
    );

    this.assert(
      'Video min framerate',
      this.page.stats.framerateMin,
      config.videoAssertProfile.minFrameRateMean,
      'gte'
    );
  }

  async assertSync() {
    this.assert(
      'Collected video stats count',
      this.page.stats.video.length,
      0,
      'gt'
    );

    this.assert(
      'Collected audio stats count',
      this.page.stats.audio.length,
      0,
      'gt'
    );

    this.assert(
      'Average video sync with audio',
      this.page.stats.video.length > 0 ? this.page.stats.averageSync : 'null',
      config.videoAssertProfile.maxAverageSync,
      'lte'
    );

    this.assert(
      'Max video sync with audio',
      this.page.stats.video.length > 0 ? this.page.stats.maxSync : 'null',
      config.videoAssertProfile.maxSingleSync,
      'lte'
    );

    this.assert(
      'Video max framerate',
      this.page.stats.framerateMax,
      config.videoAssertProfile.maxFrameRateMean,
      'lte'
    );

    this.assert(
      'Video min framerate',
      this.page.stats.framerateMin,
      config.videoAssertProfile.minFrameRateMean,
      'gte'
    );

    await this.finishTest();
  }

  async assertSyncWatch() {
    this.assert(
      'Max video sync between both subscribers',
      this.page.stats.maxVideoSync,
      config.videoAssertProfile.syncWatch_max,
      'lte'
    );

    this.assert(
      'Max audio sync between both subscribers',
      this.page.stats.maxAudioSync,
      config.audioAssertProfile.syncWatch_max,
      'lte'
    );

    this.assert(
      'Average video sync between both subscribers',
      this.page.stats.averageVideoSync,
      config.videoAssertProfile.syncWatch_average,
      'lte'
    );

    this.assert(
      'Average audio sync between both subscribers',
      this.page.stats.averageAudioSync,
      config.audioAssertProfile.syncWatch_average,
      'lte'
    );

    this.assert(
      'Collected subscriber one video stats count',
      this.page.stats.subscriberOneVideo.length,
      0,
      'gt'
    );

    this.assert(
      'Collected subscriber two video stats count',
      this.page.stats.subscriberTwoVideo.length,
      0,
      'gt'
    );

    this.assert(
      'Collected subscriber one audio stats count',
      this.page.stats.subscriberOneAudio.length,
      0,
      'gt'
    );

    this.assert(
      'Collected subscriber two audio stats count',
      this.page.stats.subscriberTwoAudio.length,
      0,
      'gt'
    );

    await this.finishTest();
  }

  async assertReceiverChat() {
    const chatReceiveProfile = config.chatAssertProfile.receive;
    const requestedHistoryStart = this.page.stats.requestedHistoryStart;
    const requestedHistoryEnd = this.page.stats.requestedHistoryEnd;

    this.assert(
      'Max sender-to-receiver lag',
      this.page.stats.maxSenderToReceiverLag,
      chatReceiveProfile.senderToReceiverLag,
      'lte'
    );

    this.assert(
      'Max sender-to-platform lag',
      this.page.stats.maxSenderToPlatformLag,
      chatReceiveProfile.senderToPlatformLag,
      'lte'
    );

    this.assert(
      'Max platform-to-receiver lag',
      this.page.stats.maxPlatformToReceiverLag,
      chatReceiveProfile.platformToReceiverLag,
      'lte'
    );

    this.assert(
      'Standard deviation of sender-to-receiver lag',
      this.page.stats.stdDevSenderToReceiverLag,
      chatReceiveProfile.stdDevSenderToReceiverLag,
      'lte'
    );

    this.assert(
      'Received message count',
      this.page.stats.received.length,
      config.args.numMessages,
      'gte'
    );

    requestedHistoryStart.forEach(requestedHistory => {
      this.assert(
        `History lag at the start with [${requestedHistory.messageCount}] messages`,
        requestedHistory.lag,
        chatReceiveProfile.historyRequestLag,
        'lte'
      );
    });

    requestedHistoryEnd.forEach(requestedHistory => {
      this.assert(
        `History lag at the end with [${requestedHistory.messageCount}] messages`,
        requestedHistory.lag,
        chatReceiveProfile.historyRequestLag,
        'lte'
      );
    });

    await this.finishTest();
  }

  async assertSenderChat() {
    this.assert(
      'Messages sent',
      this.page.stats.sent.length,
      config.args.numMessages,
      'eql'
    );

    await this.finishTest();
  }
};