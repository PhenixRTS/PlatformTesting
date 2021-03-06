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

/* global log, logStat, getUrlParams, joinChannel, RecordRTC, error, startMultimediaRecordingFor, startStatsLogging, logStreamAndSessionId, getWebSDKVersion */

let stream = undefined;
let channelInformation;

document.addEventListener('common_loaded', () => {
  channelInformation = `ChannelAlias [${getUrlParams('channelAlias')}], applicationId [${getUrlParams('applicationId')}], backendUri [${getUrlParams('backendUri')}]`;
  logStat(`[Url loaded] ${Date.now()}`);

  let sdkVersion = getWebSDKVersion();
  let callback = channelJoinedCallback;

  if (sdkVersion === 1) {
    callback = subscriberCallback;
  }

  joinChannel(
    document.getElementById('videoEl'),
    getUrlParams('channelAlias'),
    joinChannelCallback,
    callback
  );
});

function joinChannelCallback(err, response) {
  if (err) {
    error(`Failed to join the channel! ${channelInformation}. Error: [${err}]`);
  }

  if (response.status !== 'ok') {
    error(`Join channel callback response status: [${response.status}]. ${channelInformation}. Error: [${err}]`);
  }

  if (response.status === 'ok') {
    logStat(`[Channel Type] Channel`);

    if (response.channelService) {
      log('Successfully joined the channel');
    } else {
      error(`Error: [${response.channelService}] channel service in response from joining the channel. ${channelInformation}`);
    }
  }
}

// SDK v2 callback
function channelJoinedCallback() {
  startStatsLogging(stream);
  startRecordings();
  startScreenshots();
}

// SDK v1 callback
function subscriberCallback(err, response) {
  if (err) {
    error(`Error in subscriber callback! ${channelInformation}. Error: [${err}]`);
  }

  if (response.status !== 'ok') {
    error(`Subscriber callback response status: [${response.status}]. ${channelInformation}. Error: [${err}]`);
  }

  if (response.renderer) {
    logStreamAndSessionId(response.renderer);

    const subscriberVideoEl = document.getElementById('videoEl');
    subscriberVideoEl.muted = false;

    response.renderer.on('autoMuted', () => {
      log(`[${Date.now()}] Stream was autoMuted`);
      subscriberVideoEl.muted = false;
    });

    response.renderer.on('failedToPlay', reason => {
      error(`Error: Failed to play stream. Reason: ${reason}`);
    });
  }

  logStat(`[Stream received] ${Date.now()}`);
  stream = response.mediaStream;

  startStatsLogging(stream);
  startRecordings();
  startScreenshots();
}

function startRecordings() {
  const recordMs = getUrlParams('recordMs');
  const recordMedia = getUrlParams('media');

  if (recordMs <= 0) {
    return;
  }

  if (recordMedia.includes('video') && recordMedia.includes('audio')) {
    startMultimediaRecordingFor(recordMs, stream.Zo);
  } else {
    if (recordMedia.includes('audio')) {
      startAudioRecordingFor(recordMs);
    }

    if (recordMedia.includes('video')) {
      startVideoRecordingFor(recordMs);
    }
  }
}

function startVideoRecordingFor(timeMs) {
  const videoRecorder = new RecordRTC(stream.Zo, {
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
  const audioRecorder = new RecordRTC(stream.Zo, {type: 'audio'});
  audioRecorder.startRecording();
  log(`[Media Recording] Started audio recording for ${timeMs}ms`);

  setTimeout(() => {
    audioRecorder.stopRecording(() => {
      audioRecorder.save('recording-audio');
    });
  }, timeMs);
}

function startScreenshots() {
  const screenshotIntervalMs = getUrlParams('screenshotIntervalMs');

  if (screenshotIntervalMs > 0) {
    setInterval(() => {
      captureImage();
    }, screenshotIntervalMs);
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
  link.setAttribute('download', `${getUrlParams('screenshotName')}.jpg`);
  link.setAttribute('target', '_blank');
  link.style.display = 'none';
  link.click();
}