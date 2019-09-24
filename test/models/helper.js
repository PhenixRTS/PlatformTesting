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
import fs from 'fs';
import path from 'path';
import {ok} from 'assert';
import config from '../../config.js';
import Logger from '../../scripts/logger.js';
import {isNull} from 'util';

const logger = new Logger('Test');

function average(arr) {
  return arr.reduce((p, c) => p + c, 0) / arr.length;
}

module.exports = class Helper {
  constructor() {}

  async CollectMediaStreamStats() {
    logger.log('Collecting media stream stats...');

    let streamStatsTitle = '[Acceptance Testing] [Media Stream Stats] ';
    let logs = await t.getBrowserConsoleMessages();
    var collectedStats = {
      audio: {},
      video: {}
    };

    logs.info.forEach(el => {
      el = el.trim();

      if (!el.startsWith(streamStatsTitle)) {
        return;
      }

      el = el.replace(streamStatsTitle, '');

      let stat = JSON.parse(el);

      if (collectedStats[stat.mediaType][stat.ssrc] === undefined) {
        collectedStats[stat.mediaType][stat.ssrc] = [stat];
      } else {
        collectedStats[stat.mediaType][stat.ssrc].push(stat);
      }
    });

    return collectedStats;
  }

  async GetMeanVideoStats(stats) {
    var meanVideoStats = {
      downloadRate: null,
      mediaType: null,
      ssrc: null,
      direction: null,
      nativeReport: {},
      bitrateMean: null,
      targetDelay: null,
      currentDelay: null,
      droppedFrames: null,
      framerateMean: null,
      totalStatsReceived: 0,
      statsCaptureDuration: 0
    };
    var targetDelays = [];
    var currentDelays = [];

    Object.keys(stats.video).forEach((key) => {
      var videoStats = stats.video[key];
      meanVideoStats.totalStatsReceived += videoStats.length;

      videoStats.forEach((stat) => {
        targetDelays.push(stat.targetDelay);
        currentDelays.push(stat.currentDelay);

        if (meanVideoStats.mediaType === null) {
          meanVideoStats.mediaType = stat.mediaType;
          meanVideoStats.ssrc = stat.ssrc;
          meanVideoStats.direction = stat.direction;
        }

        meanVideoStats.downloadRate = stat.downloadRate;
        meanVideoStats.bitrateMean = stat.bitrateMean;
        meanVideoStats.framerateMean = stat.framerateMean;
        meanVideoStats.droppedFrames = stat.droppedFrames;
      });

      meanVideoStats.statsCaptureDuration =
        videoStats[videoStats.length - 1].nativeReport.timestamp - videoStats[0].nativeReport.timestamp;
    });

    meanVideoStats.targetDelay = average(targetDelays);
    meanVideoStats.currentDelay = average(currentDelays);

    return meanVideoStats;
  }

  async GetMeanAudioStats(stats) {
    var meanAudioStats = {
      downloadRate: null,
      mediaType: null,
      ssrc: null,
      direction: null,
      nativeReport: {},
      bitrateMean: null,
      currentDelay: null,
      audioOutputLevel: null,
      jitter: null,
      jitterBuffer: null,
      totalSamplesDuration: null,
      totalAudioEnergy: null,
      totalStatsReceived: 0,
      statsCaptureDuration: 0
    };
    var currentDelays = [];
    var audioOutputLevels = [];
    var jitters = [];
    var jitterBuffers = [];
    var totalSamplesDurations = [];
    var totalAudioEnergies = [];

    Object.keys(stats.audio).forEach((key) => {
      var audioStats = stats.audio[key];
      meanAudioStats.totalStatsReceived += audioStats.length;

      audioStats.forEach((stat) => {
        currentDelays.push(stat.currentDelay);
        audioOutputLevels.push(stat.audioOutputLevel);
        jitters.push(stat.jitter);
        jitterBuffers.push(stat.jitterBuffer);
        totalSamplesDurations.push(stat.totalSamplesDuration);
        totalAudioEnergies.push(stat.totalAudioEnergy);

        if (meanAudioStats.mediaType === null) {
          meanAudioStats.mediaType = stat.mediaType;
          meanAudioStats.ssrc = stat.ssrc;
          meanAudioStats.direction = stat.direction;
        }

        meanAudioStats.downloadRate = stat.downloadRate;
        meanAudioStats.bitrateMean = stat.bitrateMean;
      });

      meanAudioStats.statsCaptureDuration =
        audioStats[audioStats.length - 1].nativeReport.timestamp - audioStats[0].nativeReport.timestamp;
    });

    meanAudioStats.currentDelay = average(currentDelays);
    meanAudioStats.audioOutputLevel = average(audioOutputLevels);
    meanAudioStats.jitter = average(jitters);
    meanAudioStats.jitterBuffer = average(jitterBuffers);
    meanAudioStats.totalSamplesDuration = average(totalSamplesDurations);
    meanAudioStats.totalAudioEnergy = average(totalAudioEnergies);

    return meanAudioStats;
  }

  async assert(name, firstArg, secondArg, sign) {
    var assertionMsg = '';

    if (isNaN(firstArg) || isNaN(secondArg) || isNull(firstArg) || isNull(secondArg)) {
      console.log(`Did not assert '${name}' because there was no collected stats for it`);

      return;
    }

    switch (sign) {
      case 'eql':
        t.ctx.passed = firstArg === secondArg;
        assertionMsg = 'equal to';

        break;
      case 'gt':
        t.ctx.passed = firstArg > secondArg;
        assertionMsg = 'above';

        break;
      case 'gte':
        t.ctx.passed = firstArg >= secondArg;
        assertionMsg = 'greater or equal to';

        break;
      case 'lt':
        t.ctx.passed = firstArg < secondArg;
        assertionMsg = 'below';

        break;
      case 'lte':
        t.ctx.passed = firstArg <= secondArg;
        assertionMsg = 'less or equal to';

        break;
      default:
        return;
    }

    if (t.ctx.assertions === undefined) {
      t.ctx.assertions = [];
    }

    ok(t.ctx.passed, `${name} expected ${assertionMsg} ${secondArg} was ${firstArg}`);
    t.ctx.assertions.push(name);
  }

  async CreateTestReport(page) {
    const obj = await t.getBrowserConsoleMessages();

    return new Date() +
      '\n\nBrowser: ' + config.args.browser +
      '\n\nAssertions passed:\n' + JSON.stringify(t.ctx.assertions, undefined, 2) +
      '\n\nMean Video Stats:\n' + JSON.stringify(page.meanVideoStats, undefined, 2) +
      '\n\nMean Audio Stats:\n' + JSON.stringify(page.meanAudioStats, undefined, 2) +
      '\n\nConsole errors:\n' + JSON.stringify(obj.error, undefined, 2) +
      '\n\nAll Stats:\n' + JSON.stringify(page.stats, undefined, 2);
  }

  async CreateConsoleDump() {
    const obj = await t.getBrowserConsoleMessages();

    return new Date() +
      '\n\nERRORS:\n' + JSON.stringify(obj.error, undefined, 2) +
      '\n\nWARNINGS:\n' + JSON.stringify(obj.warn, undefined, 2) +
      '\n\nINFO:\n' + JSON.stringify(obj.info, undefined, 2) +
      '\n\nLOGS:\n' + JSON.stringify(obj.log, undefined, 2);
  }

  SaveToFile(fileName, filenamePrefix, content) {
    const dateNow = new Date();

    if (!fs.existsSync(config.reportsPath)){
      fs.mkdirSync(config.reportsPath);
    }

    fileName = path.join(
      config.reportsPath,
      `${filenamePrefix}-${path.basename(fileName).split('.')[0]}-${dateNow.getDate()}${dateNow.getTime()}.txt`
    );
    fs.writeFileSync(fileName, content);
  }
};