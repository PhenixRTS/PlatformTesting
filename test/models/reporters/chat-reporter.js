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
  const messageReceivedTitle = '[Acceptance Testing] [Message received] ';
  const messageSentTitle = '[Acceptance Testing] [Message Sent] ';
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

      if (infoLogElement.startsWith(messageReceivedTitle)) {
        const receivedMessage = JSON.parse(infoLogElement.replace(messageReceivedTitle, ''));
        logger.log(`Received message: [${JSON.stringify(receivedMessage)}]`);
        receivedMessage.sentTimestamp = moment(JSON.parse(receivedMessage.body).sentTimestamp);

        const senderToReceiverLag = moment(receivedMessage.receivedTimestamp).diff(moment(receivedMessage.sentTimestamp));
        logger.log(`receivedTimestamp - sentTimestamp: [${senderToReceiverLag}]`);
        chatStats.senderToReceiverLags.push({
          messageId: receivedMessage.messageId,
          lag: senderToReceiverLag
        });

        const senderToPlatformLags = moment(receivedMessage.serverTimestamp).diff(moment(receivedMessage.sentTimestamp));
        logger.log(`serverTimestamp - sentTimestamp: [${senderToPlatformLags}]`);
        chatStats.senderToPlatformLags.push({
          messageId: receivedMessage.messageId,
          lag: senderToPlatformLags
        });

        const platformToReceiverLag = moment(receivedMessage.receivedTimestamp).diff(moment(receivedMessage.serverTimestamp));
        logger.log(`receivedTimestamp - serverTimestamp: [${platformToReceiverLag}]`);
        chatStats.platformToReceiverLags.push({
          messageId: receivedMessage.messageId,
          lag: platformToReceiverLag
        });

        chatStats.received.push(receivedMessage);
      }
    });

    chatStats.maxSenderToReceiverLag = chatStats.senderToReceiverLags.length > 0 ? Math.max.apply(this, chatStats.senderToReceiverLags.map(stat => stat.lag)) : undefined;
    chatStats.maxSenderToPlatformLag = chatStats.senderToPlatformLags.length > 0 ? Math.max.apply(this, chatStats.senderToPlatformLags.map(stat => stat.lag)) : undefined;
    chatStats.maxPlatformToReceiverLag = chatStats.platformToReceiverLags.length > 0 ? Math.max.apply(this, chatStats.platformToReceiverLags.map(stat => stat.lag)) : undefined;
    chatStats.stdDevSenderToReceiverLag = chatStats.senderToReceiverLags.length > 0 ? math.std(chatStats.senderToReceiverLags.map(stat => stat.lag)) : undefined;
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

      if (infoLogElement.startsWith(messageSentTitle)) {
        const sentMessage = JSON.parse(infoLogElement.replace(messageSentTitle, ''));
        logger.log(`Sent message: [${sentMessage.message}], Size: [${sentMessage.size}]`);
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
  let telemetry = [];

  if (config.args.mode === 'receive') {
    telemetry.push(
      reporter.CreateTelemetryRecord(page, 'Count', 'messaging', 'Received', page.stats.received.length, null)
    );

    page.stats.senderToReceiverLags.forEach(lagStat => {
      telemetry.push(
        reporter.CreateTelemetryRecord(page, 'Lag', 'messaging', 'SenderToReceiver', lagStat.lag, lagStat.messageId)
      );
    });

    page.stats.senderToPlatformLags.forEach(lagStat => {
      telemetry.push(
        reporter.CreateTelemetryRecord(page, 'Lag', 'messaging', 'SenderToPlatform', lagStat.lag, lagStat.messageId)
      );
    });

    page.stats.platformToReceiverLags.forEach(lagStat => {
      telemetry.push(
        reporter.CreateTelemetryRecord(page, 'Lag', 'messaging', 'PlatformToReceiver', lagStat.lag, lagStat.messageId)
      );
    });
  } else if (config.args.mode === 'send') {
    telemetry.push(
      reporter.CreateTelemetryRecord(page, 'Count', 'messaging', 'Sent', page.stats.sent.length, null)
    );
  }

  logger.log(`Generated [${telemetry.length}] telemetry records`);

  return telemetry;
}

export default {
  CollectChatStats,
  CreateTestReport,
  CreateConsoleDump: reporter.CreateConsoleDump,
  GenerateTelemetryRecords
};