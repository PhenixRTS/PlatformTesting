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

import {ok} from 'assert';
import {ClientFunction} from 'testcafe';

import path from 'path';
import config from '../../config';
import persistence from '../models/persistence.js';
import reporter from '../models/reporters/lag-reporter.js';

const pcastApi = require('../models/pcastApi.js');
const rtmpPush = require('../models/rtmp-push.js');
const getUA = ClientFunction(() => navigator.userAgent);
const subscribeFromClient = ClientFunction(() => subscribe());

const waitForPublisher = channelId =>
  new Promise(resolve => {
    const statusInterval = setInterval(() => {
      pcastApi.getChannelState(channelId).then(publisherCount => {
        if (publisherCount === 0) {
          return;
        }

        clearInterval(statusInterval);

        setTimeout(() => {
          pcastApi.getChannelState(channelId).then(pCount => {
            resolve(pCount);
          });
        }, config.args.publisherWaitTime);
      });
    }, 1000);
  });

const initRtmpPush = async(testType) => {
  const {channelAlias, args} = config;
  const {rtmpPushFile, region, capabilities} = args;
  const channel = await pcastApi.createChannel(channelAlias);
  ok(channel !== undefined, 'Could not create channel for RTMP Push');

  rtmpPush.startRtmpPush(testType, rtmpPushFile, region, channel, capabilities);

  return channel;
};

const finishAndReport = async(testFile, testFailed, page, tc, createdChannel = {}) => {
  const {saveConsoleLogs} = config.args;
  let reportFileName = `${path.basename(testFile).split('.')[0]}`;

  if (createdChannel.channelId !== undefined) {
    const {channelId} = createdChannel;

    rtmpPush.stopRtmpPush();
    await pcastApi.deleteChannel(channelId);

    reportFileName = `${reportFileName}-rtmp`;
    console.log(`Stopped RTMP Push and deleted created channel with id ${channelId}`);
  }

  const status = testFailed ? 'FAIL' : 'PASS';
  const report = await reporter.CreateTestReport(tc, page, createdChannel);

  persistence.saveToFile(reportFileName, status, report);

  if (saveConsoleLogs === 'true') {
    const consoleDump = await reporter.CreateConsoleDump(tc);

    persistence.saveToFile(`${page.browser.name}-console-logs`, '', consoleDump);
  }
};

module.exports = {
  finishAndReport,
  getUA,
  initRtmpPush,
  subscribeFromClient,
  waitForPublisher
};