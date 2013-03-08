/*
 * Copyright 2011-2012 the original author or authors.
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

load("vertx.js");
load("vertx_tests.js");

var eb = vertx.eventBus;

function testSessionTimeout() {
  deleteAll();
  storeEntries({username: 'tim', password: 'foo'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('ok', reply.status);
    vassert.assertTrue(typeof reply.sessionID != 'undefined');
    var sessionID = reply.sessionID;
    eb.send('test.authMgr.authorise', {sessionID: sessionID, password: 'foo'}, function(reply) {
      vassert.assertEquals('ok', reply.status);
      // Allow session to timeout then try and validate again
      vertx.setTimer(1000, function() {
        eb.send('test.authMgr.authorise', {sessionID: sessionID, password: 'foo'}, function(reply) {
          vassert.assertEquals('denied', reply.status);
          vassert.testComplete();
        });
      });

    });
  });
}

function storeEntries() {
  for (var i = 0; i < arguments.length; i++) {
    var entry = arguments[i];
    eb.send('test.persistor', {
      collection: 'users',
      action: 'save',
      document: entry
    }, function(reply) {
      vassert.assertEquals('ok', reply.status);
    });
  }
}

function deleteAll() {
  eb.send('test.persistor', {
    collection: 'users',
    action: 'delete',
    matcher: {}
  }, function(reply) {
    vassert.assertEquals('ok', reply.status);
  });
}

var script = this;
var persistorConfig = {address: 'test.persistor', 'db_name' : 'test_db', fake: true}
var authMgrConfig = {address: 'test.authMgr', 'persistor_address' : 'test.persistor', 'user_collection': 'users',
                     session_timeout: 200}
vertx.deployModule('io.vertx~mod-mongo-persistor~2.0.0-SNAPSHOT', persistorConfig, 1, function() {
  vertx.deployModule(java.lang.System.getProperty("vertx.modulename"), authMgrConfig, 1, function() {
    initTests(script);
  });
});
