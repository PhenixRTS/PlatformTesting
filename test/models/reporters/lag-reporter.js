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
import Logger from '../../../scripts/logger.js';
import reporter from './common-reporter.js';
import moment from 'moment';

const logger = new Logger('Lag Test');

async function CollectMediaChanges() {
  logger.log('Collecting media changes...');

  const streamReceivedAtTitle = '[Acceptance Testing] [Subscriber Stream received] ';
  const publisherVideoTitle = '[Acceptance Testing] [Publisher Video] ';
  const publisherAudioTitle = '[Acceptance Testing] [Publisher Audio] ';
  const subscriberVideoTitle = '[Acceptance Testing] [Subscriber Video] ';
  const subscriberAudioTitle = '[Acceptance Testing] [Subscriber Audio] ';
  const logs = await t.getBrowserConsoleMessages();
  const collectedStats = {
    streamReceivedAt: undefined,
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
    stat.formatted_timestamp = moment(stat.timestamp).format('HH:mm:ss.SSS');

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

async function CreateTestReport(page) {
  const header = '\nSubscriber stream received at ' + `${moment(page.stats.streamReceivedAt).format('HH:mm:ss.SSS')} (${page.stats.streamReceivedAt})`;
  const content = `\n\nVideo Stats:\n` + (page.stats.length > 0 ? JSON.stringify(page.stats['subscriber']['video'], undefined, 2) : '') +
  `\n\nAudio Stats:\n` + (page.stats.length > 0 ? JSON.stringify(page.stats['subscriber']['audio'], undefined, 2) : '');

  return reporter.CreateTestReport(page, header, content);
}

export default {
  CollectMediaChanges,
  CreateTestReport,
  CreateConsoleDump: reporter.CreateConsoleDump
};