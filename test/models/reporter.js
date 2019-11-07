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
import Logger from '../../scripts/logger.js';
import config from '../../config.js';

const logger = new Logger('Test');

function average(arr) {
  if (arr.length === 0) {
    return 0;
  }

  return arr.reduce((p, c) => p + c, 0) / arr.length;
}

async function CollectMediaStreamStats() {
  logger.log('Collecting media stream stats...');

  const streamStatsTitle = '[Acceptance Testing] [Media Stream Stats] ';
  const urlLoadedTitle = '[Acceptance Testing] [Url loaded] ';
  const streamReceivedTitle = '[Acceptance Testing] [Stream received] ';
  const logs = await t.getBrowserConsoleMessages();
  const collectedStats = {
    loadedAt: undefined,
    streamReceivedAt: undefined,
    audio: {},
    video: {}
  };

  logs.info.forEach(el => {
    el = el.trim();

    if (el.startsWith(urlLoadedTitle)) {
      el = el.replace(urlLoadedTitle, '');
      collectedStats.loadedAt = JSON.parse(el);

      return;
    } else if (el.startsWith(streamReceivedTitle)) {
      el = el.replace(streamReceivedTitle, '');
      collectedStats.streamReceivedAt = JSON.parse(el);

      return;
    } else if (!el.startsWith(streamStatsTitle)) {
      return;
    }

    el = el.replace(streamStatsTitle, '');

    const stat = JSON.parse(el);

    if (collectedStats[stat.mediaType][stat.ssrc] === undefined) {
      collectedStats[stat.mediaType][stat.ssrc] = [stat];
    } else {
      collectedStats[stat.mediaType][stat.ssrc].push(stat);
    }
  });

  return collectedStats;
}

function chunk(arr, size) {
  const chunked = [];
  for (let i = 0, len = arr.length; i < len; i += size) {
    chunked.push(arr.slice(i, i + size));
  }

  return chunked;
}

async function GetMeanVideoStats(stats) {
  const meanVideoStats = {
    downloadRate: null,
    mediaType: null,
    ssrc: null,
    codecName: null,
    direction: null,
    nativeReport: {},
    bitrateMean: null,
    maxBitrateMean: null,
    targetDelay: null,
    currentDelay: null,
    maxDelay: null,
    droppedFrames: null,
    framerateMean: null,
    framerateMax: null,
    avgFrameWidth: 0,
    avgFrameHeight: 0,
    avgFrameRateDecoded: 0,
    avgFrameRateOutput: 0,
    totalStatsReceived: 0,
    statsCaptureDuration: 0,
    freezesDetected: 0,
    interframeDelayMax: 0,
    videoResolutionChangeCount: 0,
    interframeDelaysPerMin: null
  };
  const targetDelays = [];
  const currentDelays = [];
  const meanBitrates = [];
  const frameWidths = [];
  const frameHeights = [];
  const frameRateDecodes = [];
  const frameRateOutputs = [];
  const bytesReceived = [];
  const allInterframeDelayMaxs = [];

  Object.keys(stats.video).forEach((key) => {
    const videoStats = stats.video[key];
    meanVideoStats.totalStatsReceived += videoStats.length;
    meanVideoStats.framerateMin = videoStats[1].framerateMean.toFixed(2);

    videoStats.forEach((stat) => {
      targetDelays.push(stat.targetDelay);
      currentDelays.push(stat.currentDelay);
      meanBitrates.push(stat.bitrateMean);
      frameWidths.push(parseInt(stat.nativeReport.googFrameWidthReceived));
      frameHeights.push(parseInt(stat.nativeReport.googFrameHeightReceived));
      frameRateDecodes.push(parseInt(stat.nativeReport.googFrameRateDecoded));
      frameRateOutputs.push(parseInt(stat.nativeReport.googFrameRateOutput));

      if (meanVideoStats.mediaType === null) {
        meanVideoStats.mediaType = stat.mediaType;
        meanVideoStats.ssrc = stat.ssrc;
        meanVideoStats.direction = stat.direction;
        meanVideoStats.codecName = stat.nativeReport.googCodecName;
      }

      meanVideoStats.maxDelay = stat.currentDelay > meanVideoStats.maxDelay ? stat.currentDelay : meanVideoStats.maxDelay;
      meanVideoStats.interframeDelayMax = stat.nativeReport.googInterframeDelayMax > meanVideoStats.interframeDelayMax ? stat.nativeReport.googInterframeDelayMax : meanVideoStats.interframeDelayMax;
      meanVideoStats.downloadRate = stat.downloadRate;
      meanVideoStats.framerateMean = stat.framerateMean.toFixed(2);
      meanVideoStats.framerateMax = stat.framerateMean > meanVideoStats.framerateMax ? stat.framerateMean.toFixed(2) : meanVideoStats.framerateMax;
      meanVideoStats.framerateMin = (stat.framerateMean < meanVideoStats.framerateMin && stat.framerateMean !== 0) ? stat.framerateMean.toFixed(2) : meanVideoStats.framerateMin;
      meanVideoStats.droppedFrames += stat.droppedFrames;
      meanVideoStats.nativeReport = stat.nativeReport;
      meanVideoStats.freezesDetected += bytesReceived.includes(stat.nativeReport.bytesReceived) ? 1 : 0;
      bytesReceived.push(stat.nativeReport.bytesReceived);
      allInterframeDelayMaxs.push(stat.nativeReport.googInterframeDelayMax);
    });

    meanVideoStats.statsCaptureDuration =
      videoStats[videoStats.length - 1].nativeReport.timestamp - videoStats[0].nativeReport.timestamp;
  });

  meanVideoStats.targetDelay = average(targetDelays).toFixed(2);
  meanVideoStats.currentDelay = average(currentDelays).toFixed(2);
  meanVideoStats.bitrateMean = (average(meanBitrates) / 1024).toFixed(2);
  meanVideoStats.avgFrameWidth = average(frameWidths.slice(3));
  meanVideoStats.avgFrameHeight = average(frameHeights.slice(3));
  meanVideoStats.avgFrameRateDecoded = average(frameRateDecodes).toFixed(1);
  meanVideoStats.avgFrameRateOutput = average(frameRateOutputs).toFixed(1);
  meanVideoStats.interframeDelaysPerMin = chunk(allInterframeDelayMaxs, 60);
  frameHeights.forEach((h, i) => {
    if (i > 0) {
      meanVideoStats.videoResolutionChangeCount += frameHeights[i - 1] == h ? 0 : 1; // eslint-disable-line eqeqeq
    }
  });

  return meanVideoStats;
}

async function GetMeanAudioStats(stats) {
  const meanAudioStats = {
    downloadRate: null,
    mediaType: null,
    ssrc: null,
    codecName: null,
    direction: null,
    nativeReport: {},
    bitrateMean: null,
    currentDelay: null,
    maxDelay: null,
    audioOutputLevel: null,
    jitter: null,
    jitterBuffer: null,
    totalSamplesDuration: null,
    totalAudioEnergy: null,
    totalStatsReceived: 0,
    statsCaptureDuration: 0
  };
  const currentDelays = [];
  const audioOutputLevels = [];
  const jitters = [];
  const jitterBuffers = [];
  let totalSamplesDurationsSum = 0;
  const totalAudioEnergies = [];

  Object.keys(stats.audio).forEach((key) => {
    const audioStats = stats.audio[key];
    meanAudioStats.totalStatsReceived += audioStats.length;

    audioStats.forEach((stat) => {
      currentDelays.push(stat.currentDelay);
      audioOutputLevels.push(stat.audioOutputLevel);
      jitters.push(stat.jitter);
      jitterBuffers.push(stat.jitterBuffer);
      totalSamplesDurationsSum += stat.totalSamplesDuration;
      totalAudioEnergies.push(stat.totalAudioEnergy);

      if (meanAudioStats.mediaType === null) {
        meanAudioStats.mediaType = stat.mediaType;
        meanAudioStats.ssrc = stat.ssrc;
        meanAudioStats.direction = stat.direction;
        meanAudioStats.codecName = stat.nativeReport.googCodecName;
      }

      meanAudioStats.maxDelay = stat.currentDelay > meanAudioStats.maxDelay ? stat.currentDelay : meanAudioStats.maxDelay;
      meanAudioStats.downloadRate = stat.downloadRate;
      meanAudioStats.bitrateMean = stat.bitrateMean;
      meanAudioStats.nativeReport = stat.nativeReport;
    });

    meanAudioStats.statsCaptureDuration =
      audioStats[audioStats.length - 1].nativeReport.timestamp - audioStats[0].nativeReport.timestamp;
  });

  meanAudioStats.currentDelay = average(currentDelays);
  meanAudioStats.audioOutputLevel = average(audioOutputLevels);
  meanAudioStats.jitter = average(jitters);
  meanAudioStats.jitterBuffer = average(jitterBuffers);
  meanAudioStats.totalSamplesDuration = totalSamplesDurationsSum;
  meanAudioStats.totalAudioEnergy = average(totalAudioEnergies);

  return meanAudioStats;
}

async function CreateTestReport(page) {
  const obj = await t.getBrowserConsoleMessages();

  return new Date() +
    `\n${config.backendUri}#${config.channelAlias}` +
    '\n\nBrowser: ' + JSON.stringify(page.browser, undefined, 2) +
    `\nTest runtime: ${config.args.testRuntime}` +
    '\nPTTFF (page load to first frame): ' + JSON.stringify(page.stats.streamReceivedAt - page.stats.loadedAt, undefined, 2) + ' ms' +
    '\nInterframe Max delay: ' + page.meanVideoStats.interframeDelayMax +
    '\n\nAssertions passed:\n' + JSON.stringify(t.ctx.assertions, undefined, 2) +
    '\n\nFailures:\n' + JSON.stringify(t.ctx.failedAssertions, undefined, 2) +
    '\n\nMean Video Stats:\n' + JSON.stringify(page.meanVideoStats, undefined, 2) +
    '\n\nMean Audio Stats:\n' + JSON.stringify(page.meanAudioStats, undefined, 2) +
    '\n\nConsole errors:\n' + JSON.stringify(obj.error, undefined, 2) +
    (config.args.logAllStatsInReport === 'true' ? `\n\nAll Stats:\n + ${JSON.stringify(page.stats, undefined, 2)}` : '');
}

async function CreateConsoleDump() {
  const obj = await t.getBrowserConsoleMessages();

  return new Date() +
    '\n\nERRORS:\n' + JSON.stringify(obj.error, undefined, 2) +
    '\n\nWARNINGS:\n' + JSON.stringify(obj.warn, undefined, 2) +
    '\n\nINFO:\n' + JSON.stringify(obj.info, undefined, 2) +
    '\n\nLOGS:\n' + JSON.stringify(obj.log, undefined, 2);
}

export default {
  CollectMediaStreamStats: CollectMediaStreamStats,
  GetMeanVideoStats: GetMeanVideoStats,
  GetMeanAudioStats: GetMeanAudioStats,
  CreateTestReport: CreateTestReport,
  CreateConsoleDump: CreateConsoleDump
};