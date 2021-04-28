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
import config from '../../../config.js';
import moment from 'moment';

const _ = require('lodash');
const packageJSON = require('../../../package.json');
const logger = new Logger('Quality Test');

let pageLoaded = Date.now();

async function CollectMediaStreamStats() {
  logger.log('Collecting media stream stats...');

  const streamStatsTitle = '[Acceptance Testing] [Media Stream Stats] ';
  const urlLoadedTitle = '[Acceptance Testing] [Url loaded] ';
  const streamReceivedTitle = '[Acceptance Testing] [Stream received] ';
  const streamIdTitle = '[Acceptance Testing] [Stream ID] ';
  const channelIdTitle = '[Acceptance Testing] [Channel ID] ';
  const sessionIdTitle = '[Acceptance Testing] [Session ID] ';
  const channelTypeTitle = '[Acceptance Testing] [Channel Type] ';
  const logs = await t.getBrowserConsoleMessages();

  const streamStats = {
    loadedAt: undefined,
    channelType: undefined,
    streamId: undefined,
    sessionId: undefined,
    channelId: undefined,
    streamReceivedAt: undefined,
    audio: {},
    video: {}
  };

  let testStats = {};

  logs.info.forEach(infoLogElement => {
    infoLogElement = infoLogElement.trim();

    if (infoLogElement.startsWith(urlLoadedTitle)) {
      infoLogElement = infoLogElement.replace(urlLoadedTitle, '');
      pageLoaded = JSON.parse(infoLogElement);

      return;
    }

    if (!streamStats.streamId && infoLogElement.startsWith(streamIdTitle)) {
      const streamId = infoLogElement.replace(streamIdTitle, '');
      logger.log(`For stream [${streamId}]`);
      streamStats.streamId = streamId;

      return;
    }

    if (!streamStats.sessionId && infoLogElement.startsWith(sessionIdTitle)) {
      const sessionId = infoLogElement.replace(sessionIdTitle, '');
      logger.log(`For session [${sessionId}]`);
      streamStats.sessionId = sessionId;

      return;
    }

    if (!streamStats.channelId && infoLogElement.startsWith(channelIdTitle)) {
      const channelId = infoLogElement.replace(channelIdTitle, '');
      logger.log(`For channel with id [${channelId}]`);
      streamStats.channelId = channelId;

      return;
    }

    if (!streamStats.channelType && infoLogElement.startsWith(channelTypeTitle)) {
      const channelType = infoLogElement.replace(channelTypeTitle, '');
      logger.log(`For channel type [${channelType}]`);
      streamStats.channelType = channelType;

      return;
    }

    if (
      !infoLogElement.startsWith(streamReceivedTitle) &&
      !infoLogElement.startsWith(streamStatsTitle)
    ) {
      return;
    }

    const matches = infoLogElement.match(/\[memberID:(.*?)\]/);
    let memberID = '';

    if (matches) {
      memberID = matches[1];

      infoLogElement = infoLogElement.replace(matches[0], '');
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

    if (testStats[memberID].sessionId === undefined && streamStats.sessionId !== undefined){
      testStats[memberID].sessionId = streamStats.sessionId;
    }

    if (testStats[memberID].streamId === undefined && streamStats.streamId !== undefined){
      testStats[memberID].streamId = streamStats.streamId;
    }

    const collectedStats = testStats[memberID];

    if (infoLogElement.startsWith(streamReceivedTitle)) {
      infoLogElement = infoLogElement.replace(streamReceivedTitle, '');
      collectedStats.streamReceivedAt = JSON.parse(infoLogElement);

      return;
    }

    if (infoLogElement.startsWith(streamIdTitle)) {
      infoLogElement = infoLogElement.replace(streamIdTitle, '');
      logger.log(`For stream [${infoLogElement} ]`);
      collectedStats.streamId = infoLogElement;

      return;
    }

    infoLogElement = infoLogElement.replace(streamStatsTitle, '');

    const stats = JSON.parse(infoLogElement);

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
    maxBitrate: null,
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

      if (stat.nativeReport) {
        // SDK v1
        frameWidths.push(parseInt(stat.nativeReport.googFrameWidthReceived));
        frameHeights.push(parseInt(stat.nativeReport.googFrameHeightReceived));
        frameRateDecodes.push(parseInt(stat.nativeReport.googFrameRateDecoded));
        frameRateOutputs.push(parseInt(stat.nativeReport.googFrameRateOutput));

        meanVideoStats.interframeDelayMax = parseFloat(stat.nativeReport.googInterframeDelayMax > meanVideoStats.interframeDelayMax ? stat.nativeReport.googInterframeDelayMax : meanVideoStats.interframeDelayMax);
        meanVideoStats.freezesDetected += bytesReceived.includes(stat.nativeReport.bytesReceived) ? 1 : 0;
        bytesReceived.push(stat.nativeReport.bytesReceived);
        allInterframeDelayMaxs.push({
          delay: stat.nativeReport.googInterframeDelayMax,
          timestamp
        });
      } else {
        // SDK v2
        frameWidths.push(parseInt(stat.frameWidth));
        frameHeights.push(parseInt(stat.frameHeight));
        frameRateDecodes.push(parseInt(stat.framesDecoded));
        frameRateOutputs.push(parseInt(stat.framesPerSecond));

        meanVideoStats.interframeDelayMax = parseFloat(stat.totalInterFrameDelay > meanVideoStats.totalInterFrameDelay ? stat.totalInterFrameDelay : meanVideoStats.interframeDelayMax);
        meanVideoStats.freezesDetected += bytesReceived.includes(stat.bytesReceived) ? 1 : 0;
        bytesReceived.push(stat.bytesReceived);
        allInterframeDelayMaxs.push({
          delay: stat.totalInterFrameDelay,
          timestamp
        });
      }

      if (meanVideoStats.mediaType === null) {
        meanVideoStats.mediaType = stat.mediaType;
        meanVideoStats.ssrc = stat.ssrc;
        meanVideoStats.direction = stat.direction;
      }

      if (meanVideoStats.codecName === null || meanVideoStats.codecName === '') {
        meanVideoStats.codecName = stat.nativeReport ? stat.nativeReport.googCodecName : stat.codecId;
      }

      meanVideoStats.maxBitrate = parseFloat(((stat.bitrateMean > meanVideoStats.maxBitrate ? stat.bitrateMean : meanVideoStats.maxBitrate) / 1024).toFixed(2));
      meanVideoStats.maxDelay = stat.currentDelay > meanVideoStats.maxDelay ? stat.currentDelay : meanVideoStats.maxDelay;
      meanVideoStats.downloadRate = stat.downloadRate;
      meanVideoStats.droppedFrames += stat.droppedFrames;
      meanVideoStats.nativeReport = stat.nativeReport;

      if (stat.framerateMean === 0 && index === 0) {
        return;
      }

      framerateMeans.push({
        framerate: Number(stat.framerateMean ? stat.framerateMean.toFixed(0) : stat.framesPerSecond),
        timestamp
      });
    });

    if (videoStats[0].stat.nativeReport) {
      // SDK v1
      meanVideoStats.statsCaptureDuration =
        videoStats[videoStats.length - 1].stat.nativeReport.timestamp - videoStats[0].stat.nativeReport.timestamp;
    } else {
      // SDK v2
      meanVideoStats.statsCaptureDuration =
        videoStats[videoStats.length - 1].stat.timestamp - videoStats[0].stat.timestamp;
    }
  });

  meanVideoStats.targetDelay = parseFloat(math.average(targetDelays).toFixed(2));
  meanVideoStats.currentDelay = parseFloat(math.average(currentDelays).toFixed(2));
  meanVideoStats.bitrateMean = parseFloat((math.average(meanBitrates) / 1024).toFixed(2));
  meanVideoStats.avgFrameWidth = math.average(frameWidths.slice(3));
  meanVideoStats.avgFrameHeight = math.average(frameHeights.slice(3));
  meanVideoStats.avgFrameRateDecoded = parseFloat(math.average(frameRateDecodes).toFixed(1));
  meanVideoStats.avgFrameRateOutput = parseFloat(math.average(frameRateOutputs).toFixed(1));
  meanVideoStats.interframeDelaysPerMinute = math.chunk(allInterframeDelayMaxs, 60);
  meanVideoStats.framerateMeansPerMinute = math.chunk(framerateMeans, 60);
  meanVideoStats.framerateMean =
    framerateMeans.reduce((p, c) => p + (c.framerate || 0), 0) /
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
    maxBitrate: null,
    currentDelay: null,
    audioOutputLevel: null,
    jitter: null,
    jitterBuffer: null,
    totalSamplesDuration: null,
    totalAudioEnergy: null,
    totalStatsReceived: 0,
    statsCaptureDuration: 0,
    delaysPerMinute: []
  };
  const currentDelays = [];
  const audioOutputLevels = [];
  const jitters = [];
  const meanBitrates = [];
  const jitterBuffers = [];
  const totalAudioEnergies = [];
  const allDelays = [];
  let totalSamplesDurationsSum = 0;

  Object.keys(stats.audio).forEach((key) => {
    const audioStats = stats.audio[key];
    meanAudioStats.totalStatsReceived += audioStats.length;

    audioStats.forEach(statData => {
      const {stat, timestamp} = statData;

      currentDelays.push(stat.currentDelay);
      audioOutputLevels.push(stat.audioOutputLevel);
      jitters.push(stat.jitter);
      jitterBuffers.push(stat.jitterBuffer);
      totalSamplesDurationsSum += stat.totalSamplesDuration;
      totalAudioEnergies.push(stat.totalAudioEnergy);
      meanBitrates.push(stat.bitrateMean);

      if (meanAudioStats.mediaType === null) {
        meanAudioStats.mediaType = stat.mediaType;
        meanAudioStats.ssrc = stat.ssrc;
        meanAudioStats.direction = stat.direction;
      }

      if (meanAudioStats.codecName === null || meanAudioStats.codecName === '') {
        meanAudioStats.codecName = stat.nativeReport ? stat.nativeReport.googCodecName : stat.codecId;
      }

      meanAudioStats.downloadRate = stat.downloadRate;
      meanAudioStats.maxBitrate = parseFloat(((stat.bitrateMean > meanAudioStats.maxBitrate ? stat.bitrateMean : meanAudioStats.maxBitrate) / 1024).toFixed(2));
      meanAudioStats.nativeReport = stat.nativeReport;
      allDelays.push({
        delay: stat.currentDelay,
        timestamp
      });
    });

    if (audioStats[0].stat.nativeReport) {
      // SDK v1
      meanAudioStats.statsCaptureDuration =
        audioStats[audioStats.length - 1].stat.nativeReport.timestamp - audioStats[0].stat.nativeReport.timestamp;
    } else {
      // SDK v2
      meanAudioStats.statsCaptureDuration =
        audioStats[audioStats.length - 1].stat.timestamp - audioStats[0].stat.timestamp;
    }
  });

  meanAudioStats.currentDelay = math.average(currentDelays);
  meanAudioStats.audioOutputLevel = math.average(audioOutputLevels);
  meanAudioStats.jitter = math.average(jitters);
  meanAudioStats.jitterBuffer = math.average(jitterBuffers);
  meanAudioStats.totalSamplesDuration = totalSamplesDurationsSum;
  meanAudioStats.totalAudioEnergy = math.average(totalAudioEnergies);
  meanAudioStats.delaysPerMinute = math.chunk(allDelays, 60);
  meanAudioStats.bitrateMean = parseFloat((math.average(meanBitrates) / 1024).toFixed(2));

  return meanAudioStats;
}

async function CreateTestReport(testController, page) {
  let header = {};
  let content = {};
  let additionalInfo = '';

  let members = 0;

  for (const memberID in page.stats) {
    const {loadedAt, meanAudioStats, meanVideoStats, streamReceivedAt} = page.stats[memberID];

    members++;

    if (config.args.reportFormat === 'json') {
      header[memberID] = {
        otherStats: [
          {
            name: 'PTTFF',
            value: streamReceivedAt - loadedAt,
            units: 'milliseconds'
          },
          {
            name: 'InterframeMaxDelay',
            value: meanVideoStats.interframeDelayMax,
            units: 'milliseconds'
          }
        ],
        aggregateStats: {
          video: meanVideoStats,
          audio: meanAudioStats
        }
      };

      additionalInfo = members > 1 ? {members_in_room: members} : '';
    } else {
      header[memberID] = '\nPTTFF (page load to first frame): ' +
        JSON.stringify(streamReceivedAt - loadedAt, undefined, 2) +
        ' ms' +
        '\nInterframe Max delay: ' + meanVideoStats.interframeDelayMax;

      content[memberID] = '\n\nMean Video Stats:\n' +
        JSON.stringify(meanVideoStats, undefined, 2) +
        '\n\nMean Audio Stats:\n' +
        JSON.stringify(meanAudioStats, undefined, 2);

      additionalInfo = members > 1 ? `\nMembers in the room: ${members}` : '';
    }
  }

  return reporter.CreateTestReport(testController, page, header, content, additionalInfo);
}

function CreateTelemetryRecord(page, timeNow, metric, floatValue) {
  return {
    timestamp: moment().format(config.args.dateFormat),
    tenancy: page.stats.channelId,
    sessionId: page.stats.default ? page.stats.default.sessionId : null,
    streamId: page.stats.default ? page.stats.default.streamId : null,
    source: config.args.telemetrySource,
    resource: 'quality',
    kind: page.stats.default ? page.stats.default.channelType : null,
    metric: metric,
    value: {
      float: floatValue,
      string: page.stats.default ? page.stats.default.channelId : null
    },
    elapsed: moment.duration(config.args.testRuntimeMs).asMilliseconds(),
    fullQualifiedName: `${config.backendUri}/channel/#${config.channelAlias}`,
    tool: 'PlatformTesting',
    toolVersion: packageJSON.version,
    runtime: moment.duration(timeNow - config.args.startTimestamp).asSeconds()
  };
}

function GenerateTelemetryRecords(page, assertions) {
  logger.log('Generating telemetry records...');

  const timeNow = new Date();
  let telemetry = [];

  if (page.stats.default === undefined) {
    // Case no stream/publisher
    telemetry.push(CreateTelemetryRecord(page, timeNow, 'Downtime', null));
    telemetry.push(CreateTelemetryRecord(page, timeNow, 'Healthy', null));
  } else if (_.isNaN(page.stats.default.meanVideoStats.framerateMean)) {
    // Case no video
    telemetry.push(CreateTelemetryRecord(page, timeNow, 'Downtime', null));
    telemetry.push(CreateTelemetryRecord(page, timeNow, 'Healthy', null));
  } else if (assertions.default.failed.length === 0) {
    telemetry.push(CreateTelemetryRecord(page, timeNow, 'Uptime', null));
    telemetry.push(CreateTelemetryRecord(page, timeNow, 'Healthy', null));
  } else if (assertions.default.passed.length >= 0) {
    telemetry.push(CreateTelemetryRecord(page, timeNow, 'Uptime', null));

    const percentageOfPassingAssertions = assertions.default.passed.length / (assertions.default.passed.length + assertions.default.failed.length);
    telemetry.push(CreateTelemetryRecord(page, timeNow, 'Unhealthy', percentageOfPassingAssertions));
  }

  logger.log(`Generated [${telemetry.length}] telemetry records`);

  return telemetry;
}

export default {
  CollectMediaStreamStats,
  GetMeanVideoStats,
  GetMeanAudioStats,
  CreateTestReport,
  CreateConsoleDump: reporter.CreateConsoleDump,
  GenerateTelemetryRecords
};