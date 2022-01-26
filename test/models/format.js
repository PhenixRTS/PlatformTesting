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

const round = (value, precision, roundingType = 'std') => {
  const multiplier = Math.pow(10, precision || 0);
  let roundedValue = 0;

  switch (roundingType.toLowerCase()) {
    case ('std'):
      roundedValue = Math.round(value * multiplier);

      break;
    case ('up'):
      roundedValue = Math.ceil(value * multiplier);

      break;
    case ('down'):
      roundedValue = Math.floor(value * multiplier);

      break;
    default:
      throw Error(`Unsupported rounding type "${roundingType}"`);
  }

  return roundedValue / multiplier;
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

function formatMsgActualValue(actualValue, expected, sign) {
  const isIso8601 = isISO8601(expected);
  const expectedValue = isIso8601 ? expected.milliseconds() : expected;
  const roundedValue = isIso8601 ? round(actualValue, 0, 'up') : round(actualValue, 1, 'std');
  const wasRoundedDown = roundedValue < actualValue;

  if ((sign === 'lte' || sign === 'gt') && (!wasRoundedDown || isIso8601)) {
    return roundedValue;
  }

  if ((sign === 'gte' || sign === 'lt') && wasRoundedDown) {
    return roundedValue;
  }

  if (roundedValue === expectedValue) {
    if (isIso8601) {
      return round(actualValue, 0, 'down');
    } else if (wasRoundedDown) {
      return round(actualValue, 1, 'up');
    } else if (!wasRoundedDown){
      return round(actualValue, 1, 'down');
    }
  }

  return roundedValue;
}

module.exports = {
  formatTime,
  isISO8601,
  round,
  parseColor,
  hexToRgb,
  formatMsgActualValue
};