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

const sdk = window['phenix-web-sdk'];
let stream = undefined;

document.addEventListener('DOMContentLoaded', () => {
  log(`[Url loaded] ${Date.now()}`);
  joinChannel(document.getElementById('videoEl'));
});

function joinChannel(videoEl) {
  const backendUri = getUrlParams('backendUri');
  const pcastUri = getUrlParams('pcastUri');
  log(`Backend uri: ${backendUri}`);
  log(`Pcast uri: ${pcastUri}`);

  const adminApiProxyClient = new sdk.net.AdminApiProxyClient();
  adminApiProxyClient.setBackendUri(backendUri);

  const features = getUrlParams('features') === undefined ? '' : getUrlParams('features').split(',');
  const channelExpress = new sdk.express.ChannelExpress({
    adminApiProxyClient: adminApiProxyClient,
    features: features,
    uri: pcastUri
  });
  const options = {
    alias: getUrlParams('channelAlias'),
    videoElement: videoEl
  };

  channelExpress.joinChannel(options, joinChannelCallback, subscriberCallback);
}

function joinChannelCallback(error, response) {
  if (error) {
    log('Failed to join channel!');
    log(error);
    console.error(error);
  }

  if (response.status === 'room-not-found') {
    console.warn('Room not found');
  } else if (response.status !== 'ok') {
    console.error(error);
  }

  if (response.status === 'ok' && response.channelService) {
    log('Successfully joined channel');
  }
}

function subscriberCallback(error, response) {
  if (error) {
    console.error(error);
  }

  if (response.status === 'no-stream-playing') {
    console.warn('No stream playing');
  } else if (response.status !== 'ok') {
    console.error(error);
  }

  if (response.renderer) {
    log(`[${Date.now()}] Stream renderer received`);
    response.renderer.on('autoMuted', () => {
      log(`[${Date.now()}] Stream was autoMuted`);
      document.getElementById('videoEl').muted = false;
      document.getElementById('videoEl').play();
    });

    response.renderer.on('failedToPlay', (reason) => {
      err(`Failed to play stream. Reason: ${reason}`);
    });
  }

  log(`[Stream received] ${Date.now()}`);
  stream = response.mediaStream;
  startStatsLogging();
  startRecordings();
  startScreenshots();
}

function startRecordings() {
  const recordingMs = getUrlParams('recordingMs');
  const recordingMedia = getUrlParams('recordingMedia');

  if (recordingMs <= 0) {
    return;
  }

  if (recordingMedia.includes('video') && recordingMedia.includes('audio')) {
    startMultimediaRecordingFor(recordingMs);
  } else {
    if (recordingMedia.includes('audio')) {
      startAudioRecordingFor(recordingMs);
    }

    if (recordingMedia.includes('video')) {
      startVideoRecordingFor(recordingMs);
    }
  }
}

function startStatsLogging() {
  setInterval(() => {
    if (stream === undefined) {
      throw Error('There is no media stream! Is the channel online?');
    }

    stream.getStats(getStatsCallback);
  }, 1000);
}

function getStatsCallback(stats) {
  stats.forEach((stat) => {
    log(`[Media Stream Stats] ${JSON.stringify(stat)}`);
  });
}

function log(msg) {
  console.info(`\n[Acceptance Testing] ${msg}`);
}

function err(msg) {
  console.error(`[Acceptance Testing Error] ${msg}`);
}

function getUrlParams(key) {
  const arr = window.location.search.slice(1).split('&');
  const params = {};

  for (let i = 0; i < arr.length; i++) {
    const paramKey = arr[i].split('=')[0];
    const paramVal = arr[i].split('=')[1];
    params[paramKey] = paramVal;
  }

  return params[key];
}

function startVideoRecordingFor(timeMs) {
  const videoRecorder = new RecordRTC(stream.Ys, { // eslint-disable-line no-undef
    type: 'video',
    ignoreMutedMedia: false
  });
  videoRecorder.startRecording();
  log(`[Media Recording] Started video recording for ${timeMs}ms`);

  setTimeout(() => {
    videoRecorder.stopRecording(() => {
      videoRecorder.save('recording-video');
    });
  }, timeMs);
}

function startAudioRecordingFor(timeMs) {
  const audioRecorder = new RecordRTC(stream.Ys, {type: 'audio'}); // eslint-disable-line no-undef
  audioRecorder.startRecording();
  log(`[Media Recording] Started audio recording for ${timeMs}ms`);

  setTimeout(() => {
    audioRecorder.stopRecording(() => {
      audioRecorder.save('recording-audio');
    });
  }, timeMs);
}

async function startMultimediaRecordingFor(timeMs) {
  const mRecordRTC = new MRecordRTC(); // eslint-disable-line no-undef
  mRecordRTC.addStream(stream.Ys);
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

function startScreenshots() {
  const screenshotAfterMs = getUrlParams('screenshotAfterMs');

  if (screenshotAfterMs > 0) {
    setInterval(() => {
      captureImage();
    }, screenshotAfterMs);
  }
}

function captureImage() {
  const imageEl = document.getElementById('capturedImages');
  const videoEl = document.getElementById('videoEl');
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const img = document.createElement('img');
  img.src = canvas.toDataURL();
  imageEl.prepend(img);

  download(canvas.toDataURL());
}

function download(dataUrl) {
  const link = document.createElement('a');
  link.setAttribute('href', dataUrl);
  link.setAttribute('download', `${getUrlParams('downloadImgName')}.jpg`);
  link.setAttribute('target', '_blank');
  link.style.display = 'none';
  link.click();
}