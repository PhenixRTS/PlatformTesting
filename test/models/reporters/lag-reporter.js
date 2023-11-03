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
import config from '../../../config.js';

const logger = new Logger('Lag Test');

async function CollectMediaChanges() {
  logger.log('Collecting media changes...');

  const streamReceivedAtTitle = '[Acceptance Testing] [Subscriber Stream received] ';
  const publisherVideoTitle = '[Acceptance Testing] [Publisher Video] ';
  const publisherAudioTitle = '[Acceptance Testing] [Publisher Audio] ';
  const subscriberVideoTitle = '[Acceptance Testing] [Subscriber Video] ';
  const subscriberAudioTitle = '[Acceptance Testing] [Subscriber Audio] ';
  const streamIdTitle = '[Acceptance Testing] [Stream ID] ';
  const sessionIdTitle = '[Acceptance Testing] [Session ID] ';
  const logs = await t.getBrowserConsoleMessages();
  const collectedStats = {
    streamReceivedAt: undefined,
    streamId: undefined,
    sessionId: undefined,
    framerateMin: undefined,
    framerateMax: undefined,
    publisher: {
      video: [],
      audio: []
    },
    subscriber: {
      video: [],
      audio: []
    }
  };

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

    collectedStats.framerateMin = reporter.ExtractFramerate('min', collectedStats.framerateMin, el);
    collectedStats.framerateMax = reporter.ExtractFramerate('max', collectedStats.framerateMax, el);

    if (el.startsWith(sessionIdTitle)) {
      const sessionId = el.replace(sessionIdTitle, '');
      logger.log(`For session [${sessionId}]`);
      collectedStats.sessionId = sessionId;
    }

    var title = '';
    title = el.startsWith(publisherVideoTitle) ? publisherVideoTitle : title;
    title = el.startsWith(publisherAudioTitle) ? publisherAudioTitle : title;
    title = el.startsWith(subscriberVideoTitle) ? subscriberVideoTitle : title;
    title = el.startsWith(subscriberAudioTitle) ? subscriberAudioTitle : title;

    if (title === '') {
      return;
    }

    el = el.replace(title, '');

    const stat = JSON.parse(el);
    stat.formattedTimestamp = moment(stat.timestamp).format('HH:mm:ss.SSS');

    switch (title) {
      case publisherVideoTitle:
        collectedStats['publisher']['video'].push(stat);

        break;
      case publisherAudioTitle:
        collectedStats['publisher']['audio'].push(stat);

        break;
      case subscriberVideoTitle:
        collectedStats['subscriber']['video'].push(stat);

        break;
      case subscriberAudioTitle:
        collectedStats['subscriber']['audio'].push(stat);

        break;
      default:
        return;
    }
  });

  return collectedStats;
}

async function CreateTestReport(testController, page, channel = {}) {
  let header = {};
  let content = {};
  let additionalInfo = '';

  if (config.args.reportFormat === 'json') {
    header = {
      name: 'subscriber_stream_received_at',
      valueFormatted: moment(page.stats.streamReceivedAt).format('HH:mm:ss.SSS'),
      value: page.stats.streamReceivedAt
    };

    content = {
      videoStats: page.stats.subscriber.video,
      audioStats: page.stats.subscriber.audio
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
    header =
      '\nSubscriber stream received at ' +
      `${moment(page.stats.streamReceivedAt).format('HH:mm:ss.SSS')} (${
        page.stats.streamReceivedAt
      })`;

    let videoStats = '';
    let audioStats = '';

    if (page.stats.subscriber !== undefined) {
      videoStats = JSON.stringify(page.stats.subscriber.video, undefined, 2);
      audioStats = JSON.stringify(page.stats.subscriber.audio, undefined, 2);
    }

    content =
      `\n\nVideo Stats:\n` + videoStats +
      `\n\nAudio Stats:\n` + audioStats;

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