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

import config from '../../config';
import ChannelPage from '../models/channel-page';
import reporter from '../models/reporters/lag-reporter';

const common = require('./common');
const page = new ChannelPage();
let createdChannel;

global.fixture(`Channel lag test${config.args.rtmpPushFile === '' ? '' : ' with RTMP push'}`)
  .page(`${config.localServerAddress}:${config.args.localServerPort}/lag${config.testPageUrlAttributes}`);

test(`Publish to channel for ${config.args.testRuntime} and assert lag of video/audio`, async t => {
  const isRtmpPush = config.args.rtmpPushFile !== '';

  if (isRtmpPush) {
    createdChannel = await common.initRtmpPush('lag_test');

    const publisherCount = await common.waitForPublisher(createdChannel.channelId);

    await t
      .expect(publisherCount)
      .eql(1, 'Failed to join the channel: publisher not ready');

    await common.subscribeFromClient(createdChannel.channelId);
  }

  await t
    .expect(Selector('video').withAttribute('id', 'publisherVideoContainer').exists).ok()
    .expect(Selector('video').withAttribute('id', 'subscriberVideoContainer').exists).ok()
    .expect(Selector('#publisherAuthError').innerText).notContains('Error', 'Got an error on publisher authentication')
    .wait(35 * 1000)
    .expect(Selector('#publisherError').innerText).notContains('Error', 'Got an error in publish callback');

  await common.monitorStream(t, 'subscriberCanvas');

  page.stats = await reporter.CollectMediaChanges();

  await page.asserts.assertVideoLag(isRtmpPush);
  await page.asserts.assertAudioLag(isRtmpPush);

  await page.asserts.reportAssertionResults();
}).after(async t => {
  await common.finishAndReport(__filename, page, t, createdChannel);
});