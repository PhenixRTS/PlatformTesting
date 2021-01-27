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
/* global MRecordRTC, request, getUrlParams, log, error, getChannelUri, showPublisherMessage, showPublisherErrorMessage */

const commonLoadedEvent = new Event('common_loaded');
const sdk = window['phenix-web-sdk'];

let adminApiProxyClient;
let channelExpress;
let channelId;
let didValidateThatThereIsNoOtherStream = false;

document.dispatchEvent(commonLoadedEvent);

function joinChannel(videoElement, channelAlias, joinChannelCallback, subscriberCallback) {
  const backendUri = getUrlParams('backendUri');
  const edgeToken = getUrlParams('edgeToken');
  const authToken = getUrlParams('authToken');
  const streamToken = getUrlParams('streamToken');

  const isBackendPcastUri = backendUri.substring(backendUri.lastIndexOf('/') + 1) === 'pcast';

  let joinOptions = {
    videoElement,
    alias: channelAlias
  };

  if (authToken && streamToken || edgeToken) {
    joinOptions.streamToken = edgeToken || streamToken;
  }

  if (channelExpress === undefined) {
    const pcastUri = getUrlParams('pcastUri');
    const featuresParam = getUrlParams('features');
    const features = featuresParam === undefined ? [] : featuresParam.split(',');

    initialiseAdminProxyClient(backendUri, isBackendPcastUri);

    let channelOptions = {
      adminApiProxyClient,
      features,
      disableConsoleLogging: getUrlParams('disableConsoleLogging') === 'true',
      uri: pcastUri
    };

    if (authToken && streamToken || edgeToken) {
      channelOptions.authToken = edgeToken || authToken;
    }

    channelExpress = new sdk.express.ChannelExpress(channelOptions);
    log(`Subscriber PCast uri: ${pcastUri}`);
  }

  log(`Joining channel ${getChannelUri(backendUri, isBackendPcastUri, channelAlias, edgeToken)}`);
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

function initialiseAdminProxyClient(backendUri, isBackendPcastUri) {
  if (adminApiProxyClient === undefined) {
    const backendUriWithPcast = isBackendPcastUri ? backendUri : `${backendUri}/pcast`;
    log(`Subscriber backend uri: ${backendUriWithPcast}`);

    adminApiProxyClient = new sdk.net.AdminApiProxyClient();
    adminApiProxyClient.setBackendUri(backendUriWithPcast);
  }
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
    log(`[Media Stream Stats] ${JSON.stringify({
      timestamp: Date.now(),
      stat
    })}`);
  });
}

async function publishTo(channelAlias, stream, backendUri, pcastUri, channelName, publishCallback, createChannel) {
  log(`Publisher backend uri: ${backendUri}`);
  log(`Publisher PCast uri: ${pcastUri}`);

  const authToken = getUrlParams('authToken');
  const edgeToken = getUrlParams('edgeToken');
  const applicationId = getUrlParams('applicationId');
  const secret = getUrlParams('secret');

  initialiseAdminProxyClient(backendUri, true);

  var channelExpressOptions = {
    adminApiProxyClient: adminApiProxyClient,
    disableConsoleLogging: getUrlParams('disableConsoleLogging') === 'true',
    uri: pcastUri,
    authToken: authToken
  };

  channelExpress = new sdk.express.ChannelExpress(channelExpressOptions);
  log(`Created channel express with options: ${JSON.stringify(channelExpressOptions)}`);

  var publishOptions = {
    channel: {
      alias: channelAlias,
      name: channelName
    },
    userMediaStream: stream
  };

  if (edgeToken === '') {
    publishOptions.capabilities = [
      'hd',
      'multi-bitrate'
    ];
  } else {
    publishOptions.streamToken = edgeToken;
  }

  const successCallback = () => {
    log(`Successfully validated that it is safe to publish`);
    channelExpress.publishToChannel(publishOptions, publishCallback);

    return channelExpress;
  };

  if (createChannel) {
    await channelExpress.createChannel({
      channel: {
        name: channelName,
        alias: channelAlias
      }
    }, (error, response) => {
      if (error) {
        showPublisherErrorMessage(`Error: Got error in createChannel callback [${error}]`);
      }

      if (response.status === 'already-exists') {
        showPublisherMessage('Channel already exists');
      }

      if (response.channelService) {
        showPublisherMessage('Successfully created channel');
      } else if (response.status !== 'ok') {
        showPublisherMessage(`Got response status [${response.status}] in createChannel callback`);
      }

      channelId = response.channel.getChannelId();
      log(`[Channel ID] ${channelId}`);

      return validateThatThereIsNoOtherPublishers(backendUri, successCallback);
    });
  } else {
    return await validateThatThereIsNoOtherPublishers(backendUri, successCallback);
  }
}

async function validateThatThereIsNoOtherPublishers(backendUri, successCallback) {
  const urlEncodedChannelId = encodeURIComponent(channelId);
  const requestUrl = `${backendUri}/channel/${urlEncodedChannelId}/publishers/count`;

  return new Promise(resolve => {
    request.fetchWithNoAuthorization('GET', requestUrl)
      .then(response => response.json())
      .then(result => {
        if (Number.isInteger(result) && result === 0) {
          didValidateThatThereIsNoOtherStream = true;
          log('Validation successful - no other publisher in the room before publishing');
          successCallback();
          resolve(result);
        } else {
          showPublisherErrorMessage(`Error: Got response status [${result.status}] while trying to validate that there is no other publishers in the room (channel id [${channelId}])`);
        }
      });
  });
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