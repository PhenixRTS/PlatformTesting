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

/* global getUrlParams, getChannelUri, log, sdk, chat, moment */

let roomExpress = null;
let messageCount = 0;
let roomAlias;

const dateFormat = getUrlParams('dateFormat');
const applicationId = getUrlParams('applicationId');
const secret = getUrlParams('secret');
const mode = getUrlParams('mode');
const publisherBackendUri = getUrlParams('publisherBackendUri');

document.addEventListener('DOMContentLoaded', () => {
  log(`[Url loaded] ${Date.now()}`);

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
      role: 'Audience'
    },
    joinRoomCallback,
    membersChangedCallback
  );
}

async function joinRoomCallback(err, response) {
  if (err) {
    errorMsg(`Error: Unable to join the room! [${err}]`);

    return;
  }

  if (response.status !== 'ok') {
    errorMsg(`Error: Unable to join the room, got status [${response.status}]`);

    return;
  }

  if (!response.roomService){
    errorMsg('Error: There is no room service in response!', response);

    return;
  }

  log('Successfully joined the room');

  const chatAPI = getUrlParams('chatAPI');
  const messageSize = getUrlParams('messageSize');
  const interval = getUrlParams('messageInterval');
  const numMessages = parseInt(getUrlParams('numMessages'));

  log('Getting and starting ChatService');

  let chatService = response.roomService.getChatService();
  chatService.start();

  if (mode === 'receive'){
    startReceivingMessages(chatService, numMessages);
  }

  if (mode === 'send'){
    if (chatAPI === 'ChatService'){
      startSendingMessages(chatService, numMessages, interval, messageSize);
    }

    if (chatAPI === 'REST'){
      const roomId = await getRoomId();
      sendRestAPIMessages(roomId, numMessages, interval, messageSize);
    }
  }
}

function startReceivingMessages(chatService, numMessages){
  chatService.getObservableChatEnabled().subscribe((enabled) => {
    if (enabled) {
      showChatStatus('Chat is ENABLED');
    } else {
      showChatError('Error: Chat is DISABLED');
    }
  }, {initial: 'notify'});

  chatService.getObservableLastChatMessage().subscribe((message) => {
    messageCount++;

    const jsonMessage = JSON.stringify({
      messageId: message.messageId,
      serverTimestamp: moment(message.timestamp).utc().format(dateFormat),
      receivedTimestamp: moment.utc().format(dateFormat),
      body: message.message
    });

    if (messageCount <= numMessages) {
      log(`[Message received] ${jsonMessage}`);
      showReceivedMessages(`Received message [${message.messageId}]/[${jsonMessage.receivedTimestamp}]: ${message.message}\n`);
    }

    if (messageCount >= numMessages){
      endTest();
    }
  });
}

function startSendingMessages(chatService, numMessages, messageSize){
  const interval = getUrlParams('messageInterval');
  const messageInterval = setInterval(function sendMessage() {
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
      endTest(messageInterval);
    }

    return sendMessage;
  }(), interval);
}

function sendRestAPIMessages(roomId, numMessages, interval, messageSize){
  const messageInterval = setInterval(async() => {
    if (messageCount <= numMessages) {
      const messageObject = chat.createMessageToSend(messageSize, moment().format(dateFormat));
      messageObject.sentTimestamp = moment.utc().format(dateFormat);

      const sentMessageResponse = await chat.sendRestApiMessage(applicationId, secret, publisherBackendUri, roomId, JSON.stringify(messageObject));

      if (sentMessageResponse.error || sentMessageResponse.status !== 'ok'){
        showMessageSentError(`Error: Unable to send message, got status [${sentMessageResponse.status}]`, sentMessageResponse);

        return;
      }

      if (sentMessageResponse.status === 'ok'){
        messageCount++;
        showSentMessageResult(sentMessageResponse.message.message);
      }
    }

    if (messageCount >= numMessages) {
      endTest(messageInterval);
    }
  }, interval);
}

function showSentMessageResult(message){
  const messageSize = chat.byteSize(message);
  log(`[Message Sent] ${JSON.stringify({
    message: message,
    size: messageSize
  })}`);
  showSentMessages(`Message Size: ${messageSize} | Sent message: ${message}\n`);
}

function endTest(messageInterval = undefined){
  if (mode === 'send'){
    clearInterval(messageInterval);
  }

  roomExpress.dispose();
  showMessageLimitReach('Message limit reached!');
}

async function getRoomId(){
  let roomId;

  const roomList = await chat.getRooms(applicationId, secret, publisherBackendUri);

  if (roomList.error || roomList.status !== 'ok'){
    showMessageSentError(`Error: Could not get room list, got status [${roomList.status}]`, roomList);

    return;
  }

  if (roomList.status === 'ok'){
    roomList.rooms.forEach(room => {
      if (room.alias === roomAlias) {
        roomId = room.roomId;
      }
    });

    if (roomId === undefined){
      showMessageSentError(`Error: Could not find room [${roomAlias}] in room list!`);

      return;
    }
  }

  return roomId;
}

function membersChangedCallback(members) {
  if (members.length === 0) {
    setClientMessage('Waiting for members to join');
  } else {
    setClientMessage(`Room contains ${members.length} members`);

    members.forEach(member => {
      log(`[Session ID] ${member.getSessionId()}`);
    });
  }
}

function setClientMessage(message) {
  const clientMessageElement = document.getElementById('roomClientMessage');

  clientMessageElement.innerHTML = message;
}

function errorMsg(message, response = ''){
  if (response !== ''){
    console.error(`[Acceptance Testing Error] ${message}`, response);
  } else {
    console.error(`[Acceptance Testing Error] ${message}`);
  }

  document.getElementById('roomError').innerHTML += `<br />${message}`;
}

function showChatStatus(message){
  log(message);
  document.getElementById('chatStatus').innerHTML = message;
}

function showReceivedMessages(message){
  document.getElementById('receivedMessages').innerHTML += message;
}

function showMessageSentError(message, response = ''){
  console.error(`[Acceptance Testing Error] ${message}`, response);
  document.getElementById('messageSentError').innerHTML += `<br />${message}`;
}

function showSentMessages(message){
  document.getElementById('senderMessage').innerText += message;
}

function showChatError(message){
  console.error(`[Acceptance Testing Error] ${message}`);
  document.getElementById('chatStatusError').innerHTML += `<br />${message}`;
}

function showSenderChatError(message){
  console.error(`[Acceptance Testing Error] ${message}`);
  document.getElementById('senderChatError').innerHTML += `<br />${message}`;
}

function showMessageLimitReach(message){
  document.getElementById('messageLimitReach').innerHTML = message;
}