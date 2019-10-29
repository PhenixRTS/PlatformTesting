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

var sdk = window['phenix-web-sdk'];
var stream = undefined;

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

  var features = getUrlParams('features') === undefined ? '' : getUrlParams('features').split(',');
  var channelExpress = new sdk.express.ChannelExpress({
    adminApiProxyClient: adminApiProxyClient,
    features: features,
    uri: pcastUri
  });

  var options = {
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
  var arr = window.location.search.slice(1).split('&');
  var params = {};

  for (var i = 0; i < arr.length; i++) {
    var paramKey = arr[i].split('=')[0];
    var paramVal = arr[i].split('=')[1];
    params[paramKey] = paramVal;
  }

  return params[key];
}