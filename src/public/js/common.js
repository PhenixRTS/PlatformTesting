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
/* global MRecordRTC */

const sdk = window['phenix-web-sdk'];

function log(msg) {
  console.info(`\n[Acceptance Testing] ${msg}`);
}

function error(msg) {
  console.error(`[Acceptance Testing Error] ${msg}`);
  showSubscriberError(msg);
}

function rgbToHex(color) {
  return '#' + ((1 << 24) + (color.r << 16) + (color.g << 8) + color.b).toString(16).slice(1);
}

function getUrlParams(key) {
  const url = window.location.search;

  const regex = new RegExp('[?&]' + key + '(=([^&#]*)|&|#|$)');
  const results = url.match(regex);

  if (!results) {
    return null;
  }

  if (!results[2]) {
    return '';
  }

  return results[2];
}

function getChannelUri(backendUri, isBackendPcastUri, alias, edgeToken = '') {
  let channelUriBase = backendUri;
  let edgeTokenQuery = '';

  if (isBackendPcastUri) {
    channelUriBase = channelUriBase.substring(
      0,
      channelUriBase.lastIndexOf('/')
    );
  }

  if (edgeToken) {
    edgeTokenQuery = `?edgeToken=${edgeToken}`;
  }

  return `${channelUriBase}/channel/${edgeTokenQuery}#${alias}`;
}

function joinChannel(videoElement, channelAlias, joinChannelCallback, subscriberCallback) {
  const backendUri = getUrlParams('backendUri');
  const pcastUri = getUrlParams('pcastUri');

  const edgeToken = getUrlParams('edgeToken');
  const authToken = getUrlParams('authToken');
  const streamToken = getUrlParams('streamToken');

  const featuresParam = getUrlParams('features');
  const features = featuresParam === undefined ? [] : featuresParam.split(',');
  const isBackendPcastUri = backendUri.substring(backendUri.lastIndexOf('/') + 1) === 'pcast';
  const backendUriWithPcast = isBackendPcastUri ? backendUri : `${backendUri}/pcast`;

  const adminApiProxyClient = new sdk.net.AdminApiProxyClient();
  adminApiProxyClient.setBackendUri(backendUriWithPcast);

  let channelOptions = {
    adminApiProxyClient,
    features,
    disableConsoleLogging: getUrlParams('disableConsoleLogging') === 'true',
    uri: pcastUri
  };

  let joinOptions = {
    videoElement,
    alias: channelAlias
  };

  if (authToken && streamToken || edgeToken) {
    channelOptions.authToken = edgeToken || authToken;
    joinOptions.streamToken = edgeToken || streamToken;
  }

  log(`Subscriber backend uri: ${backendUriWithPcast}`);
  log(`Subscriber PCast uri: ${pcastUri}`);

  log(`Joining channel ${getChannelUri(backendUri, isBackendPcastUri, channelAlias, edgeToken)}`);

  const channelExpress = new sdk.express.ChannelExpress(channelOptions);
  channelExpress.joinChannel(joinOptions, joinChannelCallback, subscriberCallback);

  return channelExpress;
}

function rejoinChannel(channelExpress, videoElement, alias, joinChannelCallback, subscriberCallback) {
  const options = {
    alias,
    videoElement
  };

  log(`Rejoining to the channel`);
  channelExpress.joinChannel(options, joinChannelCallback, subscriberCallback);
}

async function publishTo(channelAlias, stream, backendUri, pcastUri, channelName, publishCallback, createChannel) {
  log(`Publisher backend uri: ${backendUri}`);
  log(`Publisher PCast uri: ${pcastUri}`);

  const authToken = getUrlParams('authToken');
  const applicationId = getUrlParams('applicationId');
  const secret = getUrlParams('secret');
  const publisherAdminApiProxyClient = new sdk.net.AdminApiProxyClient();
  publisherAdminApiProxyClient.setBackendUri(backendUri);

  var channelExpressOptions = {
    adminApiProxyClient: publisherAdminApiProxyClient,
    disableConsoleLogging: getUrlParams('disableConsoleLogging') === 'true',
    uri: pcastUri
  };

  if (authToken !== '') {
    channelExpressOptions.authToken = authToken;
  } else if (applicationId !== '' && secret !== '') {
    channelExpressOptions.authToken = await getAuthToken(applicationId, secret);

    if (channelExpressOptions.authToken === undefined) {
      showPublisherErrorMessage(`Error: Will not publish - got undefined authToken [${channelExpressOptions.authToken}]`);

      return;
    }
  }

  var publishChannelExpress = new sdk.express.ChannelExpress(channelExpressOptions);
  log(`Created channel express with options: ${JSON.stringify(channelExpressOptions)}`);

  if (createChannel) {
    await publishChannelExpress.createChannel({
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
    });
  }

  var publishOptions = {
    capabilities: [
      'hd',
      'multi-bitrate'
    ],
    channel: {
      alias: channelAlias,
      name: channelName
    },
    userMediaStream: stream
  };

  const successCallback = () => {
    log(`Successfully validated that no other stream is playing`);
    publishChannelExpress.publishToChannel(publishOptions, publishCallback);

    return publishChannelExpress;
  };

  return await validateThatNoOtherStreamIsPlaying(publishChannelExpress, channelAlias, successCallback);
}

async function validateThatNoOtherStreamIsPlaying(channelExpress, channelAlias, successCallback) {
  channelExpress.joinChannel({alias: channelAlias}, (error, response) => {
    if (error) {
      showPublisherErrorMessage(`Error: Got error in join channel callback (while trying to validate that no other stream is playing before publishing): ${error}`);
    }

    if (response.status === 'room-not-found') {
      log(`Room was not found with channel alias [${channelAlias}] while validating that no other stream is playing before publishing`);
      successCallback();
    } else if (response.status !== 'ok') {
      showPublisherErrorMessage(`Error: Got response status [${response.status}] (while trying to validate that no other stream is playing before publishing)`);
    }
  }, (error, response) => {
    if (error) {
      showPublisherErrorMessage(`Error: Got error in subscriber callback (while trying to validate that no other stream is playing before publishing): ${error}`);

      return;
    }

    if (response.status !== 'no-stream-playing') {
      showPublisherErrorMessage('Error: Will not publish - there is other stream already playing!');

      return;
    }

    log('Validation succesful - no other stream is playing before publishing');
    successCallback();
  });
}

function stopPublisher(publisherChannelExpress) {
  publisherChannelExpress.dispose();

  /* eslint-disable no-undef */
  if (publisher) {
    publisher.stop();
    publisher = null;
  }
  /* eslint-enable no-undef */
}

function showPublisherErrorMessage(message) {
  document.getElementById('publisherError').innerHTML += message + '\n';
  error(message);
}

function showPublisherMessage(message) {
  document.getElementById('publisherMessage').innerHTML += message;
}

function showSubscriberError(message) {
  document.getElementById('subscriberError').innerHTML += `<br />${message}`;
}

function showChannelStatus(message) {
  document.getElementById('channelStatus').innerHTML += `<br />${message}`;
}

function startListeningToSubscriberAudioChanges(audioAnalyzer, mediaListenInterval, audioSampleRate, onChange) {
  if (audioAnalyzer === undefined) {
    error('Audio analyzer is undefined - cannot listen to audio changes!');

    return;
  }

  var previousFreq = 0;
  var frequenciesData = new Float32Array(audioAnalyzer.frequencyBinCount);

  setInterval(() => {
    audioAnalyzer.getFloatFrequencyData(frequenciesData);

    const indexOfMax = frequenciesData.indexOf(Math.max(... frequenciesData));
    var frequency = indexOfMax * audioSampleRate / audioAnalyzer.fftSize;
    frequency = Math.round(frequency / 100) * 100;

    if (frequency !== previousFreq) {
      onChange(frequency);
      previousFreq = frequency;
    }
  }, mediaListenInterval);
}

async function startMultimediaRecordingFor(timeMs, stream) {
  const mRecordRTC = new MRecordRTC();
  mRecordRTC.mimeType = {
    audio: 'audio/webm',
    video: 'video/webm'
  };
  mRecordRTC.mediaType = {
    audio: true,
    video: true,
    gif: false
  };
  mRecordRTC.addStream(stream);

  mRecordRTC.startRecording();
  log(`[Media Recording] Started multimedia (video and audio) recording for ${timeMs}ms`);

  setTimeout(() => {
    mRecordRTC.stopRecording(() => {
      mRecordRTC.writeToDisk();
      mRecordRTC.save({
        audio: 'm-recording-audio',
        video: 'm-recording-video'
      });
    });
  }, timeMs);
}

async function getAuthToken(applicationId, secret) {
  const authUrl = getUrlParams('publisherBackendUri') + '/auth';

  return new Promise(resolve => {
    fetch(authUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': '68',
        Authorization: 'Basic ' + btoa(applicationId + ':' + unescape(encodeURIComponent(secret)))
      }
    })
      .then(response => response.json())
      .then(result => {
        if (result.error || result.status !== 'ok') {
          document.getElementById('publisherAuthError').innerHTML = `
            Error: Could not get auth token with provided applicationId (${applicationId}) and secret (${secret}).
            Response status: ${result.status}
            Response error: ${result.error}
          `;
        }

        resolve(result.authenticationToken);
      });
  });
}