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
  const response = await request('PUT', '/channel', body);

  if (response.error || response.statusCode !== 200) {
    console.error(`Got response status [${response.status}] when tried to create channel:`);
    console.log(response);
  }

  return response.json().channel;
}

async function getChannelState(channelId) {
  const endpoint = `/channel/${encodeURIComponent(channelId)}/publishers/count`;
  const response = await request('GET', endpoint);

  return response.json();
}

async function deleteChannel(channelId) {
  await request('DELETE', `/channel/${encodeURIComponent(channelId)}`, {});
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