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

const logger = new Logger('Chat Test');

async function CollectChatStats() {
  logger.log('Collecting chat stats...');

  const messageReceived = '[Acceptance Testing] [Message received] ';
  const messageSent = '[Acceptance Testing] [Message sent] ';
  const logs = await t.getBrowserConsoleMessages();

  const chatStats = {
    sent: [],
    received: []
  };

  logs.info.forEach(infoLogElement => {
    infoLogElement = infoLogElement.trim();

    if (infoLogElement.startsWith(messageReceived)) {
      const receivedMessage = JSON.parse(infoLogElement.replace(messageReceived, ''));
      logger.log(`Received message: ${JSON.stringify(receivedMessage)}`);
      receivedMessage.sentTimestamp = moment(JSON.parse(receivedMessage.body).sentTimestamp).format('YYYY-MM-DDTHH:mm:ss.SSS');
      logger.log(`receivedTimestamp - sentTimestamp: [${moment(receivedMessage.receivedTimestamp).diff(moment(receivedMessage.sentTimestamp))}]`);
      logger.log(`serverTimestamp - sentTimestamp: [${moment(receivedMessage.serverTimestamp).diff(moment(receivedMessage.sentTimestamp))}]`);
      logger.log(`receivedTimestamp - serverTimestamp: [${moment(receivedMessage.receivedTimestamp).diff(moment(receivedMessage.serverTimestamp))}]`);
      chatStats.received.push(receivedMessage);
    }

    if (infoLogElement.startsWith(messageSent)) {
      const sentMessage = infoLogElement.replace(messageSent, '');
      logger.log(`Sent message: ${sentMessage}`);
      chatStats.sent.push(sentMessage);
    }
  });

  return chatStats;
}

export default {CollectChatStats};