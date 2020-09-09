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

/* global log, getUrlParams, joinChannel, RecordRTC, error, startMultimediaRecordingFor */

let stream = undefined;
const channelInformation = `ChannelAlias [${getUrlParams('channelAlias')}], applicationId [${getUrlParams('applicationId')}], backendUri [${getUrlParams('backendUri')}]`;

document.addEventListener('DOMContentLoaded', () => {
  log(`[Url loaded] ${Date.now()}`);
  joinChannel(
    document.getElementById('videoEl'),
    getUrlParams('channelAlias'),
    joinChannelCallback,
    subscriberCallback
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
    if (response.channelService) {
      log('Successfully joined the channel');
    } else {
      error(`Error: [${response.channelService}] channel service in response from joining the channel. ${channelInformation}`);
    }
  }
}

function subscriberCallback(err, response) {
  if (err) {
    error(`Error in subscriber callback! ${channelInformation}. Error: [${err}]`);
  }

  if (response.status !== 'ok') {
    error(`Subscriber callback response status: [${response.status}]. ${channelInformation}. Error: [${err}]`);
  }

  if (response.renderer) {
    log(`[${Date.now()}] Stream renderer received`);
    log(`[Stream ID] ${response.renderer.ji}`);
    log(`[Session ID] ${response.renderer.cr.Cr}`);

    document.getElementById('videoEl').muted = false;

    response.renderer.on('autoMuted', () => {
      log(`[${Date.now()}] Stream was autoMuted`);
      document.getElementById('videoEl').muted = false;
      document.getElementById('videoEl').play();
    });

    response.renderer.on('failedToPlay', reason => {
      error(`Error: Failed to play stream. Reason: ${reason}`);
    });
  }

  log(`[Stream received] ${Date.now()}`);
  stream = response.mediaStream;
  startStatsLogging();
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

function startStatsLogging() {
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