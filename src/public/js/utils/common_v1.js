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

/* eslint-disable no-unused-vars */
/* global MRecordRTC, request, getUrlParams, log, logStat, error, getChannelUri, showPublisherMessage, showPublisherErrorMessage, validateThatThereIsNoOtherPublishers, getChannelId */

const commonLoadedEvent = new Event('common_loaded');
const sdk = window['phenix-web-sdk'];
const maxRequestChannelIdCount = 10;

let channelExpress;
let channelId;
let didValidateThatThereIsNoOtherStream = false;

document.dispatchEvent(commonLoadedEvent);

function joinChannel(videoElement, channelAlias, joinChannelCallback, subscriberCallback, pcastUri = '') {
  const authToken = getUrlParams('authToken');
  const token = getUrlParams('streamToken');
  const channelOptions = {authToken};
  const joinOptions = {
    videoElement,
    token
  };

  if (channelExpress === undefined) {
    channelExpress = new sdk.express.ChannelExpress(channelOptions);
    log(`Subscriber PCast uri: ${pcastUri}`);
  }

  log(`Joining channel ${channelExpress.getPCastExpress().parseRoomOrChannelIdFromToken(token)}`);
  channelExpress.joinChannel(joinOptions, joinChannelCallback, subscriberCallback);

  return channelExpress;
}

function rejoinChannel(videoElement, alias, joinChannelCallback, subscriberCallback) {
  const options = {
    alias,
    videoElement
  };

  log(`Rejoining to the channel`);
  channelExpress.joinChannel(options, joinChannelCallback, subscriberCallback);
}

function startStatsLogging(stream) {
  setInterval(() => {
    if (stream === undefined) {
      error('Error: There is no media stream! Is the channel online?');

      return;
    }

    stream.getStats(getStatsCallback);
  }, 1000);
}

function getStatsCallback(stats) {
  stats.forEach(stat => {
    logStat(`[Media Stream Stats] ${JSON.stringify({
      timestamp: Date.now(),
      stat
    })}`);
  });
}

async function publishTo(channelAlias, stream, backendUri, pcastUri, channelName, publishCallback) {
  log(`Publisher backend uri: ${backendUri}`);
  log(`Publisher PCast uri: ${pcastUri}`);

  const authToken = getUrlParams('authToken');
  const edgeToken = getUrlParams('edgeToken');

  var channelExpressOptions = {
    disableConsoleLogging: getUrlParams('disableConsoleLogging') === 'true',
    uri: pcastUri,
    authToken: authToken
  };

  channelExpress = new sdk.express.ChannelExpress(channelExpressOptions);
  log(`Created channel express with options: ${JSON.stringify(channelExpressOptions)}`);

  var publishOptions = {userMediaStream: stream};

  if (edgeToken === '') {
    publishOptions.capabilities = [
      'hd',
      'multi-bitrate',
      'monitor-tracks'
    ];
  } else {
    publishOptions.token = edgeToken;
  }

  const successCallback = () => {
    log(`Successfully validated that it is safe to publish`);
    log(`Publishing using ChannelExpress with publish options: [${JSON.stringify(publishOptions)}]`);
    channelExpress.publishToChannel(publishOptions, publishCallback);

    return channelExpress;
  };

  channelId = await getChannelId(maxRequestChannelIdCount);

  if (channelId !== undefined) {
    await validateThatThereIsNoOtherPublishers(backendUri, channelId).then((thereIsNoPublisher) => {
      successCallback();

      return thereIsNoPublisher;
    });
  }
}

function stopPublisher(publisherChannelExpress) {
  if (publisherChannelExpress) {
    publisherChannelExpress.dispose();
  }

  /* eslint-disable no-undef */
  if (publisher) {
    publisher.stop();
    publisher = null;
  }
  /* eslint-enable no-undef */
}