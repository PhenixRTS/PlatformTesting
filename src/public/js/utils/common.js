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

let adminApiProxyClient;
let channelExpress;
let didValidateThatThereIsNoOtherStream = false;

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
    streamToken: edgeToken,
    userMediaStream: stream
  };

  const successCallback = () => {
    log(`Successfully validated that no other stream is playing`);
    channelExpress.publishToChannel(publishOptions, publishCallback);

    return channelExpress;
  };

  return await validateThatNoOtherStreamIsPlaying(channelAlias, successCallback);
}

async function validateThatNoOtherStreamIsPlaying(channelAlias, successCallback) {
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
    if (didValidateThatThereIsNoOtherStream) {
      log('Join channel callback has been triggered again. The tool already did validate that there is no other stream - skipping it this time');

      return;
    }

    if (error) {
      showPublisherErrorMessage(`Error: Got error in subscriber callback (while trying to validate that no other stream is playing before publishing): ${error}`);

      return;
    }

    if (response.status !== 'no-stream-playing') {
      showPublisherErrorMessage(`Error: Will not publish - looks like there is other stream already playing! Expected status [no-stream-playing] but got [${response.status}] instead`);

      return;
    }

    didValidateThatThereIsNoOtherStream = true;
    log('Validation succesful - no other stream is playing before publishing');
    successCallback();
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

function startFpsStatsLogging(subscriberStream, getStatsCallback) {
  setInterval(() => {
    if (subscriberStream === undefined) {
      error('Error: There is no subscriber stream! Is the channel online?');

      return;
    }

    subscriberStream.getStats(getStatsCallback);
  }, 1000);
}