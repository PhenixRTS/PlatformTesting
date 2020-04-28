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

import config from '../../config.js';
import ChannelPage from '../models/channel-page.js';
import reporter from '../models/reporters/quality-reporter.js';

const common = require('./common');
const page = new ChannelPage();

global.fixture('Channel quality test')
  .page(`${config.localServerAddress}:${config.args.localServerPort}/${config.testPageUrlAttributes}`);

test(`Measure channel for ${config.args.testRuntime} and assert quality of video and audio`, async t => {
  await t
    .wait(3000)
    .expect(page.videoEl.exists).ok()
    .expect(page.offlineTitle.exists).notOk();

  await common.monitorStream(t, 'videoCanvasImg', 'videoEl');

  page.stats = await reporter.CollectMediaStreamStats();

  page.stats.default.meanVideoStats = await reporter.GetMeanVideoStats(page.stats.default);
  page.stats.default.meanAudioStats = await reporter.GetMeanAudioStats(page.stats.default);

  const {meanAudioStats, meanVideoStats} = page.stats.default;

  await page.asserts.assertKPIs(page.stats.default);
  await page.asserts.assertVideoQuality(meanVideoStats);
  await page.asserts.assertAudioQuality(meanAudioStats);

  await page.asserts.runAssertions();
}).after(async t => {
  await common.finishAndReport(__filename, page, t);
});