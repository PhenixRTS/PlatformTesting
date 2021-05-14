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
/* global request, MRecordRTC */

function getWebSDKVersion() {
  if (window['phenix-web-sdk']) {
    return 1;
  } else if (window['phenix']) {
    return 2;
  }

  error('Phenix web sdk not found!');
}

insertCommonScript();

function insertCommonScript() {
  let script = document.createElement('script');
  script.type = 'text/javascript';

  let sdkVersion = getWebSDKVersion();

  if (sdkVersion === 1) {
    console.log('Using SDK v1');
    script.src = '/common_v1.js';
  } else if (sdkVersion === 2) {
    console.log('Using SDK v2');
    script.src = '/common_v2.js';
  }

  let firstPageScript = document.getElementsByTagName('script').item(0);
  firstPageScript.parentNode.insertBefore(script, firstPageScript);
}

function logStat(msg) {
  console.info(`\n[Acceptance Testing] ${msg}`);
}

function log(msg) {
  let timestamp = new Date();
  console.info(`\n[Acceptance Testing] [${timestamp.toUTCString()}] ${msg}`);
}

function error(msg, elementId = 'subscriberError') {
  let timestamp = new Date();
  console.error(`[Acceptance Testing Error] [${timestamp.toUTCString()}] ${msg}`);
  showSubscriberError(msg, elementId);
}

function logErrorResponse(response) {
  console.error(`Response: {
    status: ${response.status},
    publisher: ${JSON.stringify(response.publisher, null, 2)},
    channelService: ${response.channelService}
  }`);
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

  return decodeURIComponent(results[2]);
}

function showPublisherErrorMessage(message) {
  document.getElementById('publisherError').innerHTML += message + '\n';
  error(message);
}

function showPublisherMessage(message) {
  document.getElementById('publisherMessage').innerHTML += message;
}

function showSubscriberError(message, elementId) {
  document.getElementById(elementId).innerHTML += `<br />${message}`;
}

function showChannelStatus(message, id = 'channelStatus') {
  document.getElementById(id).innerHTML += `<br />${message}`;
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

function startFpsStatsLogging(subscriberStream, getFpsStatsCallback) {
  setInterval(() => {
    if (subscriberStream === undefined) {
      error('Error: There is no subscriber stream! Is the channel online?');

      return;
    }

    subscriberStream.getStats(getFpsStatsCallback);
  }, 1000);
}

function logStreamAndSessionId(renderer, streamIdKey = 'Stream ID', sessionIdKey = 'Session ID') {
  log(`[${Date.now()}] Stream renderer received`);

  // 2020.1.1
  // log(`[${streamIdKey}] ${renderer.ji}`);
  // log(`[${sessionIdKey}] ${renderer.cr.Cr}`);

  // 2020.2.25
  log(`[${streamIdKey}] ${renderer.rt}`);
  log(`[${sessionIdKey}] ${renderer.j.Be}`);
}

async function validateThatThereIsNoOtherPublishers(backendUri, channelId) {
  const urlEncodedChannelId = encodeURIComponent(channelId);
  const requestUrl = `${backendUri}/channel/${urlEncodedChannelId}/publishers/count`;

  return new Promise(resolve => {
    request.fetchWithNoAuthorization('GET', requestUrl)
      .then(response => response.json())
      .then(result => {
        if (Number.isInteger(result)) {
          if (result === 0) {
            log('Validation successful - no other publisher in the room before publishing');
            resolve(true);
          } else {
            error(`There are [${result}] other publishers in the room before publishing`);
            resolve(false);
          }
        } else {
          showPublisherErrorMessage(`Error: Got response status [${result.status}] while trying to validate that there is no other publishers in the room (channel id [${channelId}])`);
          resolve(false);
        }
      });
  });
}

async function getChannelId(maxRequestChannelIdCount) {
  let channelId = undefined;
  let requestChannelIdCount = 0;
  while (channelId === undefined && requestChannelIdCount < maxRequestChannelIdCount) {
    channelId = await new Promise(resolve => {
      fetch('/channelId')
        .then(response => response.text())
        .then(text => {
          requestChannelIdCount += 1;

          if (text === '') {
            resolve(undefined);
          }

          resolve(text);
        });
    });

    if (channelId !== undefined) {
      return channelId;
    }

    if (requestChannelIdCount === maxRequestChannelIdCount) {
      showPublisherErrorMessage(`Error: Client was not able to retrieve channelId from server side`);

      return;
    }

    await new Promise(r => setTimeout(r, 1000));
  }
}