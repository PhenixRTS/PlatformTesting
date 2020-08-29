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
import moment from 'moment';
import math from '../math.js';
import config from '../../../config.js';

const logger = new Logger('Sync Test');

async function CollectMediaChanges() {
  logger.log('Collecting media changes...');

  const streamReceivedAtTitle = '[Acceptance Testing] [Subscriber Stream received] ';
  const subscriberVideoTitle = '[Acceptance Testing] [Subscriber Video] ';
  const subscriberAudioTitle = '[Acceptance Testing] [Subscriber Audio] ';
  const streamIdTitle = '[Acceptance Testing] [Stream ID] ';
  const sessionIdTitle = '[Acceptance Testing] [Session ID] ';
  const logs = await t.getBrowserConsoleMessages();
  const collectedStats = {
    streamReceivedAt: undefined,
    streamId: undefined,
    sessionId: undefined,
    averageSync: undefined,
    maxSync: undefined,
    video: [],
    audio: []
  };
  let allSyncs = [];
  let maxSync = 0;

  logs.info.forEach(el => {
    el = el.trim();

    if (el.startsWith(streamReceivedAtTitle)) {
      collectedStats.streamReceivedAt = parseInt(el.replace(streamReceivedAtTitle, ''));

      return;
    }

    if (el.startsWith(streamIdTitle)) {
      const streamId = el.replace(streamIdTitle, '');
      logger.log(`For stream [${streamId} ]`);
      collectedStats.streamId = streamId;

      return;
    }

    if (el.startsWith(sessionIdTitle)) {
      const sessionId = el.replace(sessionIdTitle, '');
      logger.log(`For session [${sessionId}]`);
      collectedStats.sessionId = sessionId;
    }

    var title = '';
    title = el.startsWith(subscriberVideoTitle) ? subscriberVideoTitle : title;
    title = el.startsWith(subscriberAudioTitle) ? subscriberAudioTitle : title;

    if (title === '') {
      return;
    }

    el = el.replace(title, '');

    var stat = JSON.parse(el);
    stat.formattedTimestamp = moment(stat.timestamp).format('HH:mm:ss.SSS');

    switch (title) {
      case subscriberVideoTitle:
        stat.syncWithAudio = undefined;
        stat.closestAudioTimestamp = undefined;
        collectedStats.video.push(stat);

        break;
      case subscriberAudioTitle:
        collectedStats.audio.push(stat);

        break;
      default:
        return;
    }
  });

  collectedStats.video.forEach(videoEl => {
    let closest = ClosestElement(videoEl.timestamp, collectedStats.audio);

    if (closest !== undefined) {
      videoEl.syncWithAudio = Math.abs(videoEl.timestamp - closest.timestamp);
      videoEl.closestAudioTimestamp = moment(closest.timestamp).format('HH:mm:ss.SSS');
      allSyncs.push(videoEl.syncWithAudio);
      maxSync = videoEl.syncWithAudio > maxSync ? videoEl.syncWithAudio : maxSync;
    }
  });

  collectedStats.averageSync = math.average(allSyncs).toFixed(2);
  collectedStats.maxSync = maxSync;

  return collectedStats;
}

function ClosestElement(number, arr){
  var minDiff = 1000;
  var closest;

  arr.forEach(el => {
    var m = Math.abs(number - el.timestamp);

    if (m < minDiff) {
      minDiff = m;
      closest = el;
    }
  });

  return closest;
}

async function CreateTestReport(testController, page, channel = {}) {
  let header = {};
  let content = {};
  let additionalInfo = '';

  if (config.args.reportFormat === 'json') {
    header = [
      {
        name: 'subscriber_stream_received_at',
        valueFormatted: moment(page.stats.streamReceivedAt).format('HH:mm:ss.SSS'),
        value: page.stats.streamReceivedAt
      },
      {
        name: 'average_sync',
        value: page.stats.averageSync,
        units: 'milliseconds'
      },
      {
        name: 'max_sync',
        value: page.stats.maxSync,
        units: 'milliseconds'
      }
    ];

    content = {
      videoStats: page.stats.video,
      audioStats: page.stats.audio
    };

    if (channel.channelId) {
      const {applicationId, channelId, streamKey, created} = channel;

      additionalInfo = {
        applicationId: applicationId,
        channelId: channelId,
        streamKey: streamKey,
        created: created
      };
    }
  } else {
    header = '\nSubscriber stream received at ' +
    `${moment(page.stats.streamReceivedAt).format('HH:mm:ss.SSS')} (${page.stats.streamReceivedAt})` +
    `\n\nAverage Sync: ${page.stats.averageSync} ms` +
    `\nMax Sync: ${page.stats.maxSync}`;

    content = `\n\nVideo Stats:\n` + JSON.stringify(page.stats.video, undefined, 2) +
    `\n\nAudio Stats:\n` + JSON.stringify(page.stats.audio, undefined, 2);

    if (channel.channelId) {
      const {applicationId, channelId, streamKey, created} = channel;

      additionalInfo = `\n\nApplication ID: ${applicationId}\nChannel ID: ${channelId}\nStream Key: ${streamKey}\nCreated: ${created}\n`;
    }
  }

  return reporter.CreateTestReport(testController, page, header, content, additionalInfo);
}

// eslint-disable-next-line no-unused-vars
function GenerateTelemetryRecords(page) {
  // TODO: - Implement this
  return [];
}

export default {
  CollectMediaChanges,
  CreateTestReport,
  CreateConsoleDump: reporter.CreateConsoleDump,
  GenerateTelemetryRecords
};