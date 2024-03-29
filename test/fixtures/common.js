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
import syncWatchReporter from '../models/reporters/sync-watch-reporter';
import chatReporter from '../models/reporters/chat-reporter';
import {generateJsonFromCsv} from '../models/csvConverter';

const pcastApi = require('../models/pcastApi.js');
const rtmpPush = require('../models/rtmp-push.js');
const Logger = require('../../scripts/logger.js');
const maxWaitForPublisherCount = 30;
const subscribeFromClient = ClientFunction(() => window.subscribe());

async function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

const monitorRoomChat = async(testController) => {
  const logger = new Logger('Monitor Room Chat');
  logger.log('Monitoring chat test');

  const {testRuntimeMs} = config.args;

  let i = Math.floor(testRuntimeMs / 1000);

  while (i > 0) {
    await testController.wait(1000);
    i--;

    const roomError = Selector('#roomError');
    const senderChatError = Selector('#senderChatError');
    const messageSentError = Selector('#messageSentError');
    const chatStatusError = Selector('#chatStatusError');
    const chatHistoryError = Selector('#chatHistoryError');

    await testController
      .expect(roomError().innerText).notContains('Error', 'Error: Unable to join the room')
      .expect(senderChatError().innerText).notContains('Error', 'Error: Sender chat is DISABLED')
      .expect(messageSentError().innerText).notContains('Error', 'Error: Failed to send message')
      .expect(chatStatusError().innerText).notContains('Error', 'Error: Chat is DISABLED')
      .expect(chatHistoryError().innerText).notContains('Error', 'Error: Unable to get message history');

    const messageLimitElement = Selector(`#messageLimitReach`).innerText;
    if ((await messageLimitElement).includes('Message limit reached!')){
      logger.log('Message limit reached! Ending test.');
      break;
    }
  }
};

const monitorStream = async(testController, canvasID, videoID = '') => {
  const logger = new Logger('Monitor Stream');
  logger.log('Starting to monitor stream');
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

  logger.log('Stopped monitoring stream');
};

const waitForPublisher = channelId =>
  new Promise(resolve => {
    let waitForPublisherCount = 0;
    const statusInterval = setInterval(() => {
      waitForPublisherCount += 1;
      pcastApi.getChannelState(channelId).then(publisherCount => {
        if (publisherCount === 0 && waitForPublisherCount < maxWaitForPublisherCount) {
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

const initRtmpPush = async(testType, channel) => {
  console.log('Initializing RTMP Push');
  const {capabilities, region} = config.publisherArgs;
  const {rtmpPushFile, rtmpLinkProtocol, rtmpPort} = config.rtmpPushArgs;

  rtmpPush.startRtmpPush(
    testType,
    rtmpLinkProtocol,
    rtmpPort,
    rtmpPushFile,
    region,
    channel,
    capabilities
  );
};

const createOrGetChannel = async(testcafe) => {
  return new Promise((resolve, reject) => {
    const {channelAlias} = config;
    console.log(`Creating or getting channel with alias [${channelAlias}]`);

    pcastApi.createOrGetChannel(channelAlias)
      .then((channel) => {
        ok(channel !== undefined, `Could not create or get channel with alias [${channelAlias}]`);

        if (channel === undefined) {
          testcafe.ctx.testFailed = true;
          return;
        }

        resolve(channel);
      })
      .catch(error => {
        console.error(error);
        reject(error);
      });
  });
};

const getPresentersStreamIds = async(channelId, numRetries = 10) => {
  const logger = new Logger('Get Presenters Stream Ids');
  const members = await pcastApi.getChannelMembers(channelId);
  if (!Array.isArray(members)) {
    logger.error(`Could not get members [${members}]`);
  }
  const presenters = members.filter(m => m.role === 'Presenter');

  if (presenters.length === 0) {
    if (numRetries <= 0) {
      logger.error(`Can't get streamId, presenter not found in [${channelId}]. Members [${members}]`);
      throw new Error();
    }
    await pause(1000);

    return await getPresentersStreamIds(channelId, numRetries - 1);
  }
  const regex = /pcast:\/\/.*\/([^?]*)/;
  const streamIds = [];
  presenters.forEach((presenter) => {
    let match = regex.exec(presenter.streams[0].uri);
    if (match.length !== 2) {
      logger.error(`Error while parsing stream uri [${presenter.streams[0].uri}]. Should only have 1 match`);
      throw new Error();
    }
    streamIds.push(match[1]);
  });

  return streamIds;
};

async function generateViewingReport(kind, channelId, startTime, endTime = moment.utc().toISOString()) {
  console.log(`${moment.utc().toISOString()} Pulling viewing report [${kind}] for ChannelId [${channelId}] and period [${startTime}] - [${endTime}]`);

  return new Promise((resolve, reject) => {
    pcastApi.generateViewingReport(kind, channelId, startTime, endTime)
      .then(response => response.text())
      .then(textResponse => generateJsonFromCsv(textResponse))
      .then(jsonResponse => {
        resolve(jsonResponse);
      }).catch(error => {
        reject(error);
      });
  });
}

async function generatePublishingReport(channelId, startTime, endTime = moment.utc().toISOString()) {
  console.log(`${moment.utc().toISOString()} Pulling publishing report for ChannelId [${channelId}] and period [${startTime}] - [${endTime}]`);

  try {
    const report = await pcastApi.generatePublishingReport(channelId, startTime, endTime);
    const textReport = await report.text();

    return await generateJsonFromCsv(textReport);
  } catch (error) {
    throw new Error(error);
  }
}

const finishAndReport = async(testFile, page, t, createdChannel = {}) => {
  const logger = new Logger('Finish and Report');
  logger.log('Report generation started');
  const {saveConsoleLogs, submitTelemetry} = config.args;
  let reportFileName = `${path.basename(testFile).split('.')[0]}`;

  if (config.rtmpPushArgs.rtmpPushFile !== '') {
    rtmpPush.stopRtmpPush();
    reportFileName = `${reportFileName}-rtmp`;
  }

  if (config.createdChannel.status === 'ok') {
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

  if (testFile.indexOf('sync-watch-test') > -1) {
    reporter = syncWatchReporter;
  }

  if (testFile.indexOf('chat-test') > -1){
    reporter = chatReporter;
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
  page.testFailed = t.ctx.testFailed;
  const reportFormat = config.args.reportFormat === 'json' ? 'json' : 'txt';
  report += await reporter.CreateTestReport(t, page, createdChannel);

  if (config.args.dumpReport === true) {
    console.log(report);
  }

  const filePath = persistence.saveToFile(reportFileName, status, report, reportFormat);
  commonReporter.LogReportPath(filePath);
  commonReporter.CreateXMLTestReport(t, reportFileName);

  const consoleDump = await reporter.CreateConsoleDump(t);
  if (saveConsoleLogs === true || saveConsoleLogs === 'true') {
    persistence.saveToFile(`${t.browser.name}-console-logs`, reportFileName, consoleDump);
  }

  if (submitTelemetry === true) {
    let records = reporter.GenerateTelemetryRecords(page, t.ctx.assertionResults);
    await pcastApi.postToTelemetry(records);
  } else {
    logger.log('Skipping telemetry.');
  }

  logger.log('Report generation finished');
};

module.exports = {
  getPresentersStreamIds,
  finishAndReport,
  initRtmpPush,
  monitorStream,
  monitorRoomStreams,
  monitorRoomChat,
  subscribeFromClient,
  waitForPublisher,
  createOrGetChannel,
  generateViewingReport,
  generatePublishingReport
};