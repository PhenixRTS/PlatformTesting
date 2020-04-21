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
import Logger from '../../../scripts/logger.js';
import reporter from './common-reporter.js';
import math from '../math.js';

const logger = new Logger('Quality Test');

let pageLoaded = Date.now();

async function CollectMediaStreamStats() {
  logger.log('Collecting media stream stats...');

  const streamStatsTitle = '[Acceptance Testing] [Media Stream Stats] ';
  const urlLoadedTitle = '[Acceptance Testing] [Url loaded] ';
  const streamReceivedTitle = '[Acceptance Testing] [Stream received] ';
  const logs = await t.getBrowserConsoleMessages();

  const streamStats = {
    loadedAt: undefined,
    streamReceivedAt: undefined,
    audio: {},
    video: {}
  };

  let testStats = {};

  logs.info.forEach(el => {
    el = el.trim();

    if (el.startsWith(urlLoadedTitle)) {
      el = el.replace(urlLoadedTitle, '');
      pageLoaded = JSON.parse(el);

      return;
    }

    if (
      !el.startsWith(streamReceivedTitle) &&
      !el.startsWith(streamStatsTitle)
    ) {
      return;
    }

    const matches = el.match(/\[memberID:(.*?)\]/);
    let memberID = '';

    if (matches) {
      memberID = matches[1];

      el = el.replace(matches[0], '');
    }

    if (!memberID) {
      memberID = 'default';
    }

    if (!testStats[memberID]) {
      testStats[memberID] = {
        ...streamStats,
        loadedAt: pageLoaded
      };
    }

    const collectedStats = testStats[memberID];

    if (el.startsWith(streamReceivedTitle)) {
      el = el.replace(streamReceivedTitle, '');
      collectedStats.streamReceivedAt = JSON.parse(el);

      return;
    }

    el = el.replace(streamStatsTitle, '');

    const stats = JSON.parse(el);
    const {mediaType, ssrc} = stats.stat;

    if (collectedStats[mediaType][ssrc] === undefined) {
      collectedStats[mediaType][ssrc] = [];
    }

    collectedStats[mediaType][ssrc].push(stats);
  });

  return testStats;
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
    avgFrameWidth: 0,
    avgFrameHeight: 0,
    avgFrameRateDecoded: 0,
    avgFrameRateOutput: 0,
    totalStatsReceived: 0,
    statsCaptureDuration: 0,
    freezesDetected: 0,
    interframeDelayMax: 0,
    videoResolutionChangeCount: 0,
    interframeDelaysPerMinute: null
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
  const framerateMeans = [];

  Object.keys(stats.video).forEach((key) => {
    const videoStats = stats.video[key];
    meanVideoStats.totalStatsReceived += videoStats.length;

    videoStats.forEach((statData, index) => {
      const {stat, timestamp} = statData;

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
      meanVideoStats.droppedFrames += stat.droppedFrames;
      meanVideoStats.nativeReport = stat.nativeReport;
      meanVideoStats.freezesDetected += bytesReceived.includes(stat.nativeReport.bytesReceived) ? 1 : 0;
      bytesReceived.push(stat.nativeReport.bytesReceived);
      allInterframeDelayMaxs.push({
        delay: stat.nativeReport.googInterframeDelayMax,
        timestamp
      });

      if (stat.framerateMean === 0 && index === 0) {
        return;
      }

      framerateMeans.push({
        framerate: Number(stat.framerateMean.toFixed(0)),
        timestamp
      });
    });

    meanVideoStats.statsCaptureDuration =
      videoStats[videoStats.length - 1].stat.nativeReport.timestamp - videoStats[0].stat.nativeReport.timestamp;
  });

  meanVideoStats.targetDelay = math.average(targetDelays).toFixed(2);
  meanVideoStats.currentDelay = math.average(currentDelays).toFixed(2);
  meanVideoStats.bitrateMean = (math.average(meanBitrates) / 1024).toFixed(2);
  meanVideoStats.avgFrameWidth = math.average(frameWidths.slice(3));
  meanVideoStats.avgFrameHeight = math.average(frameHeights.slice(3));
  meanVideoStats.avgFrameRateDecoded = math.average(frameRateDecodes).toFixed(1);
  meanVideoStats.avgFrameRateOutput = math.average(frameRateOutputs).toFixed(1);
  meanVideoStats.interframeDelaysPerMinute = math.chunk(allInterframeDelayMaxs, 60);
  meanVideoStats.framerateMeansPerMinute = math.chunk(framerateMeans, 60);
  meanVideoStats.framerateMean =
    framerateMeans.reduce((p, c) => p + (c.value || 0), 0) /
    framerateMeans.length;
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

    audioStats.forEach(statData => {
      const {stat} = statData;

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
      audioStats[audioStats.length - 1].stat.nativeReport.timestamp - audioStats[0].stat.nativeReport.timestamp;
  });

  meanAudioStats.currentDelay = math.average(currentDelays);
  meanAudioStats.audioOutputLevel = math.average(audioOutputLevels);
  meanAudioStats.jitter = math.average(jitters);
  meanAudioStats.jitterBuffer = math.average(jitterBuffers);
  meanAudioStats.totalSamplesDuration = totalSamplesDurationsSum;
  meanAudioStats.totalAudioEnergy = math.average(totalAudioEnergies);

  return meanAudioStats;
}

async function CreateTestReport(testController, page) {
  const header = {};
  const content = {};

  let members = 0;

  for (const memberID in page.stats) {
    const {loadedAt, meanAudioStats, meanVideoStats, streamReceivedAt} = page.stats[memberID];

    members++;

    header[memberID] = '\nPTTFF (page load to first frame): ' +
      JSON.stringify(streamReceivedAt - loadedAt, undefined, 2) +
      ' ms' +
      '\nInterframe Max delay: ' + meanVideoStats.interframeDelayMax;

    content[memberID] = '\n\nMean Video Stats:\n' +
      JSON.stringify(meanVideoStats, undefined, 2) +
      '\n\nMean Audio Stats:\n' +
      JSON.stringify(meanAudioStats, undefined, 2);
  }

  const additionalInfo = members > 1 ? `\nMembers in the room: ${members}` : '';

  return reporter.CreateTestReport(testController, page, header, content, additionalInfo);
}

export default {
  CollectMediaStreamStats,
  GetMeanVideoStats,
  GetMeanAudioStats,
  CreateTestReport,
  CreateConsoleDump: reporter.CreateConsoleDump
};