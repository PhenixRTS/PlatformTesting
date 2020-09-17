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
import moment from 'moment';
import config from '../../../config';
import reporter from './common-reporter';

const logger = new Logger('Chat Test');
const math = require('mathjs');

async function CollectChatStats() {
  logger.log('Collecting chat stats...');

  const sessionIdTitle = '[Acceptance Testing] [Session ID] ';
  const messageReceived = '[Acceptance Testing] [Message received] ';
  const messageSent = '[Acceptance Testing] [Message Sent] ';
  const logs = await t.getBrowserConsoleMessages();
  let chatStats = {};

  if (config.args.mode === 'receive') {
    chatStats = {
      sessionId: undefined,
      received: [],
      senderToReceiverLags: [],
      senderToPlatformLags: [],
      platformToReceiverLags: [],
      maxSenderToReceiverLag: undefined,
      maxSenderToPlatformLag: undefined,
      maxPlatformToReceiverLag: undefined,
      stdDevSenderToReceiverLag: undefined
    };

    logs.info.forEach(infoLogElement => {
      infoLogElement = infoLogElement.trim();

      if (infoLogElement.startsWith(sessionIdTitle)) {
        const sessionId = infoLogElement.replace(sessionIdTitle, '');
        logger.log(`For session [${sessionId}]`);
        chatStats.sessionId = sessionId;
      }

      if (infoLogElement.startsWith(messageReceived)) {
        const receivedMessage = JSON.parse(infoLogElement.replace(messageReceived, ''));
        logger.log(`Received message: ${JSON.stringify(receivedMessage)}`);
        receivedMessage.sentTimestamp = moment(JSON.parse(receivedMessage.body).sentTimestamp);
        logger.log(`receivedTimestamp - sentTimestamp: [${moment(receivedMessage.receivedTimestamp).diff(moment(receivedMessage.sentTimestamp))}]`);
        logger.log(`serverTimestamp - sentTimestamp: [${moment(receivedMessage.serverTimestamp).diff(moment(receivedMessage.sentTimestamp))}]`);
        logger.log(`receivedTimestamp - serverTimestamp: [${moment(receivedMessage.receivedTimestamp).diff(moment(receivedMessage.serverTimestamp))}]`);
        chatStats.received.push(receivedMessage);
      }
    });

    chatStats.received.forEach(stat => {
      chatStats.senderToReceiverLags.push(moment(stat.receivedTimestamp).diff(moment(stat.sentTimestamp)));
      chatStats.senderToPlatformLags.push(moment(stat.serverTimestamp).diff(moment(stat.sentTimestamp)));
      chatStats.platformToReceiverLags.push(moment(stat.receivedTimestamp).diff(moment(stat.serverTimestamp)));
    });

    chatStats.maxSenderToReceiverLag = chatStats.senderToReceiverLags.length > 0 ? Math.max.apply(this, chatStats.senderToReceiverLags) : undefined;
    chatStats.maxSenderToPlatformLag = chatStats.senderToPlatformLags.length > 0 ? Math.max.apply(this, chatStats.senderToPlatformLags) : undefined;
    chatStats.maxPlatformToReceiverLag = chatStats.platformToReceiverLags.length > 0 ? Math.max.apply(this, chatStats.platformToReceiverLags) : undefined;
    chatStats.stdDevSenderToReceiverLag = chatStats.senderToReceiverLags.length > 0 ? math.std(chatStats.senderToReceiverLags) : undefined;
  }

  if (config.args.mode === 'send') {
    chatStats = {
      sessionId: undefined,
      sent: []
    };

    logs.info.forEach(infoLogElement => {
      infoLogElement = infoLogElement.trim();

      if (infoLogElement.startsWith(sessionIdTitle)) {
        const sessionId = infoLogElement.replace(sessionIdTitle, '');
        logger.log(`For session [${sessionId}]`);
        chatStats.sessionId = sessionId;
      }

      if (infoLogElement.startsWith(messageSent)) {
        const sentMessage = JSON.parse(infoLogElement.replace(messageSent, ''));
        logger.log(`Sent message: ${sentMessage.message}, Size: ${sentMessage.size}`);
        chatStats.sent.push(sentMessage);
      }
    });
  }

  return chatStats;
}

async function CreateTestReport(testController, page) {
  let header = {};
  let content = {};
  let additionalInfo = '';

  if (config.args.reportFormat === 'json') {
    header = {
      expectedMessages: config.args.numMessages,
      receivedMessages: config.args.mode === 'receive' ? page.stats.received.length : page.stats.sent.length,
      messages: config.args.mode === 'receive' ? page.stats.received : page.stats.sent
    };
  } else {
    header = 'Expected messages: ' + config.args.numMessages + '\n';

    header += config.args.mode === 'receive' ?
      'Received messages: ' + page.stats.received.length : 'Sent messages: ' + page.stats.sent.length;

    header += config.args.mode === 'receive' ?
      '\n\nMessages:\n' + JSON.stringify(page.stats.received, undefined, 2) :
      '\n\nMessages:\n' + JSON.stringify(page.stats.sent, undefined, 2);
  }

  return reporter.CreateTestReport(testController, page, header, content, additionalInfo);
}

function GenerateTelemetryRecords(page) {
  if (config.args.mode === 'receive') {
    return [
      reporter.CreateTelemetryRecord(page, 'Lag', 'messaging', 'SenderToReceiver', page.stats.maxSenderToReceiverLag),
      reporter.CreateTelemetryRecord(page, 'Lag', 'messaging', 'SenderToPlatform', page.stats.maxSenderToPlatformLag),
      reporter.CreateTelemetryRecord(page, 'Lag', 'messaging', 'PlatformToReceiver', page.stats.maxPlatformToReceiverLag),
      reporter.CreateTelemetryRecord(page, 'Count', 'messaging', 'Received', page.stats.received.length)
    ];
  } else if (config.args.mode === 'send') {
    return [reporter.CreateTelemetryRecord(page, 'Count', 'messaging', 'Sent', page.stats.sent.length)];
  }
}

export default {
  CollectChatStats,
  CreateTestReport,
  CreateConsoleDump: reporter.CreateConsoleDump,
  GenerateTelemetryRecords
};