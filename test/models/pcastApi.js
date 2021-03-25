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
const Logger = require('../../scripts/logger.js');
const logger = new Logger('REST API');
const math = require('./math.js');

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

async function createOrGetChannel(name, description = '', options = []) {
  const body = {
    channel: {
      alias: name,
      name,
      description,
      options
    }
  };

  return new Promise((resolve, reject) => {
    request('PUT', '/channel', body)
      .then(response => response.json())
      .then(result => {
        config.createdChannel.channelStatus = result.status;

        if (result.status === 'ok') {
          console.log(`Created channel with alias [${name}] id [${result.channel.channelId}]`);
          config.createdChannel.channelId = result.channel.channelId;
          resolve(result.channel);
        } else if (result.status === 'already-exists') {
          console.log(`Using already-existing channel with alias [${name}] id [${result.channel.channelId}]`);
          config.createdChannel.channelId = result.channel.channelId;
          resolve(result.channel);
        } else {
          console.log(result);
          reject(Error(`Got response status [${result.status}] when tried to create channel`));
        }
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
          console.error(`Got response status [${result.status}] when tried to delete channel with id [${channelId}]`);
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

async function postToTelemetry(records) {
  logger.log('Posting telemetry records...');

  return new Promise(resolve => {
    const uri = `${config.args.telemetryURI}/telemetry/metrics`;
    const requestConf = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: ''
    };

    const oneCharacterSizeInBits = 8;
    const maxBitsSizeForOneTemelemetryPostRequestBody = 1024 * oneCharacterSizeInBits;
    let recordChunkSize = records.length;
    let chunkedRecords = [records];

    // 1. Split all records in chunks ([[...], [...]]) until each chunk is less than max supported one POST request body size
    while (JSON.stringify(chunkedRecords[0]).length > maxBitsSizeForOneTemelemetryPostRequestBody) {
      recordChunkSize -= 1;
      chunkedRecords = math.chunk(records, recordChunkSize);
    }

    // 2. Post each record chunk (which is now less than max supported size) to telemetry
    chunkedRecords.forEach(async(chunk) => {
      requestConf.body = JSON.stringify({records: chunk});
      await fetch(uri, requestConf)
        .then(response => {
          if (response.status === 200) {
            logger.log(`Successfully posted [${chunk.length}] records to telemetry [${uri}]. Response status [${response.status}]`);
          } else {
            console.error(`Got response status [${response.status}] when posting to telemetry [${uri}].`, response);
          }
        });
    });

    resolve();
  });
}

module.exports = {
  createOrGetChannel,
  deleteChannel,
  getChannelState,
  terminateStream,
  postToTelemetry
};