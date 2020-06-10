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

const moment = require('moment');

const formatTime = (time, format = '') => {
  if (format === 'ms') {
    return moment.duration(time);
  }

  return moment.duration(time).toISOString();
};

const isISO8601 = duration => {
  return duration.toString().indexOf('PT') === 0;
};

const round = (value, precision) => {
  const multiplier = Math.pow(10, precision || 0);

  return Math.round(value * multiplier) / multiplier;
};

const parseColor = color => {
  const rgbRegex = /^rgb\((0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d)\)$/;
  const hexRegex = /^#[0-9a-f]{6}$/;
  let rgb = color.replace(/\s/g, '');

  if (color === '') {
    return color;
  }

  if (!rgbRegex.test(rgb) && !hexRegex.test(rgb)) {
    return {
      parsedColor: null,
      error: 'Error: unsupported color value. Color should be in RGB or HEX'
    };
  }

  if (hexRegex.test(rgb)) {
    rgb = hexToRgb(rgb);
  }

  const {0: r, 1: g, 2: b} = rgb.match(/\d+/g);

  return {
    parsedColor: {
      r,
      g,
      b
    },
    error: null
  };
};

const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result ?
    `rgb(
      ${parseInt(result[1], 16)},
      ${parseInt(result[2], 16)},
      ${parseInt(result[3], 16)}
    )` : '';
};

module.exports = {
  formatTime,
  isISO8601,
  round,
  parseColor,
  hexToRgb
};