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

/* global getUrlParams, getChannelUri, log, sdk, moment */

let roomExpress = null;
const dateFormat = getUrlParams('dateFormat');
const byteSize = str => new Blob([str]).size;

document.addEventListener('DOMContentLoaded', () => {
  log(`[Url loaded] ${Date.now()}`);

  const roomAlias = getUrlParams('roomAlias');

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

function joinRoomCallback(err, response) {
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

  const mode = getUrlParams('mode');
  let chatService = response.roomService.getChatService();
  chatService.start();

  if (mode === 'receive'){
    startReceivingMessages(chatService);
  }

  if (mode === 'send'){
    startSendingMessages(chatService);
  }
}

function startReceivingMessages(chatService){
  chatService.getObservableChatEnabled().subscribe((enabled) => {
    if (enabled) {
      showChatStatus('Chat is ENABLED');
    } else {
      showChatError('Error: Chat is DISABLED');
    }
  }, {initial: 'notify'});

  chatService.getObservableLastChatMessage().subscribe((message) => {
    const receivedTimestamp = moment().format(dateFormat);
    const jsonMessage = JSON.stringify({
      messageId: message.messageId,
      serverTimestamp: moment(message.timestamp).format(dateFormat),
      receivedTimestamp: receivedTimestamp,
      body: message.message
    });
    log(`[Message received] ${jsonMessage}`);
    showReceivedMessages(`Received message [${message.messageId}]/[${receivedTimestamp}]: ${message.message}\n`);
  });
}

function startSendingMessages(chatService){
  const interval = getUrlParams('messageInterval');
  setInterval(() => {
    if (!chatService.getObservableChatEnabled().getValue()) {
      showSenderChatError('Error: Sender chat is DISABLED');

      return;
    }

    if (!chatService.canSendMessage()) {
      showMessageSentError('Error: Can NOT send messages right now');

      return;
    }

    const messageObject = {
      sentTimestamp: moment().format(dateFormat),
      payload: ''
    };
    messageObject.payload = getMessagePayload(messageObject);

    const message = JSON.stringify(messageObject);
    chatService.sendMessageToRoom(message, (error, response) => {
      if (error) {
        showMessageSentError('Error: Failed to send message', error);

        return;
      }

      if (response.status !== 'ok'){
        showMessageSentError(`Error: Unable to send message, got status [${response.status}]`, response);

        return;
      }

      if (response.status === 'ok'){
        const messageSize = byteSize(message);
        log(`[Message Sent] ${JSON.stringify({
          message: message,
          size: messageSize
        })}`);
        showSentMessages(`Message Size: ${messageSize} | Sent message: '${message}\n`);
      }
    });
  }, interval);
}

function membersChangedCallback(members) {
  if (members.length === 0) {
    setClientMessage('Waiting for members to join');
  } else {
    setClientMessage(`Room contains ${members.length} members`);
  }
}

function getMessagePayload(message){
  const messageSize = getUrlParams('messageSize');
  let messageByteSize;

  if (messageSize.includes('-')){
    const messageByteSizeValues = messageSize.split('-');
    messageByteSize = randomNumberFromInterval(parseInt(messageByteSizeValues[0]), parseInt(messageByteSizeValues[1]));
  } else {
    messageByteSize = parseInt(messageSize);
  }

  const currentMessageByteSize = byteSize(JSON.stringify(message));

  if (messageByteSize >= currentMessageByteSize){
    const tempMessage = '0';

    return tempMessage.repeat(messageByteSize - currentMessageByteSize);
  }

  return '';
}

function randomNumberFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
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