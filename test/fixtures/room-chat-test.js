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
import {Selector} from 'testcafe';
import reporter from '../models/reporters/chat-reporter';
import * as common from './common';

const page = new ChannelPage();

global
  .fixture(`Room chat test`)
  .page(
    `${config.localServerAddress}:${config.args.localServerPort}/chat${config.testPageUrlAttributes}`
  );

test(`Monitor room for ${config.args.testRuntime} with multiple members and assert chat quality`, async t => {
  await t
    .expect(Selector('#roomError').innerText)
    .notContains('Error', 'Error: Unable to join the room!', {timeout: 5 * 1000});

  await common.monitorRoomChat(t);

  page.stats = await reporter.CollectChatStats();

  if (config.args.mode === 'send'){
    await page.asserts.assertSenderChat(page.stats);
  }

  if (config.args.mode === 'receive'){
    await page.asserts.assertReceiverChat(page.stats);
  }
});