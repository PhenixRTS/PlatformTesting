/**
 * Copyright 2019 Phenix Real Time Solutions, Inc. All Rights Reserved.
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
const baseUrl = config.args.publisherBackendUri;
const applicationId = config.args.applicationId;
const secret = config.args.secret;
const base64authData = Buffer.from(`${applicationId}:${secret}`).toString('base64');

async function request(method, endpoint, body) {
  const response = await fetch(baseUrl + endpoint, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${base64authData}`
    },
    body: JSON.stringify(body)
  });
  let responseBody = await response.text();

  try {
    responseBody = JSON.parse(responseBody);
  } catch (err) {
    console.log(responseBody);
    console.log(err);
  }

  return responseBody;
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

  return response.channel;
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
  terminateStream
};