# qewd-cos: helper module for [QEWD](https://www.npmjs.com/package/qewd) to interface to [InterSystems Caché](https://www.intersystems.com/products/cache/)

This helper module contains helper functions to interface your JavaScript code in Node.js to your own extrinsic functions in Caché ObjectScript

Thanks to [Rob Tweed](https://github.com/robtweed) for providing the [QEWD](https://www.npmjs.com/package/qewd) server modules this helper module is meant for.

## Installing

    npm install qewd-cos

## Use

In your QEWD handler module, you can easily use this qewd-cos module to call your own extrinsic functions in Caché:

```javascript
var qcos = require('qewd-cos');

module.exports = {
  handlers: {
    cosTest: function(messageObj, session, send, finished) {
      let self = this;
      // get the text coming in from the message request
      var incomingText = messageObj.params.text;

      // to work directly with your Caché globals in JavaScript, you can just use documentStore methods
      // instantiate the global ^nodeTest as documentStore abstraction
      let nodeTest = new this.documentStore.DocumentNode('nodeTest');
      // get the current date & time
      let d = new Date();
      let ts = d.getTime();
      // save the text from the request in the ^nodeTest global (subscripted by the current timestamp)
      nodeTest.$(ts).value = incomingText;

      // but if you want to use Caché Objects or SQL, just use an extrinsic function call to Caché:
      let params = {
        id: 1,
        nodejs: "hot",
        cache: "cool"
      }
      let response = qcos.doIscFunction('myCosTest^jsTest', params, self, session);
      if (response.ok) {
        console.log("Caché response was: ", response);
      }
      else {
        console.log("An error occurred: ", response.error);
      }

      // return the response to the client using WebSockets (or Ajax mode)
      finished({
        text: 'You sent: ' + incomingText + ' at ' + d.toUTCString(),
        response
      });
    }
  }
};
```

The corresponding COS routine "jsTest.mac" in Caché is:

```
jsTest
 ;
 #Include %occStatus
 #Include jsHeader
 ;
myCosTest(sessid)
 New (sessid)
 
 Set error=""
 ;we can save the incoming parameters in the QEWD session too ...
 Merge $$$session(sessid,"params")=$$$jsData("params")
 ;first, let's try the Object way ...
 If $$$jsData("params","nodejs")="hot" {
   Set id = $Get($$$jsData("params","id")) If '$Length(id) Set error="person id missing in request" Quit
   Set person = ##class(User.Person).%OpenId(id) If '$ISOBJECT(person) Set error="person id does not exist" Quit
   Set $$$jsData("json","person","name") = person.name
   Set $$$jsData("json","person","city") = person.city
   Kill person
 }
 ;next, let's try the SQL way ...
 Set query = "SELECT * FROM Person"
 set statement = ##class(%SQL.Statement).%New()
 set status = statement.%Prepare(query)
 If 'status {
   Set error = ##class(%SYSTEM.Status).GetErrorText(status)
 }
 Else {
   Set n = 0, rset = statement.%Execute()
   While (rset.%Next()) {
     Set $$$jsData("json","persons",n,"name") = rset.%Get("name")
     Set $$$jsData("json","persons",n,"city") = rset.%Get("city")
     Set n = n + 1
   }
 }
 ;save the resulting json inside the session (makes it easy to debug using QEWD monitor)
 Merge $$$session(sessid,"json") = $$$jsData("json")
 Quit error
 ;
```

And finally some very helper macro's defined in "jsHeader.inc":

```
jsHeader
 ;
 ;define session and jsData macro to easily access session data & Node.js data
 ;the temporary global you define here must be the same as defined in qewd-cos!
 #Def1Arg session(%subscripts) ^CacheTempEWDSession("session",%subscripts)
 #Def1Arg jsData(%subscripts) ^CacheTempEWDData($j,%subscripts)
 ;
 ;encoding/decoding a string in your database in UTF8
 #define jsEnc(%s) $zcvt(%s,"O","UTF8") 
 #define jsDec(%s) $zcvt(%s,"I","UTF8")
```

As you'll notice, this allows you to use the full potential of [InterSystems Caché](https://www.intersystems.com/products/cache/) in your Node.js applications:
- you can easily send data in & out of Caché using plain globals as data interface (without size limitations)
- using these simple extrinsic "wrapper" functions, you can use all your (COS) code in Node.js - in many cases only a trivial wrapping of existing code is necessary
- you can use the full power of COS in JavaScript (classes, SQL, ...)
- these extrinsic functions cannot be existing (static) class methods, just wrap your class method call inside a small extrinsic function wrapper (which you need anyway to translate class data to json data going in and out)

For detailed information on how to use QEWD in its full potential, please refer to the [QEWD documentation and training](http://docs.qewdjs.com/)

## License

 Copyright (c) 2017 Stabe nv,  
 Hofstade, Oost-Vlaanderen, BE  
 All rights reserved

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
