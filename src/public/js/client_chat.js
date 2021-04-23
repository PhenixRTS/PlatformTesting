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

/* global getUrlParams, getChannelUri, log, logStat, sdk, chat, moment */

let roomExpress = null;
let messageCount = 0;
let requestHistoryTime = undefined;
let isLastMessage = false;
let roomAlias;
let chatService;
let historyRequestCount = 0;
let historyRequestTitle = '';

const dateFormat = getUrlParams('dateFormat');
const applicationId = getUrlParams('applicationId');
const secret = getUrlParams('secret');
const mode = getUrlParams('mode');
const publisherBackendUri = getUrlParams('publisherBackendUri');
const messageInterval = getUrlParams('messageInterval');
const numMessages = parseInt(getUrlParams('numMessages'));
const messageSize = getUrlParams('messageSize');
const chatAPI = getUrlParams('chatAPI');
const maxHistoryBatchSize = 128;
const maxHistoryRequestCount = 3;
const advisableDelayBeforeGettingChatService = 3000;

document.addEventListener('common_loaded', () => {
  logStat(`[Url loaded] ${Date.now()}`);

  roomAlias = getUrlParams('roomAlias');

  roomExpress = initRoom(roomAlias);

  joinRoom(roomAlias);
});

function initRoom(alias) {
  const backendUri = getUrlParams('backendUri');
  const pcastUri = getUrlParams('pcastUri');

  const featuresParam = getUrlParams('features');
  const features = featuresParam === undefined ? [] : featuresParam.split(',');

  const isBackendPcastUri =
    backendUri.substring(backendUri.lastIndexOf('/') + 1) === 'pcast';
  const backendUriWithPcast = isBackendPcastUri ? backendUri : `${backendUri}/pcast`;

  const adminApiProxyClient = new sdk.net.AdminApiProxyClient();
  adminApiProxyClient.setBackendUri(backendUriWithPcast);

  const roomExpress = new sdk.express.RoomExpress({
    adminApiProxyClient,
    features,
    disableConsoleLogging: getUrlParams('disableConsoleLogging') === 'true',
    uri: pcastUri
  });

  log(`Backend uri: ${backendUriWithPcast}`);
  log(`PCast uri: ${pcastUri}`);

  log(`Joining room ${getChannelUri(backendUri, isBackendPcastUri, alias)}`);

  return roomExpress;
}

function joinRoom(roomAlias) {
  if (roomExpress === null) {
    return;
  }

  roomExpress.joinRoom(
    {
      alias: roomAlias,
      role: 'Participant'
    },
    joinRoomCallback,
    membersChangedCallback
  );
}

function joinRoomCallback(err, response) {
  if (err) {
    errorMsg(`Error: Unable to join the room! [${err}]`);

    return;
  }

  if (response.status !== 'ok') {
    errorMsg(`Error: Unable to join the room, got status [${response.status}]`);

    return;
  }

  if (!response.roomService) {
    errorMsg('Error: There is no room service in response!', response);

    return;
  }

  log('Successfully joined the room');
  logStat(`[Session ID] ${response.roomService.getSelf().getSessionId()}`);

  log('Getting and starting ChatService');
  logStat(`[Channel Type] Room`);

  setTimeout(async() => {
    chatService = response.roomService.getChatService();
    chatService.start();

    if (mode === 'receive') {
      startReceivingMessages(chatService);
    }

    if (mode === 'send') {
      if (chatAPI === 'ChatService') {
        startSendingMessages(chatService);
      }

      if (chatAPI === 'REST') {
        const roomId = await getRoomId();
        await sendRestAPIMessages(roomId);
      }
    }
  }, advisableDelayBeforeGettingChatService);
}

function startReceivingMessages(chatService) {
  chatService.getObservableChatEnabled().subscribe((enabled) => {
    if (enabled) {
      showChatStatus('Chat is ENABLED');
    } else {
      showChatError('Error: Chat is DISABLED');
    }
  }, {initial: 'notify'});

  historyRequestTitle = '[Chat history start]';
  fetchMessageHistory(null, true);

  chatService.getObservableLastChatMessage().subscribe((message) => {
    const messageReceived = moment().utc().format(dateFormat);

    messageCount++;

    const jsonMessage = JSON.stringify({
      messageId: message.messageId,
      serverTimestamp: moment(message.timestamp).utc().format(dateFormat),
      receivedTimestamp: messageReceived,
      body: message.message
    });

    if (messageCount <= numMessages) {
      logStat(`[Message received] ${jsonMessage}`);
      showReceivedMessages(`Received message [${message.messageId}]/[${messageReceived}]: ${message.message}\n`);
    }

    if (messageCount >= numMessages) {
      isLastMessage = true;
      historyRequestTitle = '[Chat history end]';
      fetchMessageHistory(null, true);
    }
  });
}

function startSendingMessages(chatService) {
  const sendingInterval = setInterval(function sendMessage() {
    if (!chatService.getObservableChatEnabled().getValue()) {
      showSenderChatError('Error: Sender chat is DISABLED');

      return;
    }

    if (!chatService.canSendMessage()) {
      showMessageSentError('Error: Can NOT send messages right now');

      return;
    }

    const messageObject = chat.createMessageToSend(messageSize, moment().format(dateFormat));
    messageObject.sentTimestamp = moment.utc().format(dateFormat);

    const message = JSON.stringify(messageObject);

    if (messageCount <= numMessages) {
      chatService.sendMessageToRoom(message, (error, response) => {
        if (error) {
          showMessageSentError('Error: Failed to send message', error);

          return;
        }

        if (response.status !== 'ok') {
          showMessageSentError(`Error: Unable to send message, got status [${response.status}]`, response);

          return;
        }

        if (response.status === 'ok') {
          messageCount++;
          showSentMessageResult(message);
        }
      });
    }

    if (messageCount >= numMessages) {
      endTest(sendingInterval);
    }

    return sendMessage;
  }(), messageInterval);
}

async function sendRestAPIMessages(roomId) {
  const sendingInterval = setInterval(await async function sendMessage() {
    if (messageCount <= numMessages) {
      const messageObject = chat.createMessageToSend(messageSize, moment().format(dateFormat));
      messageObject.sentTimestamp = moment.utc().format(dateFormat);

      const sentMessageResponse = await chat.sendRestApiMessage(applicationId, secret, publisherBackendUri, roomId, JSON.stringify(messageObject));

      if (sentMessageResponse.error || sentMessageResponse.status !== 'ok') {
        showMessageSentError(`Error: Unable to send message, got status [${sentMessageResponse.status}]`, sentMessageResponse);

        return;
      }

      if (sentMessageResponse.status === 'ok') {
        messageCount++;
        showSentMessageResult(sentMessageResponse.message.message);
      }
    }

    if (messageCount >= numMessages) {
      endTest(sendingInterval);
    }

    return sendMessage;
  }(), messageInterval);
}

function fetchMessageHistory(beforeMessageId, isMainRequest) {
  if (isMainRequest) {
    historyRequestCount = 0;
  }

  if (historyRequestCount < maxHistoryRequestCount) {
    const afterMessageId = calculateAfterMessageId(beforeMessageId);

    if (afterMessageId !== undefined) {
      log(`Will get chat history after message id [${afterMessageId}] and before message id [${beforeMessageId}]`);

      requestHistoryTime = moment.utc().format(dateFormat);
      log(`Chat history requested: [${requestHistoryTime}]`);

      chatService.getMessages(maxHistoryBatchSize, afterMessageId, beforeMessageId, getMessagesHistoryCallback);
    }

    if (afterMessageId === undefined) {
      log('Chat history: beforeMessageId has reached [0000000000].');
      historyRequestCount = maxHistoryRequestCount;
    }
  }

  if (historyRequestCount === maxHistoryRequestCount) {
    if (isLastMessage) {
      endTest();
    }
  }
}

function getMessagesHistoryCallback(error, response) {
  const receivedHistoryTime = moment.utc().format(dateFormat);

  if (error) {
    showChatHistoryError('Error: Failed to get messages from history', error);

    return;
  }

  if (response.status !== 'ok') {
    showChatHistoryError(`Error: Unable to get messages from history, got status [${response.status}]`, response);

    return;
  }

  if (response.status === 'ok') {
    if (!response.chatMessages) {
      showChatHistoryError('Error: There is no array with messages inside message history response!', response);

      return;
    }

    historyRequestCount += 1;
    log(`Chat history received : [${receivedHistoryTime}]`);

    const historyLag = moment(receivedHistoryTime).diff(moment(requestHistoryTime));
    log(`Chat history lag: ${historyLag}`);

    showMessageHistory(`Received chat history: ${response.chatMessages.length} messages\n `);

    const beforeMessageId = response.chatMessages.length !== 0 ? response.chatMessages[0].messageId : null;

    log(`Chat history : ${JSON.stringify(response.chatMessages)}`);
    log(`${historyRequestTitle} ${JSON.stringify({
      lag: historyLag,
      messageCount: response.chatMessages.length,
      beforeMessageId: beforeMessageId
    })}`);

    if (beforeMessageId !== null) {
      const lastMessageId = response.chatMessages[response.chatMessages.length - 1].messageId;
      const lastMessageIdNumber = parseInt(lastMessageId.split('|')[2], 10);
      const firstMessageIdNumber = parseInt(beforeMessageId.split('|')[2], 10);

      if (firstMessageIdNumber > lastMessageIdNumber) {
        log('Chat history: messageIds rolled back through [0000000000].');
        historyRequestCount = maxHistoryRequestCount;
      }
    }

    if (response.chatMessages.length !== maxHistoryBatchSize) {
      historyRequestCount = maxHistoryRequestCount;
    }

    fetchMessageHistory(beforeMessageId, false);
  }
}

function calculateAfterMessageId(beforeMessageId) {
  if (beforeMessageId === null) {
    return null;
  }

  const splitMessageId = beforeMessageId.split('|');
  const messageIdNumberLength = splitMessageId[2].length;
  const beforeMessageIdNumber = parseInt(splitMessageId[2], 10);
  const afterMessageIdNumber = beforeMessageIdNumber - (maxHistoryBatchSize + 1);
  let numberAsString;

  if (afterMessageIdNumber < 0) {
    if (beforeMessageIdNumber > 1) {
      numberAsString = '0'.padStart(messageIdNumberLength, '0');
    }

    if (beforeMessageIdNumber === 0 || beforeMessageIdNumber === 1) {
      return undefined;
    }
  }

  if (afterMessageIdNumber >= 0) {
    if (afterMessageIdNumber.toString().length !== messageIdNumberLength) {
      numberAsString = afterMessageIdNumber.toString().padStart(messageIdNumberLength, '0');
    } else {
      numberAsString = afterMessageIdNumber.toString();
    }
  }

  splitMessageId[2] = numberAsString;

  return splitMessageId.join('|');
}

function endTest(sendingInterval = '') {
  if (mode === 'send') {
    clearInterval(sendingInterval);
  }

  roomExpress.dispose();
  showMessageLimitReach('Message limit reached!');
}

function membersChangedCallback(members) {
  setClientMessage(`Room contains ${members.length} members`);
}

function showSentMessageResult(message) {
  const sentMessageSize = chat.byteSize(message);
  logStat(`[Message Sent] ${JSON.stringify({
    message: message,
    size: sentMessageSize
  })}`);
  showSentMessages(`Message Size: ${sentMessageSize} | Sent message: ${message}\n`);
}

async function getRoomId() {
  let roomId;

  const roomList = await chat.getRooms(applicationId, secret, publisherBackendUri);

  if (roomList.error || roomList.status !== 'ok') {
    showMessageSentError(`Error: Could not get room list, got status [${roomList.status}]`, roomList);

    return;
  }

  if (roomList.status === 'ok') {
    roomList.rooms.forEach(room => {
      if (room.alias === roomAlias) {
        roomId = room.roomId;
      }
    });

    if (roomId === undefined) {
      showMessageSentError(`Error: Could not find room [${roomAlias}] in room list!`);

      return;
    }
  }

  return roomId;
}

function setClientMessage(message) {
  const clientMessageElement = document.getElementById('roomClientMessage');

  clientMessageElement.innerHTML = message;
}

function errorMsg(message, response = '') {
  if (response !== '') {
    console.error(`[Acceptance Testing Error] ${message}`, response);
  } else {
    console.error(`[Acceptance Testing Error] ${message}`);
  }

  document.getElementById('roomError').innerHTML += `<br />${message}`;
}

function showChatStatus(message) {
  log(message);
  document.getElementById('chatStatus').innerHTML = message;
}

function showReceivedMessages(message) {
  document.getElementById('receivedMessages').innerHTML += message;
}

function showMessageSentError(message, response = '') {
  console.error(`[Acceptance Testing Error] ${message}`, response);
  document.getElementById('messageSentError').innerHTML += `<br />${message}`;
}

function showSentMessages(message) {
  document.getElementById('senderMessage').innerText += message;
}

function showChatError(message) {
  console.error(`[Acceptance Testing Error] ${message}`);
  document.getElementById('chatStatusError').innerHTML += `<br />${message}`;
}

function showSenderChatError(message) {
  console.error(`[Acceptance Testing Error] ${message}`);
  document.getElementById('senderChatError').innerHTML += `<br />${message}`;
}

function showChatHistoryError(message, response = '') {
  console.error(`[Acceptance Testing Error] ${message}`, response);
  document.getElementById('chatHistoryError').innerHTML += `<br />${message}`;
}

function showMessageLimitReach(message) {
  document.getElementById('messageLimitReach').innerHTML = message;
}

function showMessageHistory(message) {
  document.getElementById('receivedMessageHistory').innerText += message;
}