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

function log(msg) {
  console.info(`\n[Acceptance Testing] ${msg}`);
}

function error(msg) { // eslint-disable-line no-unused-vars
  console.error(`[Acceptance Testing Error] ${msg}`);
}

function rgbToHex(color) { // eslint-disable-line no-unused-vars
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

function joinChannel(videoEl, channelAlias, joinChannelCallback, subscriberCallback) { // eslint-disable-line no-unused-vars
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