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

import {Selector} from 'testcafe';
import uaParser from 'ua-parser-js';

import config from '../../config.js';
import ChannelPage from '../models/channel-page.js';
import reporter from '../models/reporters/sync-reporter.js';

const common = require('./common');
const page = new ChannelPage();
let createdChannel;

global.fixture(`Channel sync test${config.args.rtmpPushFile === '' ? '' : ' with RTMP push'}`)
  .page(`${config.localServerAddress}:${config.args.localServerPort}/sync${config.testPageUrlAttributes}`);

test(`Publish to channel for ${config.args.testRuntime} and assert sync of video and audio`, async t => {
  const {rtmpPushFile, testRuntimeMs} = config.args;
  const ua = await common.getUA();
  const isRtmpPush = rtmpPushFile !== '';

  if (isRtmpPush) {
    createdChannel = await common.initRtmpPush('sync_test');
    const publisherCount = await common.waitForPublisher(createdChannel.channelId);

    await t
      .expect(publisherCount)
      .eql(1, 'Failed to join the channel: publisher not ready');

    await common.subscribeFromClient(createdChannel.channelId);
  }

  await t
    .expect(Selector('video').withAttribute('id', 'publisherVideoContainer').exists).ok()
    .expect(Selector('video').withAttribute('id', 'subscriberVideoContainer').exists).ok()
    .wait(35 * 1000)
    .expect(Selector('#publisherError').innerText).notContains('error', 'Got an error in publish callback')
    .wait(testRuntimeMs);

  page.browser = uaParser(ua).browser;
  page.stats = await reporter.CollectMediaChanges();

  await page.asserts.assertSync();
}).after(async t => {
  await common.finishAndReport(__filename, t.ctx.testFailed, page, t, createdChannel);
});