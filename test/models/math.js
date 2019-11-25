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

/* eslint-disable no-unused-vars */

module.exports = {
  average(arr) {
    if (arr.length === 0) {
      return 0;
    }

    return arr.reduce((p, c) => p + c, 0) / arr.length;
  },

  chunk(arr, size) {
    const chunked = [];
    for (let i = 0, len = arr.length; i < len; i += size) {
      chunked.push(arr.slice(i, i + size));
    }

    return chunked;
  },

  getColorDistance(target, actual) {
    return Math.sqrt(
      (target.r - actual.r) * (target.r - actual.r) +
      (target.g - actual.g) * (target.g - actual.g) +
      (target.b - actual.b) * (target.b - actual.b)
    );
  }
};