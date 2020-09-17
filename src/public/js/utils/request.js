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

(function(exports){
  exports.fetch = async function(method, url, applicationId, secret, body = null, contentLength = '68') {
    const requestConf = {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': contentLength,
        Authorization: 'Basic ' + btoa(applicationId + ':' + unescape(encodeURIComponent(secret)))
      }
    };

    if (body !== null) {
      requestConf.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestConf);

    return await response;
  };
})(typeof exports === 'undefined' ? this['request'] = {} : exports);