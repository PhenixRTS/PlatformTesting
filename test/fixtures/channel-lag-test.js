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
import reporter from '../models/reporters/lag-reporter.js';

const common = require('./common');
const page = new ChannelPage();
let createdChannel;

global.fixture('Channel lag test')
  .page(`${config.localServerAddress}:${config.args.localServerPort}/lag${config.testPageUrlAttributes}`);

test(`Publish to channel for ${config.args.testRuntime} and assert lag of video/audio`, async t => {
  const {rtmpPushFile, testRuntimeMs, channelJoinRetries} = config.args;
  const ua = await common.getUA();

  if (rtmpPushFile !== '') {
    createdChannel = await common.initRtmpPush('lag_test');

    const joinTimeout = channelJoinRetries === 0 ? 30000 : channelJoinRetries * 5000;

    await t
      .expect(Selector('#channelStatus').innerText)
      .contains('ok', 'Failed to join the channel', {timeout: joinTimeout});
  }

  await t
    .expect(Selector('video').withAttribute('id', 'publisherVideoContainer').exists).ok()
    .expect(Selector('video').withAttribute('id', 'subscriberVideoContainer').exists).ok()
    .wait(35 * 1000)
    .expect(Selector('#publisherError').innerText).notContains('error', 'Got an error in publish callback')
    .wait(testRuntimeMs);

  page.browser = uaParser(ua).browser;
  page.stats = await reporter.CollectMediaChanges();

  await page.asserts.assertVideoLag();
  await page.asserts.assertAudioLag(isRtmpPush);
}).after(async t => {
  await common.finishAndReport(__filename, t.ctx.testFailed, page, t, createdChannel);
});