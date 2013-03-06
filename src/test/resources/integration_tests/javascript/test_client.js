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

function testLoginDeniedEmptyDB() {
  deleteAll();
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('denied', reply.status);
    vassert.testComplete();
  });
}

function testLoginDeniedNonMatchingOthers() {
  deleteAll();
  storeEntries({username: 'bob', password: 'wibble'},
               {username: 'jane', password: 'uhuwdh'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('denied', reply.status);
    vassert.testComplete();
  });
}

function testLoginDeniedWrongPassword() {
  deleteAll();
  storeEntries({username: 'bob', password: 'wibble'},
               {username: 'tim', password: 'bar'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('denied', reply.status);
    vassert.testComplete();
  });
}

function testLoginDeniedOtherUserWithSamePassword() {
  deleteAll();
  storeEntries({username: 'bob', password: 'foo'},
               {username: 'tim', password: 'bar'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('denied', reply.status);
    vassert.testComplete();
  });
}

function testLoginOKOneEntryInDB() {
  deleteAll();
  storeEntries({username: 'tim', password: 'foo'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('ok', reply.status);
    vassert.assertTrue(typeof reply.sessionID != 'undefined');
    vassert.testComplete();
  });
}

function testLoginOKMultipleEntryInDB() {
  deleteAll();
  storeEntries({username: 'tim', password: 'foo'},
               {username: 'bob', password: 'uahuhd'},
               {username: 'jane', password: 'ijqiejoiwjqe'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('ok', reply.status);
    vassert.assertTrue(typeof reply.sessionID != 'undefined');
    vassert.testComplete();
  });
}

function testValidateDeniedNotLoggedIn() {
  deleteAll();
  eb.send('test.authMgr.authorise', {sessionID: 'uhiuhuhihu', password: 'foo'}, function(reply) {
    vassert.assertEquals('denied', reply.status);
    vassert.testComplete();
  });
}

function testValidateDeniedInvalidSessionID() {
  deleteAll();
  eb.send('test.authMgr.authorise', {sessionID: 'uhiuhuhihu', password: 'foo'}, function(reply) {
    vassert.assertEquals('denied', reply.status);
    vassert.testComplete();
  });
}

function testValidateDeniedLoggedInWrongSessionID() {
  deleteAll();
  storeEntries({username: 'tim', password: 'foo'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('ok', reply.status);
    vassert.assertTrue(typeof reply.sessionID != 'undefined');
    eb.send('test.authMgr.authorise', {sessionID: 'uhiuhuhihu', password: 'foo'}, function(reply) {
      vassert.assertEquals('denied', reply.status);
      vassert.testComplete();
    });
  });
}

function testValidateDeniedLoggedOut() {
  deleteAll();
  storeEntries({username: 'tim', password: 'foo'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('ok', reply.status);
    var sessionID = reply.sessionID;
    eb.send('test.authMgr.logout', {sessionID: sessionID}, function(reply) {
      vassert.assertEquals('ok', reply.status);
      eb.send('test.authMgr.authorise', {sessionID: sessionID}, function(reply) {
        vassert.assertEquals('denied', reply.status);
        vassert.testComplete();
      });
    });
  });
}

function testValidateOK() {
  deleteAll();
  storeEntries({username: 'tim', password: 'foo'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('ok', reply.status);
    vassert.assertTrue(typeof reply.sessionID != 'undefined');
    var sessionID = reply.sessionID;
    eb.send('test.authMgr.authorise', {sessionID: sessionID, password: 'foo'}, function(reply) {
      vassert.assertEquals('ok', reply.status);
      vassert.testComplete();
    });
  });
}

function testLoginMoreThanOnce() {
  deleteAll();
  storeEntries({username: 'tim', password: 'foo'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('ok', reply.status);
    var sessionID = reply.sessionID;
    eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
      vassert.assertEquals('ok', reply.status);
      // Should be different session ID
      var newSessionID = reply.sessionID;
      vassert.assertTrue(newSessionID != sessionID);
      eb.send('test.authMgr.logout', {sessionID: sessionID}, function(reply) {
        vassert.assertEquals('error', reply.status);
        vassert.assertEquals('Not logged in', reply.message);
        eb.send('test.authMgr.authorise', {sessionID: sessionID}, function(reply) {
          vassert.assertEquals('denied', reply.status);
          eb.send('test.authMgr.authorise', {sessionID: newSessionID}, function(reply) {
            vassert.assertEquals('ok', reply.status);
            eb.send('test.authMgr.logout', {sessionID: newSessionID}, function(reply) {
              vassert.assertEquals('ok', reply.status);
              eb.send('test.authMgr.authorise', {sessionID: newSessionID}, function(reply) {
                vassert.assertEquals('denied', reply.status);
                vassert.testComplete();
              });
            });
          });
        });
      });
    });
  });
}

function testLoginMoreThanOnceThenLogout() {
  deleteAll();
  storeEntries({username: 'tim', password: 'foo'});
  eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
    vassert.assertEquals('ok', reply.status);
    var sessionID = reply.sessionID;
    eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
      vassert.assertEquals('ok', reply.status);
      // Should be different session ID
      vassert.assertTrue(reply.sessionID != sessionID);
      vassert.testComplete();
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
var persistorConfig = {address: 'test.persistor', db_name : 'test_db', fake: true}
var authMgrConfig = {address: 'test.authMgr', 'persistor_address' : 'test.persistor', 'user_collection': 'users'}
vertx.deployModule('io.vertx#mod-mongo-persistor#2.0.0-SNAPSHOT', persistorConfig, 1, function() {
  vertx.deployModule(java.lang.System.getProperty("vertx.modulename"), authMgrConfig, 1, function() {
    initTests(script);
  });
});
