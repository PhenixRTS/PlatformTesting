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
  joinChannel(document.getElementById('videoEl'));
});

function joinChannel(videoEl) {
  const adminApiProxyClient = new sdk.net.AdminApiProxyClient();
  adminApiProxyClient.setBackendUri('https://demo.phenixrts.com/pcast');

  var features = getUrlParams('features') === undefined ? '' : getUrlParams('features').split(',');

  var channelExpress = new sdk.express.ChannelExpress(
    {
      adminApiProxyClient: adminApiProxyClient,
      features: features
    }
  );

  var options = {
    alias: 'clock',
    videoElement: videoEl
  };

  channelExpress.joinChannel(options, joinChannelCallback, subscriberCallback);
}

function joinChannelCallback(error, response) {
  if (error) {
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

  stream = response.mediaStream;
  startStatsLogging();
}

function startStatsLogging() {
  setInterval(() => {
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