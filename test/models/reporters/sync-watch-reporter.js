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

const logger = new Logger('Sync Watch Test');

async function CollectMediaChanges() {
  logger.log('Collecting media changes...');

  const streamOneReceivedAtTitle = '[Acceptance Testing] [Subscriber Stream One received] ';
  const subscriberOneVideoTitle = '[Acceptance Testing] [Subscriber One Video] ';
  const subscriberOneAudioTitle = '[Acceptance Testing] [Subscriber One Audio] ';
  const streamOneIdTitle = '[Acceptance Testing] [Stream One ID] ';
  const sessionOneIdTitle = '[Acceptance Testing] [Session One ID] ';

  const streamTwoReceivedAtTitle = '[Acceptance Testing] [Subscriber Stream Two received] ';
  const subscriberTwoVideoTitle = '[Acceptance Testing] [Subscriber Two Video] ';
  const subscriberTwoAudioTitle = '[Acceptance Testing] [Subscriber Two Audio] ';
  const streamTwoIdTitle = '[Acceptance Testing] [Stream Two ID] ';
  const sessionTwoIdTitle = '[Acceptance Testing] [Session Two ID] ';

  const logs = await t.getBrowserConsoleMessages();
  const collectedStats = {
    streamOneReceivedAt: undefined,
    streamTwoReceivedAt: undefined,
    streamOneId: undefined,
    streamTwoId: undefined,
    sessionOneId: undefined,
    sessionTwoId: undefined,
    averageVideoSync: undefined,
    averageAudioSync: undefined,
    maxVideoSync: undefined,
    maxAudioSync: undefined,
    subscriberOneVideo: [],
    subscriberOneAudio: [],
    subscriberTwoVideo: [],
    subscriberTwoAudio: []
  };
  let allVideoSyncs = [];
  let allAudioSyncs = [];
  let maxVideoSync = 0;
  let maxAudioSync = 0;

  logs.info.forEach(el => {
    el = el.trim();

    if (el.startsWith(streamOneReceivedAtTitle)) {
      collectedStats.streamOneReceivedAt = parseInt(el.replace(streamOneReceivedAtTitle, ''));

      return;
    }

    if (el.startsWith(streamTwoReceivedAtTitle)) {
      collectedStats.streamTwoReceivedAt = parseInt(el.replace(streamTwoReceivedAtTitle, ''));

      return;
    }

    if (el.startsWith(streamOneIdTitle)) {
      const streamId = el.replace(streamOneIdTitle, '');
      logger.log(`For stream one [${streamId} ]`);
      collectedStats.streamOneId = streamId;

      return;
    }

    if (el.startsWith(streamTwoIdTitle)) {
      const streamId = el.replace(streamTwoIdTitle, '');
      logger.log(`For stream two [${streamId} ]`);
      collectedStats.streamTwoId = streamId;

      return;
    }

    if (el.startsWith(sessionOneIdTitle)) {
      const sessionId = el.replace(sessionOneIdTitle, '');
      logger.log(`For session [${sessionId}]`);
      collectedStats.sessionOneId = sessionId;
    }

    if (el.startsWith(sessionTwoIdTitle)) {
      const sessionId = el.replace(sessionTwoIdTitle, '');
      logger.log(`For session [${sessionId}]`);
      collectedStats.sessionTwoId = sessionId;
    }

    var title = '';
    title = el.startsWith(subscriberOneVideoTitle) ? subscriberOneVideoTitle : title;
    title = el.startsWith(subscriberOneAudioTitle) ? subscriberOneAudioTitle : title;
    title = el.startsWith(subscriberTwoVideoTitle) ? subscriberTwoVideoTitle : title;
    title = el.startsWith(subscriberTwoAudioTitle) ? subscriberTwoAudioTitle : title;

    if (title === '') {
      return;
    }

    el = el.replace(title, '');

    var stat = JSON.parse(el);
    stat.formattedTimestamp = moment(stat.timestamp).format('HH:mm:ss.SSS');

    switch (title) {
      case subscriberOneVideoTitle:
        stat.videoSyncWithOtherSubscriber = undefined;
        stat.videoClosestOtherSubscriberTimestamp = undefined;
        collectedStats.subscriberOneVideo.push(stat);

        break;
      case subscriberTwoVideoTitle:
        collectedStats.subscriberTwoVideo.push(stat);

        break;
      case subscriberOneAudioTitle:
        stat.audioSyncWithOtherSubscriber = undefined;
        stat.audioClosestOtherSubscriberTimestamp = undefined;
        collectedStats.subscriberOneAudio.push(stat);

        break;
      case subscriberTwoAudioTitle:
        collectedStats.subscriberTwoAudio.push(stat);

        break;
      default:
        return;
    }
  });

  collectedStats.subscriberOneVideo.forEach(videoEl => {
    let closest = ClosestElement(videoEl.timestamp, collectedStats.subscriberTwoVideo);

    if (closest !== undefined) {
      videoEl.videoSyncWithOtherSubscriber = Math.abs(videoEl.timestamp - closest.timestamp);
      videoEl.videoClosestOtherSubscriberTimestamp = moment(closest.timestamp).format('HH:mm:ss.SSS');
      allVideoSyncs.push(videoEl.videoSyncWithOtherSubscriber);
      maxVideoSync = videoEl.videoSyncWithOtherSubscriber > maxVideoSync ? videoEl.videoSyncWithOtherSubscriber : maxVideoSync;
    }
  });

  collectedStats.subscriberOneAudio.forEach(audioEl => {
    let closest = ClosestElement(audioEl.timestamp, collectedStats.subscriberTwoAudio);

    if (closest !== undefined) {
      audioEl.audioSyncWithOtherSubscriber = Math.abs(audioEl.timestamp - closest.timestamp);
      audioEl.audioClosestOtherSubscriberTimestamp = moment(closest.timestamp).format('HH:mm:ss.SSS');
      allAudioSyncs.push(audioEl.audioSyncWithOtherSubscriber);
      maxAudioSync = audioEl.audioSyncWithOtherSubscriber > maxAudioSync ? audioEl.audioSyncWithOtherSubscriber : maxAudioSync;
    }
  });

  collectedStats.averageVideoSync = math.average(allVideoSyncs).toFixed(2);
  collectedStats.maxVideoSync = maxVideoSync;

  collectedStats.averageAudioSync = math.average(allAudioSyncs).toFixed(2);
  collectedStats.maxAudioSync = maxAudioSync;

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
        name: 'subscriber_one_stream_received_at',
        valueFormatted: moment(page.stats.streamOneReceivedAt).format('HH:mm:ss.SSS'),
        value: page.stats.streamOneReceivedAt
      },
      {
        name: 'subscriber_two_stream_received_at',
        valueFormatted: moment(page.stats.streamTwoReceivedAt).format('HH:mm:ss.SSS'),
        value: page.stats.streamTwoReceivedAt
      },
      {
        name: 'average_video_sync',
        value: page.stats.averageVideoSync,
        units: 'milliseconds'
      },
      {
        name: 'average_audio_sync',
        value: page.stats.averageAudioSync,
        units: 'milliseconds'
      },
      {
        name: 'max_video_sync',
        value: page.stats.maxVideoSync,
        units: 'milliseconds'
      },
      {
        name: 'max_audio_sync',
        value: page.stats.maxAudioSync,
        units: 'milliseconds'
      }
    ];

    content = {
      subscriberOneVideo: page.stats.subscriberOneVideo,
      subscriberTwoVideo: page.stats.subscriberTwoVideo,
      subscriberOneAudio: page.stats.subscriberOneAudio,
      subscriberTwoAudio: page.stats.subscriberTwoAudio
    };

    if (channel && channel.channelId) {
      const {applicationId, channelId, streamKey, created} = channel;

      additionalInfo = {
        applicationId: applicationId,
        channelId: channelId,
        streamKey: streamKey,
        created: created
      };
    }
  } else {
    header = '\nSubscriber One stream received at ' +
    `${moment(page.stats.streamReceivedAt).format('HH:mm:ss.SSS')} (${page.stats.streamOneReceivedAt})` +
    '\nSubscriber Two stream received at ' +
    `${moment(page.stats.streamReceivedAt).format('HH:mm:ss.SSS')} (${page.stats.streamTwoReceivedAt})` +
    `\n\nAverage Video Sync: ${page.stats.averageVideoSync} ms` +
    `\n\nAverage Audio Sync: ${page.stats.averageAudioSync} ms` +
    `\nMax Video Sync: ${page.stats.maxVideoSync}` +
    `\nMax Audio Sync: ${page.stats.maxAudioSync}`;

    content = `\n\nSubscriber One Video Stats:\n` + JSON.stringify(page.stats.subscriberOneVideo, undefined, 2) +
    `\n\nSubscriber Two Video Stats:\n` + JSON.stringify(page.stats.subscriberTwoVideo, undefined, 2) +
    `\n\nSubscriber One Audio Stats:\n` + JSON.stringify(page.stats.subscriberOneAudio, undefined, 2) +
    `\n\nSubscriber Two Audio Stats:\n` + JSON.stringify(page.stats.subscriberTwoAudio, undefined, 2);

    if (channel && channel.channelId) {
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