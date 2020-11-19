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

/* global request */

(function(exports){
  exports.getRooms = async function(applicationId, secret, publisherBackendUri) {
    const requestUrl = publisherBackendUri + '/rooms';

    return new Promise(resolve => {
      request.fetch('GET', requestUrl, applicationId, secret)
        .then(response => response.json())
        .then(result => {
          resolve(result);
        });
    });
  };

  exports.sendRestApiMessage = async function(applicationId, secret, publisherBackendUri, roomId, message) {
    const requestUrl = publisherBackendUri + `/room/${encodeURIComponent(roomId)}/message`;
    const body = {
      message: {
        from: {
          screenName: 'Tester Bot',
          role: 'Participant',
          lastUpdate: 0
        },
        mimeType: 'text/plain',
        message,
        tags: []
      }
    };

    return new Promise(resolve => {
      request.fetch('PUT', requestUrl, applicationId, secret, body, '267')
        .then(response => response.json())
        .then(result => {
          resolve(result);
        });
    });
  };

  exports.byteSize = function(str) {
    if (typeof window === 'undefined'){
      return Buffer.from(str).length;
    }

    return new Blob([str]).size;
  };

  exports.getMessagePayload = function(message, messageSize) {
    let messageByteSize;

    if (messageSize.includes('-')){
      const messageByteSizeValues = messageSize.split('-');
      messageByteSize = this.randomNumberFromInterval(parseInt(messageByteSizeValues[0]), parseInt(messageByteSizeValues[1]));
    } else {
      messageByteSize = parseInt(messageSize);
    }

    const currentMessageByteSize = this.byteSize(JSON.stringify(message));

    if (messageByteSize >= currentMessageByteSize){
      const tempMessage = '0';

      return tempMessage.repeat(messageByteSize - currentMessageByteSize);
    }

    return '';
  };

  exports.randomNumberFromInterval = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  exports.createMessageToSend = function(messageSize, timestamp){
    const messageSizeString = typeof messageSize === 'string' ? messageSize : messageSize.toString();
    const messageObject = {
      sentTimestamp: timestamp,
      payload: ''
    };

    messageObject.payload = this.getMessagePayload(messageObject, messageSizeString);

    return messageObject;
  };
})(typeof exports === 'undefined' ? this['chat'] = {} : exports);