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

const fetch = require('node-fetch');
const config = require('../../config.js');
const baseUrl = config.publisherArgs.publisherBackendUri;
const applicationId = config.args.applicationId;
const secret = config.publisherArgs.secret;
const base64authData = Buffer.from(`${applicationId}:${secret}`).toString('base64');

async function request(method, endpoint, body = null) {
  const requestConf = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${base64authData}`
    }
  };

  if (body !== null) {
    requestConf.body = JSON.stringify(body);
  }

  const response = await fetch(baseUrl + endpoint, requestConf);

  return await response;
}

async function createChannel(name, description = '', options = []) {
  const body = {
    channel: {
      alias: name,
      name,
      description,
      options
    }
  };

  return new Promise(resolve => {
    request('PUT', '/channel', body)
      .then(response => response.json())
      .then(result => {
        if (result.status !== 'ok') {
          console.error(`Got response status [${result.status}] when tried to create channel:`);
          console.log(result);
        }

        resolve(result.channel);
      });
  });
}

async function getChannelState(channelId) {
  const endpoint = `/channel/${encodeURIComponent(channelId)}/publishers/count`;
  const response = await request('GET', endpoint);

  return response.json();
}

async function deleteChannel(channelId) {
  return new Promise(resolve => {
    request('DELETE', `/channel/${encodeURIComponent(channelId)}`, {})
      .then(response => response.json())
      .then(result => {
        if (result.status !== 'ok') {
          console.error(`Got response status [${result.status}] when tried to delete channel:`);
          console.log(result);
        }

        resolve(result);
      });
  });
}

async function terminateStream(streamId, reason) {
  const body = {
    streamId,
    reason
  };

  await request('DELETE', '/stream', body);
}

module.exports = {
  createChannel,
  deleteChannel,
  getChannelState,
  terminateStream
};