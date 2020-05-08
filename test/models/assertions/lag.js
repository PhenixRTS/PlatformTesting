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

import {t} from 'testcafe';

import config from '../../../config';
import constants from '../../../shared/constants';

import math from '../math';
import rtmp from '../rtmp-push';

const getPublisherVideoStats = (logs, isRtmp, streamReceivedAt) => {
  if (isRtmp) {
    return [];
  }

  return logs.filter(el => el.timestamp >= streamReceivedAt - 10);
};

const getSubscriberVideoStats = (logs, isRtmp) => {
  const {color, time} = constants.lagType;
  const type = isRtmp ? time : color;

  return logs.filter(el => el.type === type);
};

const analyzeQR = (logItem) => {
  const {timestamp, qrTimestamp} = logItem;
  const lag = timestamp - qrTimestamp;

  return ({
    lag,
    qrTimestamp,
    timestamp
  });
};

const analyzeRGB = (el, publisherStats) => {
  const colorDiffTolerance = 30;
  let closestPubStat;

  publisherStats.forEach(pubEl => {
    if (math.getColorDistance(pubEl.color, el.color) < colorDiffTolerance) {
      var lag = el.timestamp - pubEl.timestamp;

      if ((lag > 0 && closestPubStat === undefined) || (lag > 0 && lag < el.timestamp - closestPubStat.timestamp)) {
        closestPubStat = pubEl;
      }
    }
  });

  if (!closestPubStat) {
    const {r, g, b} = el.color;

    if (t.ctx.errors === undefined) {
      t.ctx.errors = [];
    }

    t.ctx.errors.push(`Could not find timestamp when color RGB(${r}, ${g}, ${b}) (${el.timestamp}) was published`);

    return null;
  }

  return ({
    colorPublished: closestPubStat.color,
    colorSubscribed: el.color,
    lag: el.timestamp - closestPubStat.timestamp
  });
};

const videoLag = async(page, rtmpPush, doAssertion) => {
  const {publisher, subscriber, streamReceivedAt} = page.stats;
  const publisherStats = getPublisherVideoStats(publisher.video, rtmpPush, streamReceivedAt);
  const subscriberStats = getSubscriberVideoStats(subscriber.video, rtmpPush);
  let analyzedData = [];

  subscriberStats.forEach(el => {
    let data = rtmpPush ?
      analyzeQR(el) :
      analyzeRGB(el, publisherStats);

    if (data === null) {
      return;
    }

    analyzedData.push(data);
  });

  const {maxLag, maxRTMPLag} = config.videoAssertProfile;
  const maxVideoLag = rtmpPush ? maxRTMPLag : maxLag;
  const meanLagMs = math.average(analyzedData.map(e => e.lag));

  if (!rtmpPush) {
    doAssertion(
      'Publisher video stats count',
      publisherStats.length,
      0,
      'gt'
    );
  }

  doAssertion(
    'Subscriber video changes count',
    subscriberStats.length,
    0,
    'gt'
  );

  doAssertion(
    `Video stats analyzed count`,
    analyzedData.length,
    0,
    'gt'
  );

  doAssertion(
    'Mean video lag',
    meanLagMs,
    maxVideoLag,
    'lte'
  );

  page.stats.subscriber.video = {
    analyzedData,
    meanLagMs,
    statsAnalyzed: analyzedData.length
  };
};

const getPublisherAudioStats = (logs, isRtmp, streamReceivedAt) => {
  if (isRtmp) {
    return rtmp.getAudioBenchmarkStats();
  }

  return logs.filter(el => el.timestamp >= streamReceivedAt - 10);
};

const getSubscriberAudioStats = (logs, isRtmp) => {
  if (!isRtmp) {
    return logs;
  }

  return logs.filter(signal => signal.frequency >= 8000);
};

const audioLag = async(page, rtmpPush, doAssertion) => {
  const {publisher, subscriber, streamReceivedAt} = page.stats;
  let subscriberStats = getSubscriberAudioStats(subscriber.audio, rtmpPush);
  let publisherStats = getPublisherAudioStats(publisher.audio, rtmpPush, streamReceivedAt);
  let analyzedData = [];
  const {maxLag, maxRTMPLag} = config.audioAssertProfile;
  const maxAudioLag = rtmpPush ? maxRTMPLag : maxLag;

  subscriberStats.forEach(el => {
    const {frequency, timestamp} = el;
    const signalsPerFrequency = publisherStats.filter(
      signal =>
        signal.frequency === frequency && signal.timestamp <= timestamp
    );
    let closestPubStat = null;

    if (signalsPerFrequency.length > 0) {
      closestPubStat = signalsPerFrequency.reduce((prev, curr) =>
        Math.abs(curr.timestamp - timestamp) <
        Math.abs(prev.timestamp - timestamp)
          ? curr
          : prev
      );
    }

    if (!closestPubStat) {
      if (t.ctx.errors === undefined) {
        t.ctx.errors = [];
      }

      t.ctx.errors.push(`Could not find timestamp when frequency ${frequency} (${timestamp}) was published`);

      return;
    }

    analyzedData.push({
      frequencyPublished: closestPubStat.frequency,
      frequencySubscribed: frequency,
      lag: timestamp - closestPubStat.timestamp
    });
  });

  const meanLagMs = math.average(analyzedData.map(e => e.lag));

  if (!rtmpPush) {
    doAssertion(
      'Publisher audio changes count',
      publisherStats.length,
      0,
      'gt'
    );
  }

  doAssertion(
    'Subscriber audio changes count',
    subscriberStats.length,
    0,
    'gt'
  );

  doAssertion(
    'Audio stats analyzed count',
    analyzedData.length,
    0,
    'gt'
  );

  doAssertion(
    'Mean audio lag',
    meanLagMs,
    maxAudioLag,
    'lte'
  );
};

export {
  videoLag,
  audioLag
};