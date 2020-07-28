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

/* eslint-disable padding-line-between-statements */

import {ok} from 'assert';
import {ClientFunction, Selector} from 'testcafe';

import moment from 'moment';
import path from 'path';
import _ from 'lodash';

import config from '../../config';
import shared from '../../shared/shared';

import persistence from '../models/persistence.js';
import commonReporter from '../models/reporters/common-reporter';
import lagReporter from '../models/reporters/lag-reporter.js';
import qualityReporter from '../models/reporters/quality-reporter';
import syncReporter from '../models/reporters/sync-reporter';

const pcastApi = require('../models/pcastApi.js');
const rtmpPush = require('../models/rtmp-push.js');
const subscribeFromClient = ClientFunction(() => window.subscribe());

const getRoomMembers = ClientFunction(() => {
  const members = [];

  document.querySelectorAll('video').forEach(el => {
    members.push(el.id);
  });

  return members;
});

const validateScreenColor = ClientFunction((target, tolerance, canvasID, videoID = '') => {
  if (videoID !== '') {
    const videoEl = document.getElementById(videoID);

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

const monitorRoomStreams = async(testController) => {
  const {
    failIfMemberHasNoStream,
    noSignalColor,
    noSignalColorTolerance,
    noSignalWaitingTime,
    testRuntimeMs
  } = config.args;

  let members = await getRoomMembers();

  const waitingTimes = Math.ceil(
    moment.duration(noSignalWaitingTime).asSeconds()
  );

  let i = Math.floor(testRuntimeMs / 1000);
  let noBroadcast = {};

  members.forEach(member => {
    noBroadcast[member] = 0;
  });

  while (i > 0) {
    await testController.wait(1000);
    i--;

    if (failIfMemberHasNoStream) {
      await testController
        .expect(Selector('#roomError').innerText)
        .notContains('Error', 'Member has no media stream');
    }

    if (noSignalColor === '') {
      continue;
    }

    members = await getRoomMembers();

    for (let i = 0; i < members.length; i++) {
      const memberID = members[i];

      if (noBroadcast[memberID]) {
        noBroadcast[memberID] = 0;
      }

      const memberCanvasID = `${memberID}-canvas`;
      const colorMatch = await validateScreenColor(
        noSignalColor,
        noSignalColorTolerance,
        memberCanvasID,
        memberID
      );
      noBroadcast[memberID] = colorMatch === 100 ? noBroadcast[memberID] + 1 : 0;
    }

    for (const memberID in noBroadcast) {
      const screenName = shared.getMemberScreenNameFromID(memberID);
      const sessionID = shared.getMemberSessionIDFromID(memberID);

      await testController
        .expect(noBroadcast[memberID])
        .notEql(
          waitingTimes,
          `No broadcast detected for ${screenName} with session ID: ${sessionID}`
        );
    }
  }
};

const monitorStream = async(testController, canvasID, videoID = '') => {
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

    const colorMatch = await validateScreenColor(
      noSignalColor,
      noSignalColorTolerance,
      canvasID,
      videoID
    );
    noBroadcast = colorMatch === 100 ? noBroadcast + 1 : 0;

    await testController.expect(noBroadcast).notEql(waitingTimes, 'No broadcast');
  }
};

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
        }, config.publisherArgs.publisherWaitTimeMs);
      });
    }, 1000);
  });

const initRtmpPush = async(testType) => {
  const {channelAlias} = config;
  const {capabilities, region} = config.publisherArgs;
  const {rtmpPushFile, rtmpLinkProtocol, rtmpPort} = config.rtmpPushArgs;
  const channel = await createChannel(channelAlias);
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

const createChannel = async(testcafe) => {
  const {channelAlias} = config;
  const channel = await pcastApi.createChannel(channelAlias);

  ok(channel !== undefined, `Could not create channel with alias [${channelAlias}]`);

  if (channel === undefined) {
    testcafe.ctx.testFailed = true;
    return;
  }

  console.log(`Created channel with alias [${channelAlias}]`);

  return channel;
};

const finishAndReport = async(testFile, page, t, createdChannel = {}) => {
  const {saveConsoleLogs} = config.args;
  let reportFileName = `${path.basename(testFile).split('.')[0]}`;

  if (config.rtmpPushArgs.rtmpPushFile !== '') {
    rtmpPush.stopRtmpPush();
    reportFileName = `${reportFileName}-rtmp`;
  }

  if (createdChannel.channelId !== undefined) {
    const {channelId} = createdChannel;
    const deleteResponse = await pcastApi.deleteChannel(channelId);

    if (deleteResponse.status === 'ok'){
      if (config.args.silent !== true) {
        console.log(`Deleted channel that was created previously. ChannelAlias: [${config.channelAlias}], id: [${channelId}]`);
      }
    } else {
      console.error(`Error: could not delete channel that was created previously.
        ChannelAlias: [${config.channelAlias}], id: [${channelId}].
        Error: [${deleteResponse.error}]
        Status: [${deleteResponse.status}]`
      );
    }
  }

  let reporter = qualityReporter;
  let report = '';

  if (testFile.indexOf('lag-test') > -1) {
    reporter = lagReporter;
  }

  if (testFile.indexOf('sync-test') > -1) {
    reporter = syncReporter;
  }

  if (_.isEmpty(page.stats)) {
    t.ctx.testFailed = true;

    const message = 'Please check console output for errors!';

    if (config.args.reportFormat === 'json') {
      t.ctx.error = message;
    } else {
      report = `\n\n${message}\n\n`;
    }
  }

  const status = t.ctx.testFailed ? 'FAIL' : 'PASS';
  const reportFormat = config.args.reportFormat === 'json' ? 'json' : 'txt';
  report += await reporter.CreateTestReport(t, page, createdChannel);

  if (config.args.dumpReport === true) {
    console.log(report);
  }

  const filePath = persistence.saveToFile(reportFileName, status, report, reportFormat);
  commonReporter.LogReportPath(filePath);

  if (saveConsoleLogs === true || saveConsoleLogs === 'true') {
    const consoleDump = await reporter.CreateConsoleDump(t);

    persistence.saveToFile(`${t.browser.name}-console-logs`, '', consoleDump);
  }
};

module.exports = {
  finishAndReport,
  initRtmpPush,
  monitorStream,
  monitorRoomStreams,
  subscribeFromClient,
  waitForPublisher,
  createChannel
};