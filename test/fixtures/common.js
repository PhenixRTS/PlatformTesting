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

import moment from 'moment';
import path from 'path';
import config from '../../config';
import persistence from '../models/persistence.js';
import commonReporter from '../models/reporters/common-reporter';
import reporter from '../models/reporters/lag-reporter.js';

const pcastApi = require('../models/pcastApi.js');
const rtmpPush = require('../models/rtmp-push.js');
const subscribeFromClient = ClientFunction(() => window.subscribe());

const validateScreenColor = ClientFunction((target, tolerance, canvasID) => {
  if (canvasID === 'videoCanvasImg') {
    const videoEl = document.getElementById('videoEl');

    document
      .getElementById(canvasID)
      .getContext('2d')
      .drawImage(videoEl, 0, 0, 500, 500);
  }

  const subscriberCanvasCtx = document
    .getElementById(canvasID)
    .getContext('2d');

  let match = 0;

  for (let i = 0; i < 100; i++) {
    const left = Math.floor(Math.random() * (500 - 1)) + 1;
    const top = Math.floor(Math.random() * (500 - 1)) + 1;

    const imgData = subscriberCanvasCtx.getImageData(left, top, 1, 1).data;
    const actual = {
      r: imgData[0],
      g: imgData[1],
      b: imgData[2]
    };

    const distance = Math.sqrt(
      (target.r - actual.r) * (target.r - actual.r) +
      (target.g - actual.g) * (target.g - actual.g) +
      (target.b - actual.b) * (target.b - actual.b)
    );

    if (distance < tolerance) {
      match++;
    }
  }

  return match;
});

const monitorStream = async(testController, canvasID = 'subscriberCanvas') => {
  const {noSignalColor, noSignalColorTolerance, noSignalWaitingTime, testRuntimeMs} = config.args;
  
  const waitingTimes = Math.ceil(moment.duration(noSignalWaitingTime).asSeconds());
  
  let i = Math.floor(testRuntimeMs / 1000);
  let noBroadcast = 0;

  while (i > 0) {
    await testController.wait(1000);
    i--;

    if (noSignalColor === '') {
      continue;
    }

    const colorMatch = await validateScreenColor(noSignalColor, noSignalColorTolerance, canvasID);
    noBroadcast = colorMatch === 100 ? noBroadcast + 1 : 0;

    await testController.expect(noBroadcast).notEql(waitingTimes, 'No broadcast');
  }
};

// eslint-disable-next-line padding-line-between-statements
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

// eslint-disable-next-line padding-line-between-statements
const initRtmpPush = async(testType) => {
  const {channelAlias, args} = config;
  const {capabilities, region, rtmpPushFile, rtmpLinkProtocol, rtmpPort} = args;
  const channel = await pcastApi.createChannel(channelAlias);
  ok(channel !== undefined, 'Could not create channel for RTMP Push');

  rtmpPush.startRtmpPush(
    testType,
    rtmpLinkProtocol,
    rtmpPort,
    rtmpPushFile,
    region,
    channel,
    capabilities
  );

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

  const filePath = persistence.saveToFile(reportFileName, status, report);
  commonReporter.LogReportPath(filePath);

  if (saveConsoleLogs === 'true') {
    const consoleDump = await reporter.CreateConsoleDump(tc);

    persistence.saveToFile(`${tc.browser.name}-console-logs`, '', consoleDump);
  }
};

module.exports = {
  finishAndReport,
  initRtmpPush,
  monitorStream,
  subscribeFromClient,
  waitForPublisher
};