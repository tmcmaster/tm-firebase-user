const GLOBAL = 'global';
const HOST = 'host';
const GUEST = 'guest';
const LOG_CLASS = 'DOMAIN_UTIL';
const _log = console.debug;

const LOG_PREFIX = "SCRIPT-LOADER";

function loadFirebaseEmbedded() {
  return _loadScripts({
    load: ['/__/firebase/7.2.0/firebase-app.js', '/__/firebase/7.2.0/firebase-auth.js'],
    then: {
      load: ['/__/firebase/7.2.0/firebase-database.js', '/__/firebase/7.2.0/firebase-messaging.js', '/__/firebase/7.2.0/firebase-storage.js'],
      then: {
        load: ['/__/firebase/init.js']
      }
    },
    payload: () => window.firebase
  });
}

function loadFirebaseCDN() {
  return _loadScripts({
    load: ['https://www.gstatic.com/firebasejs/7.4.0/firebase-app.js', 'https://www.gstatic.com/firebasejs/7.4.0/firebase-auth.js'],
    then: {
      load: ['https://www.gstatic.com/firebasejs/7.4.0/firebase-database.js', 'https://www.gstatic.com/firebasejs/7.4.0/firebase-messaging.js', 'https://www.gstatic.com/firebasejs/7.4.0/firebase-storage.js']
    },
    payload: () => window.firebase
  });
}

function _loadScripts(scripts) {
  return new Promise((resolve, reject) => {
    Promise.all(scripts.load.map(script => _loadScript(script))).then(() => {
      if (scripts.then === undefined) {
        resolve(scripts.payload ? scripts.payload() : undefined);
      } else {
        _loadScripts(scripts.then).then(() => {
          resolve(scripts.payload ? scripts.payload() : undefined);
        }).catch(e => {
          reject();
        });
      }
    }).catch(e => {
      reject();
    });
  });
}

function _getScriptByName(scriptSrc) {
  let scripts = document.head.getElementsByTagName("script");

  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].TMScriptLoader !== undefined && scripts[i].TMScriptLoader.src === scriptSrc) {
      return scripts[i];
    }
  }

  return undefined;
}

function _loadScript(script) {
  console.debug(`${LOG_PREFIX} - loadScript - Checking script exists: ${script}`);

  const scriptElement = _getScriptByName(script);

  if (scriptElement === undefined) {
    return new Promise((resolve, reject) => {
      console.debug(`${LOG_PREFIX} - loadScript - Loading script: ${script}`);
      let newScript = document.createElement("script");
      newScript.defer = true;
      newScript.status = 'loading';
      newScript.TMScriptLoader = {
        src: script,
        status: 'loading'
      };

      newScript.onload = event => {
        console.debug(`Script has been loaded: ${script}`);
        newScript.TMScriptLoader.status = 'loaded';
        resolve();
      };

      newScript.onerror = error => {
        console.error(`${LOG_PREFIX} - loadScript - There was an issue loading script: url(${script}):`, error);
        newScript.TMScriptLoader.status = 'failed';
        reject(error);
      };

      document.getElementsByTagName('head')[0].append(newScript);
      newScript.src = script.toString();
    });
  } else {
    const scriptStatus = scriptElement.TMScriptLoader ? scriptElement.TMScriptLoader.status : undefined;

    if (scriptStatus === 'loaded') {
      console.debug(`Script was already loaded: ${script}`);
      return new Promise((resolve, reject) => {
        resolve();
      });
    } else if (scriptStatus === 'loading') {
      console.debug(`Script had already started loading: ${script}`);
      return new Promise((resolve, reject) => {
        scriptElement.addEventListener('load', () => {
          resolve();
        }, e => {
          reject(e);
        });
      });
    } else {
      console.warn(`Script is already there, but unknown status: ${script}`);
      return new Promise((resolve, reject) => {
        let counter = 10;
        const interval = setTimeout(() => {
          const scriptStatus = scriptElement.TMScriptLoader ? scriptElement.TMScriptLoader.status : undefined;

          if (scriptStatus === 'loaded') {
            clearInterval(interval);
            resolve();
          }

          if (--counter < 1) {
            clearInterval(interval);
            console.warn(`Script took to long to load: ${script}`);
            reject(new Error(`Script took to long to load: ${script}`));
          }
        }, 500);
      });
    }
  }
}

const RESOURCE_TIMEOUT = 30000;
const LOG_PREFIX$1 = 'FIREBASE-UTILS';

function whenResourceReady(eventName, check, payload) {
  return new Promise((resolve, reject) => {
    if (check()) {
      const resource = payload();

      _log(`${LOG_PREFIX$1} - whenResourceReady - Resource(${name}) ready.`);

      resolve(resource);
    } else {
      let listener = undefined;
      let timeout = setTimeout(() => {
        if (listener) {
          document.removeEventListener(eventName, listener);
          listener = undefined;
          timeout = undefined;
        }

        if (check()) {
          const resource = payload();

          _log(`${LOG_PREFIX$1} - whenResourceReady - Resource(${name}) is ready.`);

          resolve(resource);
        } else {
          reject(`Resource(${name}) took too long to be ready.`);
        }
      }, RESOURCE_TIMEOUT);

      listener = () => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }

        document.removeEventListener(eventName, listener);
        listener = undefined;
        const resource = payload();

        _log(`${LOG_PREFIX$1} - whenResourceReady - Resource(${name}) is ready.`);

        resolve(resource);
      };

      document.addEventListener(eventName, listener);
    }
  });
}

const LOG_PREFIX$2 = 'SYNC-WORKER';

class SyncWorker {
  constructor(db, path) {
    this.db = db;
    this.path = path;

    this.reject = error => {};
  }

  sync(resolve) {
    _log(`${LOG_PREFIX$2} - sync - about to sync Path(${this.path})`);

    this.resolve = snapshot => {
      const value = snapshot.val();

      _log(`${LOG_PREFIX$2} - sync - new value available Path(${this.path}): `, value);

      resolve(value);
    };

    const reject = error => {
      console.warn(`${LOG_PREFIX$2} - sync - error while syncing Path(${this.path}: `, error);
      this.reject(error);
    };

    this.db.ref(this.path).on('value', this.resolve, reject);
    return this;
  }

  catch(reject) {
    this.reject = reject;
    return this;
  }

  disconnect() {
    this.ref.off('value', this.resolve);
  }

}

const LOG_PREFIX$3 = 'DATABASE-ADAPTER';

class DatabaseAdapter {
  constructor(mainDb, appDb) {
    this.mainDb = mainDb;
    this.appDb = appDb ? appDb : mainDb;
  }

  onValue(path) {
    return new Promise((resolve, reject) => {
      resolve(new SyncWorker(this.appDb, path));
    });
  }

  exists(path) {
    return new Promise((resolve, reject) => {
      this.appDb.ref(path).once('value', snapshot => {
        resolve(snapshot.exists());
      }, error => reject(error));
    });
  }

  getValue(path) {
    return new Promise((resolve, reject) => {
      _log(`${LOG_PREFIX$3} - getValue(${path})`);

      this.appDb.ref(path).once('value', snapshot => {
        const value = snapshot.val();

        _log(`${LOG_PREFIX$3} - getValue(${path}): `, value);

        resolve(value);
      }, error => reject(error));
    });
  }

  setValue(path, value) {
    return new Promise((resolve, reject) => {
      this.appDb.ref(path).set(value, error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  deleteValues(path, values) {
    return new Promise((resolve, reject) => {
      const updateMap = createDeleteMap(values);
      this.appDb.ref(path).update(updateMap, error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  updateValues(path, value) {
    return new Promise((resolve, reject) => {
      this.appDb.ref(path).update(value, error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  insertValue(path, value) {
    return new Promise((resolve, reject) => {
      this.appDb.ref(path).push(value, error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  getAppDb() {
    return this.appDb;
  }

  getMainDb() {
    return this.mainDb;
  }

}

function createDeleteMap(values) {
  const updateMap = {};

  if (values === undefined || values === null) {
    return null;
  } else if (Array.isArray(values)) {
    values.forEach(key => updateMap[key] = null);
  } else if (values instanceof Object) {
    Object.keys(values).forEach(key => updateMap[key] = null);
  } else {
    updateMap[values] = null;
  }

  return updateMap;
}

const LOG_PREFIX$4 = 'USER-FACTORY';

class UserFactory {
  constructor() {
    this.creatingUser = false;
  }

  constructUser(userId, userDetails) {
    if (userDetails) {
      this.creatingUser = true;
    }

    _log(LOG_PREFIX$4 + ` - Retrieving user details from the database: uid(${userId}), User Details: `, userDetails);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (userDetails) {
          this.creatingUser = false;
        }

        Promise.all([retrieveUser(userId), retrieveStatus(userId)]).then(([user, status]) => {
          if (userDetails) {
            saveSaveUser(userId, Object.assign({ ...user
            }, userDetails)).then(() => {
              const constructedUser = Object.assign({
                uid: userId
              }, user, status, userDetails);

              _log(LOG_PREFIX$4 + ` - New user details have been saved, and user constructed: uid(${userId}), ConstructedUser: `, userDetails);

              resolve(constructedUser);
            }).catch(error => reject(error));
          } else {
            const constructedUser = Object.assign({
              uid: userId
            }, user, status);

            _log(LOG_PREFIX$4 + ` - User constructed: uid(${userId}), ConstructedUser: `, userDetails);

            resolve(constructedUser);
          }
        }).catch(error => reject(error));
      }, this.creatingUser ? 5000 : 0);
    });
  }

}

function retrieveUser(userId) {
  _log(LOG_PREFIX$4 + ` - Retrieving user from the database: uid(${userId})`);

  return new Promise((resolve, reject) => {
    // noinspection JSUnresolvedVariable,JSUnresolvedFunction
    Firebase.getFirebase().then(firebase => {
      firebase.database().ref('users/' + userId).once('value', snapshot => {
        let user = snapshot.val();

        if (user) {
          _log(LOG_PREFIX$4 + ` - Retrieved user from database: Email(${user.email}), uid(${userId})`, user);

          resolve(user);
        } else {
          reject('Could not get the user details: ' + userId);
        }
      }, error => {
        console.error(LOG_PREFIX$4 + ` - There was an error retrieving the user from database: uid(${userId})`, error);
        reject(error);
      });
    }).catch(error => console.error(`${LOG_PREFIX$4} - retrieveUser - could not get database:`, error));
  });
}

function retrieveStatus(userId) {
  _log(LOG_PREFIX$4 + ` - Retrieving user status from the database: uid(${userId})`);

  return new Promise((resolve, reject) => {
    // noinspection JSUnresolvedVariable,JSUnresolvedFunction
    Firebase.getFirebase().then(firebase => {
      firebase.database().ref('status/' + userId).once('value', snapshot => {
        let userStatus = snapshot.val();

        if (userStatus) {
          _log(LOG_PREFIX$4 + ` - Retrieved user from database: uid(${userId})`, userStatus);

          resolve(userStatus);
        } else {
          reject('Could not get the user details: ' + userId);
        }
      }, error => {
        console.error(LOG_PREFIX$4 + ` - There was an error retrieving the user status from database: uid(${userId})`, error);
        reject(error);
      });
    }).catch(error => console.error(`${LOG_PREFIX$4} - retrieveStatus - could not get database:`, error));
  });
}

function saveSaveUser(userId, user) {
  _log(LOG_PREFIX$4 + `Saving user to the database: uid(${userId})`, user);

  return new Promise((resolve, reject) => {
    Firebase.getFirebase().then(firebase => {
      // noinspection JSUnresolvedVariable,JSUnresolvedFunction
      firebase.database().ref('users/' + userId).update(user).then(() => {
        _log(LOG_PREFIX$4 + ` - Saved the user into the database: Email(${user.email}), uid(${userId})`, user);

        resolve();
      }).catch(error => {
        console.error(LOG_PREFIX$4 + ` - There was an error saving the user into the database: Email(${user.email}), uid(${userId})`, error);
        reject(error);
      });
    }).catch(error => console.error(`${LOG_PREFIX$4} - retrieveStatus - could not get database:`, error));
  });
}

class UserSyncWorker {
  constructor() {
    this.loginCallback = undefined;
    this.logoutCallback = undefined;
    document.addEventListener('user-logged-in', e => {
      if (this.loginCallback) {
        this.loginCallback(e.detail);
      }
    });
    document.addEventListener('user-logged-out', e => {
      if (this.logoutCallback) {
        this.logoutCallback(e.detail);
      }
    });
  }

  onLogin(resolve) {
    this.loginCallback = resolve;
    return this;
  }

  onLogout(resolve) {
    this.logoutCallback = resolve;
    return this;
  }

}

const LOG_PREFIX$5 = 'AUTH-ADAPTER';

class AuthAdapter {
  constructor(mainAuth, appAuth) {
    this.user = undefined;
    this.mainAuth = mainAuth;
    this.appAuth = appAuth ? appAuth : mainAuth;
    this.listenForLoginAndLogout();
    this.userFactory = new UserFactory();
  }

  listenForLoginAndLogout() {
    _log(`${LOG_PREFIX$5} - listenForLoginAndLogout -  Listening for when users login or logout`);

    this.mainAuth.onAuthStateChanged(user => {
      if (user) {
        _log(`${LOG_PREFIX$5} - listenForLoginAndLogout - User has logged in: `, user);

        const userId = user.uid;
        this.userFactory.constructUser(userId).then(constructedUser => {
          this.user = constructedUser;
          window.user = constructedUser;
          console.info(`${LOG_PREFIX$5} - listenForLoginAndLogout - User has logged in: `, constructedUser);
          document.dispatchEvent(new CustomEvent('user-logged-in', {
            detail: { ...constructedUser
            }
          }));
        }).catch(error => {
          console.error(`${LOG_PREFIX$5} - listenForLoginAndLogout - there was an issue while constructing the user`, error);
        });
      } else {
        if (this.user !== undefined) {
          const user = { ...this.user
          };
          console.info(LOG_PREFIX$5 + ' - User has logged out: ', user);
          this.user = undefined;
          window.user = undefined;
          document.dispatchEvent(new CustomEvent('user-logged-out', {
            detail: { ...user
            }
          }));
        }
      }
    });
  }

  getUser() {
    const check = () => this.user;

    const payload = () => this.user;

    return new Promise((resolve, reject) => {
      whenResourceReady('user-logged-in', check, payload).then(user => {
        resolve(user);
      }).catch(error => reject(error));
    });
  }

  getUserId() {
    return new Promise((resolve, reject) => {
      this.getUser().then(user => {
        return resolve(user.uid);
      }).catch(error => reject(error));
    });
  }

  getBothAuth() {
    const check = () => this.mainAuth && this.appAuth;

    const payload = () => [this.mainAuth, this.appAuth];

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-service-ready', check, payload).then(bothAuth => {
        resolve(bothAuth);
      }).catch(error => reject(error));
    });
  }

  getAuth() {
    const check = () => this.mainAuth;

    const payload = () => this.mainAuth;

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-service-ready', check, payload).then(auth => {
        resolve(auth);
      }).catch(error => reject(error));
    });
  }

  forgotPassword(email) {
    return new Promise((resolve, reject) => {
      this.getAuth().then(auth => {
        auth.sendPasswordResetEmail(email).then(() => {
          _log(LOG_PREFIX$5 + ` - forgotPassword - Password reset email has been sent. Email(${email})`);

          resolve();
        }).catch(error => {
          _log(`${LOG_PREFIX$5} - forgotPassword - Password reset failed: Email(${email})`, error);

          reject();
        });
      }).catch(error => reject(error));
    });
  }

  createUser(email, password, firstName, lastName) {
    return new Promise((resolve, reject) => {
      this.getAuth().then(auth => {
        this.creatingUser = true;
        auth.createUserWithEmailAndPassword(email, password).then(response => {
          if (response) {
            const user = this.mainAuth.currentUser;
            const userId = user.uid;
            const userDetails = {
              displayName: firstName + (firstName && lastName ? ' ' : '') + lastName,
              firstName: firstName ? firstName : '',
              lastName: lastName ? lastName : ''
            };

            _log(`${LOG_PREFIX$5} - createUser - Account has been created in firebase: User(${userId}), Email(${email})`, user); // noinspection JSUnresolvedFunction


            user.updateProfile(userDetails).then(s => {
              _log(`${LOG_PREFIX$5} - createUser - First, Last and DisplayName have been added to profile: User(${userId}), Email(${email}), FirstName(${firstName}), LastName(${lastName})`, user);

              _log(`${LOG_PREFIX$5} - createUser - Constructing user: User(${userId}), Email(${email})`);

              this.userFactory.constructUser(userId, userDetails).then(constructedUser => {
                _log(`${LOG_PREFIX$5} - createUser - User has been constructed: User(${userId}), Email(${email})`, constructedUser);

                resolve(constructedUser);
              }).catch(error => {
                console.error(`${LOG_PREFIX$5} - createUser - Could not construct user: User(${userId}), Email(${email})`, error);
                reject(error);
              });
            }).catch(error => {
              console.error(`${LOG_PREFIX$5} - createUser - Could not add First and Last name to the user profile: User(${userId}), Email(${email}), FirstName(${firstName}), LastName(${lastName})`, error);
              reject(error);
            });
          } else {
            console.error(`$LOG_PREFIX} - There was an issue creating the account: Email(${email})`);
            reject(`There was an issue creating the account: Email(${email}`);
          }
        }).catch(error => {
          console.error(LOG_PREFIX$5 + ` - There was an issue creating the user: ${email}`, error);
          reject(error);
        });
      }).catch(error => reject(error));
    });
  }

  login(email, password) {
    return new Promise((resolve, reject) => {
      this.getBothAuth().then(([mainAuth, appAuth]) => {
        Promise.all([mainAuth.signInWithEmailAndPassword(email, password), appAuth.signInWithEmailAndPassword(email, password)]).then(([mainResponse, appResponse]) => {
          _log(`${LOG_PREFIX$5} - login - Response: `, mainResponse, appResponse);

          if (mainResponse.user && appResponse.user) {
            const userId = mainResponse.user.uid;
            this.userFactory.constructUser(userId).then(user => {
              resolve(user);
            }).catch(error => reject(error));
          } else {
            reject('Could not log in user: ' + email);
          }
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  logout() {
    return new Promise((resolve, reject) => {
      this.getBothAuth().then(([mainAuth, appAuth]) => {
        Promise.all([mainAuth.signOut(), appAuth.signOut()]).then(() => {
          const user = this.user;
          this.user = null;
          resolve({ ...user
          });
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  syncUser() {
    return new UserSyncWorker();
  }

}

const LOG_PREFIX$6 = 'FIREBASE-SERVICE';

class FirebaseSingleton {
  constructor() {
    _log(`${LOG_PREFIX$6} - constructor - creating FirebaseService`);

    this.firebase = undefined;
    this.auth = undefined;
    this.database = undefined;
  }

  init(config) {
    const {
      appName,
      appConfig,
      mainConfig
    } = config ? config : {};
    return new Promise((resolve, reject) => {
      (mainConfig ? loadFirebaseCDN() : loadFirebaseEmbedded()).then(firebase => {
        if (mainConfig) {
          firebase.initializeApp(mainConfig);
        }

        if (appConfig) {
          firebase.initializeApp(appConfig, appName);
        }

        this.firebase = firebase;
        this.auth = new AuthAdapter(firebase.auth(), appConfig && appName ? firebase.app(appName).auth() : undefined);
        this.database = new DatabaseAdapter(firebase.database(), appConfig && appName ? firebase.app(appName).database() : undefined);
        document.dispatchEvent(new CustomEvent(`firebase-service-ready`));
        resolve(`Firebase application has been initialised. AppName(${appName})`);
      }).catch(error => reject(error));
    });
  }

  getAuth() {
    const check = () => this.auth;

    const payload = () => this.auth;

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-service-ready', check, payload).then(db => {
        resolve(db);
      }).catch(error => reject(error));
    });
  }

  getFirebase() {
    const check = () => this.firebase;

    const payload = () => this.firebase;

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-service-ready', check, payload).then(firebase => {
        resolve(firebase);
      }).catch(error => reject(error));
    });
  }

  getDatabase() {
    const check = () => this.database;

    const payload = () => this.database;

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-service-ready', check, payload).then(database => {
        resolve(database);
      }).catch(error => reject(error));
    });
  }

  getUser() {
    return new Promise((resolve, reject) => {
      this.getAuth().then(auth => {
        auth.getUser().then(user => {
          resolve(user);
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  getUserId() {
    return new Promise((resolve, reject) => {
      this.getUser().then(user => {
        resolve(user.uid);
      }).catch(error => reject(error));
    });
  }

  syncUser() {
    return new UserSyncWorker();
  }

  login(email, password) {
    return new Promise((resolve, reject) => {
      this.getAuth().then(auth => {
        auth.login(email, password).then(user => {
          resolve(user);
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  logout() {
    return new Promise((resolve, reject) => {
      this.getAuth().then(auth => {
        auth.logout().then(user => {
          resolve(user);
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  createUser(email, password, firstName, lastName) {
    return new Promise((resolve, reject) => {
      this.getAuth().then(auth => {
        auth.createUser(email, password, firstName, lastName).then(user => {
          resolve(user);
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  forgotPassword(email) {
    return new Promise((resolve, reject) => {
      this.getAuth().then(auth => {
        auth.forgotPassword(email).then(user => {
          resolve(user);
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  onValue(path) {
    return new Promise((resolve, reject) => {
      this.getDatabase().then(database => {
        database.onValue(path).then(syncWorker => {
          resolve(syncWorker);
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  exists(path) {
    return new Promise((resolve, reject) => {
      this.getDatabase().then(database => {
        database.exists(path).then(value => {
          resolve(value);
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  getValue(path) {
    return new Promise((resolve, reject) => {
      this.getDatabase().then(database => {
        database.getValue(path).then(value => {
          resolve(value);
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  setValue(path) {
    return new Promise((resolve, reject) => {
      this.getDatabase().then(database => {
        database.setValue(path).then(() => {
          resolve();
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  deleteValues(path) {
    return new Promise((resolve, reject) => {
      this.getDatabase().then(database => {
        database.deleteValues(path).then(() => {
          resolve();
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  updateValues(path, value) {
    return new Promise((resolve, reject) => {
      this.getDatabase().then(database => {
        database.updateValues(path, value).then(() => {
          resolve();
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  insertValue(path, value) {
    return new Promise((resolve, reject) => {
      this.getDatabase().then(database => {
        database.insertValue(path, value).then(() => {
          resolve();
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

}

const Firebase = new FirebaseSingleton();

function addItem(role, type, item) {
  const LOG_METHOD = `${LOG_CLASS} - addItem(${role},${type})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/item/${type}` : `/${role}/${userId}/item/${type}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to add an item`, item);

      database.insertValue(path, item).then(() => {
        _log(`${LOG_PREFIX} -  added an item`, item);

        resolve();
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while adding item:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - could not get FirebaseService and userId:`, error);
      reject(error);
    });
  });
}

function hostAddItem(type, item) {
  return addItem(HOST, type, item);
}

function guestAddItem(type, item) {
  return addItem(GUEST, type, item);
}

function globalAddItem(type, item) {
  return addItem(GLOBAL, type, item);
}

function getItem(role, type, itemId) {
  const LOG_METHOD = `${LOG_CLASS} - addItem(${role},${type},${itemId})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/item/${type}/${itemId}` : `/${role}/${userId}/item/${type}/${itemId}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to get an item`);

      database.getValue(path).then(item => {
        _log(`${LOG_PREFIX} -  got an item`);

        resolve(item);
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while getting item:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - could not get FirebaseService and userId:`, error);
      reject(error);
    });
  });
}

function hostGetItem(type, item) {
  return getItem(HOST, type, item);
}

function guestGetItem(type, item) {
  return getItem(GUEST, type, item);
}

function globalGetItem(type, item) {
  return getItem(GLOBAL, type, item);
}

function syncItem(role, type, itemId) {
  const LOG_METHOD = `${LOG_CLASS} - syncItem(${role},${type},${itemId})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/item/${type}/${itemId}` : `/${role}/${userId}/item/${type}/${itemId}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to sync an item`);

      database.onValue(path).then(syncWorker => {
        _log(`${LOG_PREFIX} -  syncing item`);

        resolve(syncWorker);
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while syncing item:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - could not get FirebaseService and userId:`, error);
      reject(error);
    });
  });
}

function hostSyncItem(type, item) {
  return syncItem(HOST, type, item);
}

function guestSyncItem(type, item) {
  return syncItem(GUEST, type, item);
}

function globalSyncItem(type, item) {
  return syncItem(GLOBAL, type, item);
}

function updateItem(role, type, itemId, item) {
  const LOG_METHOD = `${LOG_CLASS} - addItem(${role},${type},${itemId})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/item/${type}/${itemId}` : `/${role}/${userId}/item/${type}/${itemId}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to update an item`, item);

      database.setValue(path, item).then(() => {
        _log(`${LOG_PREFIX} -  updated an item`, item);

        resolve();
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while updating item:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - could not get FirebaseService and userId:`, error);
      reject(error);
    });
  });
}

function hostUpdateItem(type, itemId, item) {
  return updateItem(HOST, type, itemId, item);
}

function guestUpdateItem(type, itemId, item) {
  return updateItem(GUEST, type, itemId, item);
}

function globalUpdateItem(type, itemId, item) {
  return updateItem(GLOBAL, type, itemId, item);
}

function deleteItem(role, type, itemId) {
  const LOG_METHOD = `${LOG_CLASS} - deleteItem(${role},${type},${itemId})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user(${userId})`;
      const path = role === 'global' ? `/${role}/item/${type}` : `/${role}/${userId}/item/${type}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to delete an item.`);

      database.deleteValues(path, itemId).then(() => {
        _log(`${LOG_PREFIX} - path(${path}) - item has been deleted.`);

        resolve();
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while deleting item:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - error while deleting item:`, error);
      reject(error);
    });
  });
}

function hostDeleteItem(type, itemsToDelete) {
  return deleteItem(HOST, type, itemsToDelete);
}

function guestDeleteItem(type, itemsToDelete) {
  return deleteItem(GUEST, type, itemsToDelete);
}

function globalDeleteItem(type, itemsToDelete) {
  return deleteItem(GLOBAL, type, itemsToDelete);
}

function addJoins(role, type, typeId, joins) {
  const LOG_METHOD = `${LOG_CLASS} - addJoin(${role},${type},${typeId})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/join/${type}/${typeId}` : `/${role}/${userId}/join/${type}/${typeId}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to add joins`, joins);

      database.updateValues(path, joins).then(() => {
        _log(`${LOG_PREFIX} -  added joins`, joins);

        resolve();
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while adding joins:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - could not get FirebaseService and userId:`, error);
      reject(error);
    });
  });
}

function hostAddJoins(type, parent, joins) {
  return addJoins(HOST, type, parent, joins);
}

function guestAddJoins(type, parent, joins) {
  return addJoins(GUEST, type, parent, joins);
}

function globalAddJoins(type, parent, joins) {
  return addJoins(GLOBAL, type, parent, joins);
}

function getJoins(role, type, typeId) {
  const LOG_METHOD = `${LOG_CLASS} - getJoins(${role},${type},${typeId})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/join/${type}/${typeId}` : `/${role}/${userId}/join/${type}/${typeId}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to get an item`);

      database.getValue(path).then(item => {
        _log(`${LOG_PREFIX} -  got join list`);

        resolve(item);
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while getting join list:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - could not get FirebaseService and userId:`, error);
      reject(error);
    });
  });
}

function hostGetJoins(type, typeId) {
  return getJoins(HOST, type, typeId);
}

function guestGetJoins(type, typeId) {
  return getJoins(GUEST, type, typeId);
}

function globalGetJoins(type, typeId) {
  return getJoins(GLOBAL, type, typeId);
}

function syncJoins(role, type, typeId) {
  const LOG_METHOD = `${LOG_CLASS} - syncJoins(${role},${type},${typeId})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user(${userId})`;
      const path = role === 'global' ? `/${role}/join/${type}/${typeId}` : `/${role}/${userId}/join/${type}/${typeId}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to get an item`);

      database.onValue(path).then(syncWorker => {
        _log(`${LOG_PREFIX} -  syncing join list`);

        resolve(syncWorker);
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while syncing join list:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - could not get FirebaseService and userId:`, error);
      reject(error);
    });
  });
}

function hostSyncJoins(type, typeId) {
  return syncJoins(HOST, type, typeId);
}

function guestSyncJoins(type, typeId) {
  return syncJoins(GUEST, type, typeId);
}

function globalSyncJoins(type, typeId) {
  return syncJoins(GLOBAL, type, typeId);
}

function deleteJoins(role, type, typeId, joins) {
  const LOG_METHOD = `${LOG_CLASS} - deleteJoins(${role},${type},${typeId})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/join/${type}/${typeId}` : `/${role}/${userId}/join/${type}/${typeId}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to delete joins`, joins);

      database.deleteValues(path, joins).then(() => {
        _log(`${LOG_PREFIX} -  deleted joins`, joins);

        resolve();
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while deleting joins:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - could not get FirebaseService and userId:`, error);
      reject(error);
    });
  });
}

function hostDeleteJoins(type, parent, joins) {
  return deleteJoins(HOST, type, parent, joins);
}

function guestDeleteJoins(type, parent, joins) {
  return deleteJoins(GUEST, type, parent, joins);
}

function globalDeleteJoins(type, parent, joins) {
  return deleteJoins(GLOBAL, type, parent, joins);
}

function getList(role, type) {
  const LOG_METHOD = `${LOG_CLASS} - getJoins(${role},${type})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/list/${type}` : `/${role}/${userId}/list/${type}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to get an item`);

      database.getValue(path).then(item => {
        _log(`${LOG_PREFIX} -  got join list`);

        resolve(item);
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while getting join list:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - could not get FirebaseService and userId:`, error);
      reject(error);
    });
  });
}

function hostGetList(type) {
  return getList(HOST, type);
}

function guestGetList(type) {
  return getList(GUEST, type);
}

function globalGetList(type) {
  return getList(GLOBAL, type);
}

function syncList(role, type) {
  const LOG_METHOD = `${LOG_CLASS} - syncItem(${role},${type})`;
  return new Promise((resolve, reject) => {
    _log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);

    Promise.all([Firebase.getDatabase(), Firebase.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/list/${type}` : `/${role}/${userId}/list/${type}`;

      _log(`${LOG_PREFIX} - path(${path}) - about to sync a list`);

      database.onValue(path).then(syncWorker => {
        _log(`${LOG_PREFIX} -  syncing list`);

        resolve(syncWorker);
      }).catch(error => {
        console.error(`${LOG_PREFIX} - error while syncing list:`, error);
        reject(error);
      });
    }).catch(error => {
      console.error(`${LOG_METHOD} - could not get FirebaseService and userId:`, error);
      reject(error);
    });
  });
}

function hostSyncList(type) {
  return syncList(HOST, type);
}

function guestSyncList(type) {
  return syncList(GUEST, type);
}

function globalSyncList(type) {
  return syncList(GLOBAL, type);
}

export { Firebase, globalAddItem, globalAddJoins, globalDeleteItem, globalDeleteJoins, globalGetItem, globalGetJoins, globalGetList, globalSyncItem, globalSyncJoins, globalSyncList, globalUpdateItem, guestAddItem, guestAddJoins, guestDeleteItem, guestDeleteJoins, guestGetItem, guestGetJoins, guestGetList, guestSyncItem, guestSyncJoins, guestSyncList, guestUpdateItem, hostAddItem, hostAddJoins, hostDeleteItem, hostDeleteJoins, hostGetItem, hostGetJoins, hostGetList, hostSyncItem, hostSyncJoins, hostSyncList, hostUpdateItem };
