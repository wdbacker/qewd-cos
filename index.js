/*

 ----------------------------------------------------------------------------
 | qewd-cos: helper module for QEWDjs                                       |
 |                                                                          |
 | Copyright (c) 2022 Stabe nv,                                             |
 | Hofstade, Oost-Vlaanderen,                                               |
 | All rights reserved.                                                     |
 |                                                                          |
 | Licensed under the Apache License, Version 2.0 (the "License");          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an "AS IS" BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

  8 June 2022

*/

var _tempDataGlobal = 'CacheTempEWDData';

module.exports = {
  tempDataGlobal: function() {
    return _tempDataGlobal;
  },

  jsonResponse: function(error, json) {
    error = error || '';
    return {
      ok: (error === ''),
      error: error,
      json: json || {}
    };
  },

  restResponse: function(error, json) {
    let errorObj;
    // first check for predefined errors using setCustomErrorResponse()
    if (error && error.application && error.type) {
      if (this.errorMessages && this.errorMessages[error.application] && this.errorMessages[error.application][error.type]) {
        errorObj = {
          error: error.error || error.text || this.errorMessages[error.application][error.type].text || 'Unspecified Error',
          status: {
            code: error.statusCode || this.errorMessages[error.application][error.type].statusCode || 400
          }
        };
      }
    }
    if (!errorObj) {
      if (error && (error.statusCode || error.error || error.text)) {
        errorObj = {
          status: {
            code: error.statusCode || 400,
          },
          error: error.error || error.text || 'Unspecified Error'
        };
        if (error.response) {
          errorObj.error = {
            response: error.response
          }
        }
      }
      else if (error) {
        errorObj = {
          error
        }
      }
    }

    if (errorObj) {
      if (json) errorObj.json = json;
      return errorObj;
    }
    else {
      return json || {};
    }
  },

  doIscFunction: function(iscFunction, params, self, session) {
    var temp = new self.documentStore.DocumentNode(_tempDataGlobal, [process.pid]);
    var sessid = (session ? session.id : '');

    temp.delete();
    temp.setDocument({
      params : params
    });
    var error = (self.documentStore.db.dbx ? self.documentStore.db.dbx.function(iscFunction, sessid) : self.documentStore.db.function(iscFunction, sessid)) || '';
    var errorObj;
    // decode error string using template literal syntax
    if (error.startsWith('${') && error.endsWith('}')) {
      try {
        errorObj = JSON.parse(error.substring(1));
      }
      catch (err) {
        errorObj = {
          error: `JSON parse error in error string: ${error}`
        }
      }
    }
    var document = temp.getDocument(true);
    var jsonResponse = {
      ok : ((error === '') ? true : false),
      json : document.json || document.results || {},
      error,
      errorObj,
      errors: document.errors || null,
      warnings: document.warnings || null
    };
    return jsonResponse;
  }
}
