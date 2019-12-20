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
import math from '../math.js';

const logger = new Logger('Lag Test');

async function CollectMediaChanges() {
  logger.log('Collecting media changes...');

  const streamReceivedAtTitle = '[Acceptance Testing] [Subscriber Stream received] ';
  const subscriberVideoTitle = '[Acceptance Testing] [Subscriber Video] ';
  const subscriberAudioTitle = '[Acceptance Testing] [Subscriber Audio] ';
  const logs = await t.getBrowserConsoleMessages();
  const collectedStats = {
    streamReceivedAt: undefined,
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

    var title = '';
    title = el.startsWith(subscriberVideoTitle) ? subscriberVideoTitle : title;
    title = el.startsWith(subscriberAudioTitle) ? subscriberAudioTitle : title;

    if (title === '') {
      return;
    }

    el = el.replace(title, '');

    var stat = JSON.parse(el);
    stat.formatted_timestamp = moment(stat.timestamp).format('HH:mm:ss.SSS');

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

async function CreateTestReport(page) {
  const header = '\nSubscriber stream received at ' +
  `${moment(page.stats.streamReceivedAt).format('HH:mm:ss.SSS')} (${page.stats.streamReceivedAt})` +
  `\n\nAverage Sync: ${page.stats.averageSync} ms` +
  `\nMax Sync: ${page.stats.maxSync}`;
  const content = `\n\nVideo Stats:\n` + JSON.stringify(page.stats.video, undefined, 2) +
  `\n\nAudio Stats:\n` + JSON.stringify(page.stats.audio, undefined, 2);

  return reporter.CreateTestReport(page, header, content);
}

export default {
  CollectMediaChanges,
  CreateTestReport,
  CreateConsoleDump: reporter.CreateConsoleDump
};