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

global
  .fixture(`Room quality test with multiple members`)
  .page(
    `${config.localServerAddress}:${config.args.localServerPort}/room${config.testPageUrlAttributes}`
  );

test(`Monitor room for ${config.args.testRuntime} with multiple members and assert quality of video and audio`, async t => {
  const {screenName} = config.args;

  let memberError = 'There is no member in the room';

  if (screenName) {
    memberError += ` with provided screen name ${screenName}`;
  }

  await t
    .wait(10000)
    .expect(page.videoEl.exists)
    .ok(memberError)
    .expect(page.offlineTitle.exists)
    .notOk();

  await common.monitorRoomStreams(t);

  page.stats = await reporter.CollectMediaStreamStats();

  for (const memberID in page.stats) {
    page.stats[memberID].meanVideoStats = await reporter.GetMeanVideoStats(page.stats[memberID]);
    page.stats[memberID].meanAudioStats = await reporter.GetMeanAudioStats(page.stats[memberID]);

    const {meanAudioStats, meanVideoStats} = page.stats[memberID];

    await page.asserts.assertKPIs(page.stats[memberID]);
    await page.asserts.assertVideoQuality(meanVideoStats);
    await page.asserts.assertAudioQuality(meanAudioStats, memberID);
  }

  await page.asserts.runAssertions();
}).after(async t => {
  await common.finishAndReport(__filename, page, t);
});