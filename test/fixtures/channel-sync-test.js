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

import {Selector} from 'testcafe';

import config from '../../config.js';
import ChannelPage from '../models/channel-page.js';
import reporter from '../models/reporters/sync-reporter.js';

const common = require('./common');
const page = new ChannelPage();
let createdChannel;

global.fixture(`Channel sync test${config.rtmpPushArgs.rtmpPushFile === '' ? '' : ' with RTMP push'}`)
  .page(`${config.localServerAddress}:${config.args.localServerPort}/sync${config.testPageUrlAttributes}`);

test(`Publish to channel for ${config.args.testRuntime} and assert sync of video and audio`, async t => {
  const {rtmpPushFile} = config.rtmpPushArgs;
  const isRtmpPush = rtmpPushFile !== '';

  createdChannel = await common.createOrGetChannel(t);
  console.log(`Did create or got channel [${createdChannel.channelId}]`);

  if (isRtmpPush) {
    await common.initRtmpPush('sync_test', createdChannel);
  }

  const publisherCount = await common.waitForPublisher(createdChannel.channelId);

  await t
    .expect(publisherCount)
    .eql(1, 'Failed to join the channel: publisher not ready');

  await common.subscribeFromClient(createdChannel.channelId);

  await t
    .expect(Selector('video').withAttribute('id', 'publisherVideoContainer').exists).ok()
    .expect(Selector('video').withAttribute('id', 'subscriberVideoContainer').exists).ok()
    .expect(Selector('#publisherAuthError').innerText).notContains('Error', 'Got an error on publisher authentication')
    .expect(Selector('#publisherError').innerText).notContains('error', 'Got an error in publish callback', {timeout: 35 * 1000})
    .expect(Selector('#subscriberError').innerText).notContains('Error', 'Got an error in subscriber callback', {timeout: 35 * 1000});

  await common.monitorStream(t, 'subscriberCanvas');

  page.stats = await reporter.CollectMediaChanges();

  await page.asserts.assertSync();

  await page.asserts.reportAssertionResults();
}).after(async t => {
  await common.finishAndReport(__filename, page, t, createdChannel);
});