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

/* eslint-disable no-unused-vars */

var sdk = window['phenix-web-sdk'];

function log(msg) {
  console.info(`\n[Acceptance Testing] ${msg}`);
}

function error(msg) {
  console.error(`[Acceptance Testing Error] ${msg}`);
}

function rgbToHex(color) {
  return '#' + ((1 << 24) + (color.r << 16) + (color.g << 8) + color.b).toString(16).slice(1);
}

function getUrlParams(key) {
  var arr = window.location.search.slice(1).split('&');
  var params = {};

  for (const param of arr) {
    const [key, val] = param.split('=');
    params[key] = val;
  }

  return params[key];
}

function joinChannel(videoEl, channelAlias, joinChannelCallback, subscriberCallback) {
  const backendUri = getUrlParams('backendUri');
  const pcastUri = getUrlParams('pcastUri');
  log(`Subscriber backend uri: ${backendUri}`);
  log(`Subscriber PCast uri: ${pcastUri}`);

  const adminApiProxyClient = new sdk.net.AdminApiProxyClient();
  adminApiProxyClient.setBackendUri(backendUri);

  var features = getUrlParams('features') === undefined ? '' : getUrlParams('features').split(',');
  var channelExpress = new sdk.express.ChannelExpress({
    adminApiProxyClient: adminApiProxyClient,
    disableConsoleLogging: true,
    features: features,
    uri: pcastUri
  });

  var options = {
    alias: channelAlias,
    videoElement: videoEl
  };

  channelExpress.joinChannel(options, joinChannelCallback, subscriberCallback);
}

function publishTo(channelAlias, stream, backendUri, pcastUri, channelName, publishCallback) {
  log(`Publisher backend uri: ${backendUri}`);
  log(`Publisher PCast uri: ${pcastUri}`);

  const publisherAdminApiProxyClient = new sdk.net.AdminApiProxyClient();
  publisherAdminApiProxyClient.setBackendUri(backendUri);

  var publishChannelExpress = new sdk.express.ChannelExpress({
    adminApiProxyClient: publisherAdminApiProxyClient,
    disableConsoleLogging: true,
    uri: pcastUri
  });

  var publishOptions = {
    capabilities: [
      'hd',
      'multi-bitrate'
    ],
    room: {
      alias: channelAlias,
      name: channelName
    },
    userMediaStream: stream
  };

  publishChannelExpress.publishToChannel(publishOptions, publishCallback);
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
  mRecordRTC.addStream(stream);
  mRecordRTC.mediaType = {
    audio: true,
    video: true,
    gif: false
  };
  mRecordRTC.mimeType = {
    audio: 'audio/wav',
    video: 'video/webm'
  };
  mRecordRTC.startRecording();
  log(`[Media Recording] Started multimedia (video and audio) recording for ${timeMs}ms`);

  setTimeout(() => {
    mRecordRTC.stopRecording(() => {
      const audioBlob = mRecordRTC.getBlob().audio;
      const videoBlob = mRecordRTC.getBlob().video;

      mRecordRTC.writeToDisk({
        audio: audioBlob,
        video: videoBlob
      });

      mRecordRTC.save({
        audio: 'm-recording-audio',
        video: 'm-recording-video'
      });
    });
  }, timeMs);
}