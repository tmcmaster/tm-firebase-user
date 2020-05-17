import { l as loadFirebaseCDN, a as loadFirebaseEmbedded } from '../common/index-0be88400.js';

const RESOURCE_TIMEOUT = 30000;
const LOG_PREFIX = 'FIREBASE-UTILS';

function whenResourceReady(name, check, payload) {
  const eventName = name + '-ready';
  return new Promise((resolve, reject) => {
    if (check()) {
      const resource = payload();
      console.log(`${LOG_PREFIX} - whenResourceReady - resource ready.:`, resource);
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
          console.log(`${LOG_PREFIX} - whenResourceReady - Resource(${name}) is ready:`, resource);
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
        console.log(`${LOG_PREFIX} - whenResourceReady - Resource(${name}) is ready:`, resource);
        resolve(resource);
      };

      document.addEventListener(eventName, listener);
    }
  });
}

const LOG_PREFIX$1 = 'SYNC-WORKER';

class SyncWorker {
  constructor(db, path) {
    this.db = db;
    this.path = path;

    this.reject = error => console.error('SyncWorker: ', error);
  }

  sync(resolve) {
    console.log(`${LOG_PREFIX$1} - sync - path(${this.path})`);

    this.resolve = snapshot => {
      const value = snapshot.val();
      console.log(`${LOG_PREFIX$1} - sync - path(${this.path}): `, value);
      resolve(value);
    };

    this.ref = this.db.ref(this.path);
    this.ref.on('value', snapshot => {
      this.resolve(snapshot);
    }, error => {
      this.reject(error);
    });
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

const LOG_PREFIX$2 = 'DATABASE-ADAPTER';

class DatabaseAdapter {
  constructor(database) {
    this.db = database;
    this.junk = 'testing';
  }

  onValue(path) {
    return new Promise((resolve, reject) => {
      resolve(new SyncWorker(this.db, path));
    });
  }

  exists(path) {
    return new Promise((resolve, reject) => {
      this.db.ref(path).once('value', snapshot => {
        resolve(snapshot.exists());
      }, error => reject(error));
    });
  }

  getValue(path) {
    return new Promise((resolve, reject) => {
      console.log(`${LOG_PREFIX$2} - getValue(${path})`);
      this.db.ref(path).once('value', snapshot => {
        const value = snapshot.val();
        console.log(`${LOG_PREFIX$2} - getValue(${path}): `, value);
        resolve(value);
      }, error => reject(error));
    });
  }

  setValue(path, value) {
    return new Promise((resolve, reject) => {
      this.db.ref(path).set(value, error => {
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
      this.db.ref(path).update(updateMap, error => {
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
      this.db.ref(path).update(value, error => {
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
      this.db.ref(path).push(value, error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  getDB() {
    return this.db;
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

const LOG_PREFIX$3 = 'FIREBASE-SERVICE';

class FirebaseServiceSingleton {
  constructor() {
    console.log(`${LOG_PREFIX$3} - constructor - creating FirebaseService`);
    this.firebaseReady = false;
    this.firebase = undefined;
    this.appName = undefined;
    this.mainAuth = undefined;
    this.appAuth = undefined;
    this.mainDatabase = undefined;
    this.appDatabase = undefined;
    this.user = undefined;
    this.creatingUser = false;
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
        this.appName = appName;
        this.mainAuth = firebase.auth();
        this.appAuth = appConfig && appName ? firebase.app(appName).auth() : this.mainAuth;
        this.mainDatabase = new DatabaseAdapter(firebase.database());
        this.appDatabase = appConfig && appName ? new DatabaseAdapter(firebase.app(appName).database()) : this.mainDatabase;
        document.dispatchEvent(new CustomEvent(`firebase-auth-ready`));
        document.dispatchEvent(new CustomEvent(`firebase-database-ready`));
        this.listenForLoginAndLogout();
        resolve(`Firebase application has been initialised. AppName(${this.appName})`);
      }).catch(error => reject(error));
    });
  }

  listenForLoginAndLogout() {
    console.log(`${LOG_PREFIX$3} - listenForLoginAndLogout -  Listening for when users login or logout`);
    this.mainAuth.onAuthStateChanged(user => {
      if (user) {
        console.log(`${LOG_PREFIX$3} - listenForLoginAndLogout - User has logged in: `, user);
        const userId = user.uid;

        if (this.creatingUser) {
          console.log(`${LOG_PREFIX$3} - listenForLoginAndLogout - User is in the process of being created: User(${userId})`, user);
        } else {
          constructUser(userId).then(constructedUser => {
            this.user = constructedUser;
            window.user = constructedUser;
            console.log(`${LOG_PREFIX$3} - listenForLoginAndLogout - User has been constructed: `, constructedUser);
            document.dispatchEvent(new CustomEvent('user-logged-in', { ...constructedUser
            }));
          }).catch(error => {
            console.error(`${LOG_PREFIX$3} - listenForLoginAndLogout - there was an issue while constructing the user`, error);
          });
        }
      } else {
        if (this.user !== undefined) {
          console.log(LOG_PREFIX$3 + ' - User has logged out.');
          const user = { ...this.user
          };
          this.user = undefined;
          window.user = undefined;
          document.dispatchEvent(new CustomEvent('user-logged-out', { ...user
          }));
        }
      }
    });
  }

  whenAuthReady() {
    const check = () => this.mainAuth && this.appAuth;

    const payload = () => {};

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-auth', check, payload).then(() => {
        console.log('=== Auth', this.mainAuth, this.appAuth);
        console.log('=== Database', this.mainDatabase, this.appDatabase);
        resolve();
      }).catch(error => reject(error));
    });
  }

  getDb() {
    const check = () => this.mainDatabase;

    const payload = () => this.mainDatabase.getDB();

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-database', check, payload).then(database => {
        resolve(database);
      }).catch(error => reject(error));
    });
  }

  getAuth() {
    const check = () => this.mainAuth;

    const payload = () => this.mainAuth;

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-auth', check, payload).then(database => {
        resolve(database);
      }).catch(error => reject(error));
    });
  }

  getFirebase() {
    const check = () => this.firebase;

    const payload = () => this.firebase;

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-auth', check, payload).then(database => {
        resolve(database);
      }).catch(error => reject(error));
    });
  }

  getDatabase() {
    const check = () => this.firebaseReady && this.appDatabase;

    const payload = () => this.appDatabase;

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-database', check, payload).then(database => {
        resolve(database);
      }).catch(error => reject(error));
    });
  }

  getMainDatabase() {
    const check = () => this.firebaseReady && this.mainDatabase;

    const payload = () => this.mainDatabase;

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-database', check, payload).then(database => {
        resolve(database);
      }).catch(error => reject(error));
    });
  }

  getUser() {
    const check = () => this.user;

    const payload = () => this.user;

    return new Promise((resolve, reject) => {
      whenResourceReady('firebase-database', check, payload).then(user => {
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

  forgotPassword(email) {
    return new Promise((resolve, reject) => {
      this.whenAuthReady().then(() => {
        this.mainAuth.sendPasswordResetEmail(email).then(() => {
          console.log(LOG_PREFIX$3 + ` - forgotPassword - Password reset email has been sent. Email(${email})`);
          resolve();
        }).catch(error => {
          console.log(`${LOG_PREFIX$3} - forgotPassword - Password reset failed: Email(${email})`, error);
          reject();
        });
      }).catch(error => reject(error));
    });
  }

  createUser(email, password, firstName, lastName) {
    return new Promise((resolve, reject) => {
      this.whenAuthReady().then(() => {
        this.creatingUser = true;
        this.mainAuth.createUserWithEmailAndPassword(email, password).then(response => {
          if (response) {
            const user = this.mainAuth.currentUser;
            const userId = user.uid;
            const userDetails = {
              displayName: firstName + (firstName && lastName ? ' ' : '') + lastName,
              firstName: firstName ? firstName : '',
              lastName: lastName ? lastName : ''
            };
            console.log(`${LOG_PREFIX$3} - createUser - Account has been created in firebase: User(${userId}), Email(${email})`, user); // noinspection JSUnresolvedFunction

            user.updateProfile(userDetails).then(s => {
              console.log(`${LOG_PREFIX$3} - createUser - First, Last and DisplayName have been added to profile: User(${userId}), Email(${email}), FirstName(${firstName}), LastName(${lastName})`, user);
              console.log(`${LOG_PREFIX$3} - createUser - Waiting for user detail and status to be added to database: User(${userId}), Email(${email})`); // TODO: need to find a better way of listening for when user data has been created.

              setTimeout(() => {
                console.log(`${LOG_PREFIX$3} - createUser - Constructing user: User(${userId}), Email(${email})`);
                constructUser(userId, userDetails).then(constructedUser => {
                  console.log(`${LOG_PREFIX$3} - createUser - User has been constructed: User(${userId}), Email(${email})`, constructedUser);
                  this.user = constructedUser;
                  window.user = constructedUser;
                  this.creatingUser = false;
                  document.dispatchEvent(new CustomEvent('user-logged-in', { ...constructedUser
                  }));
                  resolve(constructedUser);
                }).catch(error => {
                  console.error(`${LOG_PREFIX$3} - createUser - Could not construct user: User(${userId}), Email(${email})`, error);
                  reject(error);
                });
              }, 5000);
            }).catch(error => {
              console.error(`${LOG_PREFIX$3} - createUser - Could not add First and Last name to the user profile: User(${userId}), Email(${email}), FirstName(${firstName}), LastName(${lastName})`, error);
              reject(error);
            });
          } else {
            console.error(`$LOG_PREFIX} - There was an issue creating the account: Email(${email})`);
            reject(`There was an issue creating the account: Email(${email}`);
          }
        }).catch(error => {
          console.error(LOG_PREFIX$3 + ` - There was an issue creating the user: ${email}`, error);
          reject(error);
        });
      }).catch(error => reject(error));
    });
  }

  login(email, password) {
    return new Promise((resolve, reject) => {
      this.whenAuthReady().then(() => {
        Promise.all([this.mainAuth.signInWithEmailAndPassword(email, password), this.appAuth.signInWithEmailAndPassword(email, password)]).then(([mainResponse, appResponse]) => {
          console.log(`${LOG_PREFIX$3} - login - Response: `, mainResponse, appResponse);

          if (mainResponse.user && appResponse.user) {
            const userId = mainResponse.user.uid;
            constructUser(userId).then(user => {
              this.firebaseReady = true;
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
      this.whenAuthReady().then(() => {
        this.firebaseReady = false;
        Promise.all([this.mainAuth.signOut(), this.appAuth.signOut()]).then(() => {
          this.user = null;
          resolve();
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

}

function constructUser(userId, userDetails) {
  console.log(LOG_PREFIX$3 + ` - Retrieving user details from the database: uid(${userId}), User Details: `, userDetails);
  return new Promise((resolve, reject) => {
    Promise.all([retrieveUser(userId), retrieveStatus(userId)]).then(([user, status]) => {
      if (userDetails) {
        saveSaveUser(userId, Object.assign({ ...user
        }, userDetails)).then(() => {
          const constructedUser = Object.assign({ ...user
          }, status, userDetails);
          console.log(LOG_PREFIX$3 + ` - New user details have been saved, and user constructed: uid(${userId}), ConstructedUser: `, userDetails);
          resolve(constructedUser);
        }).catch(error => reject(error));
      } else {
        const constructedUser = Object.assign({ ...user
        }, status);
        console.log(LOG_PREFIX$3 + ` - User constructed: uid(${userId}), ConstructedUser: `, userDetails);
        resolve(constructedUser);
      }
    }).catch(error => reject(error));
  });
}

function retrieveUser(userId) {
  console.log(LOG_PREFIX$3 + ` - Retrieving user from the database: uid(${userId})`);
  return new Promise((resolve, reject) => {
    // noinspection JSUnresolvedVariable,JSUnresolvedFunction
    FirebaseService.getDb().then(db => {
      db.ref('users/' + userId).once('value', snapshot => {
        let user = snapshot.val();

        if (user) {
          console.log(LOG_PREFIX$3 + ` - Retrieved user from database: Email(${user.email}), uid(${userId})`, user);
          resolve(user);
        } else {
          reject('Could not get the user details: ' + userId);
        }
      }, error => {
        console.error(LOG_PREFIX$3 + ` - There was an error retrieving the user from database: uid(${userId})`, error);
        reject(error);
      });
    }).catch(error => console.error(`${LOG_PREFIX$3} - retrieveUser - could not get database:`, error));
  });
}

function retrieveStatus(userId) {
  console.log(LOG_PREFIX$3 + ` - Retrieving user status from the database: uid(${userId})`);
  return new Promise((resolve, reject) => {
    // noinspection JSUnresolvedVariable,JSUnresolvedFunction
    FirebaseService.getDb().then(db => {
      db.ref('status/' + userId).once('value', snapshot => {
        let userStatus = snapshot.val();

        if (userStatus) {
          console.log(LOG_PREFIX$3 + ` - Retrieved user from database: uid(${userId})`, userStatus);
          resolve(userStatus);
        } else {
          reject('Could not get the user details: ' + userId);
        }
      }, error => {
        console.error(LOG_PREFIX$3 + ` - There was an error retrieving the user status from database: uid(${userId})`, error);
        reject(error);
      });
    }).catch(error => console.error(`${LOG_PREFIX$3} - retrieveStatus - could not get database:`, error));
  });
}

function saveSaveUser(userId, user) {
  console.log(LOG_PREFIX$3 + `Saving user to the database: uid(${userId})`, user);
  return new Promise((resolve, reject) => {
    FirebaseService.getDb().then(db => {
      // noinspection JSUnresolvedVariable,JSUnresolvedFunction
      db.ref('users/' + userId).update(user).then(() => {
        console.log(LOG_PREFIX$3 + ` - Saved the user into the database: Email(${user.email}), uid(${userId})`, user);
        resolve();
      }).catch(error => {
        console.error(LOG_PREFIX$3 + ` - There was an error saving the user into the database: Email(${user.email}), uid(${userId})`, error);
        reject(error);
      });
    }).catch(error => console.error(`${LOG_PREFIX$3} - retrieveStatus - could not get database:`, error));
  });
}

const FirebaseService = new FirebaseServiceSingleton();

const GLOBAL = 'global';
const HOST = 'host';
const GUEST = 'guest';
const LOG_CLASS = 'DOMAIN_UTIL';

function addItem(role, type, item) {
  const LOG_METHOD = `${LOG_CLASS} - addItem(${role},${type})`;
  return new Promise((resolve, reject) => {
    console.log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);
    Promise.all([FirebaseService.getDatabase(), FirebaseService.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/item/${type}` : `/${role}/${userId}/item/${type}`;
      console.log(`${LOG_PREFIX} - path(${path}) - about to add an item`, item);
      database.insertValue(path, item).then(() => {
        console.log(`${LOG_PREFIX} -  added an item`, item);
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
    console.log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);
    Promise.all([FirebaseService.getDatabase(), FirebaseService.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/item/${type}/${itemId}` : `/${role}/${userId}/item/${type}/${itemId}`;
      console.log(`${LOG_PREFIX} - path(${path}) - about to get an item`);
      database.getValue(path).then(item => {
        console.log(`${LOG_PREFIX} -  got an item`);
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
    console.log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);
    Promise.all([FirebaseService.getDatabase(), FirebaseService.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/item/${type}/${itemId}` : `/${role}/${userId}/item/${type}/${itemId}`;
      console.log(`${LOG_PREFIX} - path(${path}) - about to sync an item`);
      database.onValue(path).then(syncWorker => {
        console.log(`${LOG_PREFIX} -  syncing item`);
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
    console.log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);
    Promise.all([FirebaseService.getDatabase(), FirebaseService.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/item/${type}/${itemId}` : `/${role}/${userId}/item/${type}/${itemId}`;
      console.log(`${LOG_PREFIX} - path(${path}) - about to update an item`, item);
      database.setValue(path, item).then(() => {
        console.log(`${LOG_PREFIX} -  updated an item`, item);
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
    console.log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);
    Promise.all([FirebaseService.getDatabase(), FirebaseService.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user(${userId})`;
      const path = role === 'global' ? `/${role}/item/${type}` : `/${role}/${userId}/item/${type}`;
      console.log(`${LOG_PREFIX} - path(${path}) - about to delete an item.`);
      database.deleteValues(path, itemId).then(() => {
        console.log(`${LOG_PREFIX} - path(${path}) - item has been deleted.`);
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
    console.log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);
    Promise.all([FirebaseService.getDatabase(), FirebaseService.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/join/${type}/${typeId}` : `/${role}/${userId}/join/${type}/${typeId}`;
      console.log(`${LOG_PREFIX} - path(${path}) - about to add joins`, joins);
      database.updateValues(path, joins).then(() => {
        console.log(`${LOG_PREFIX} -  added joins`, joins);
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
    console.log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);
    Promise.all([FirebaseService.getDatabase(), FirebaseService.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/join/${type}/${typeId}` : `/${role}/${userId}/join/${type}/${typeId}`;
      console.log(`${LOG_PREFIX} - path(${path}) - about to get an item`);
      database.getValue(path).then(item => {
        console.log(`${LOG_PREFIX} -  got join list`);
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
    console.log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);
    Promise.all([FirebaseService.getDatabase(), FirebaseService.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user(${userId})`;
      const path = role === 'global' ? `/${role}/join/${type}/${typeId}` : `/${role}/${userId}/join/${type}/${typeId}`;
      console.log(`${LOG_PREFIX} - path(${path}) - about to get an item`);
      database.onValue(path).then(syncWorker => {
        console.log(`${LOG_PREFIX} -  syncing join list`);
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
    console.log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);
    Promise.all([FirebaseService.getDatabase(), FirebaseService.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/join/${type}/${typeId}` : `/${role}/${userId}/join/${type}/${typeId}`;
      console.log(`${LOG_PREFIX} - path(${path}) - about to delete joins`, joins);
      database.deleteValues(path, joins).then(() => {
        console.log(`${LOG_PREFIX} -  deleted joins`, joins);
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
    console.log(`${LOG_METHOD} - waiting for FirebaseService and userId.`);
    Promise.all([FirebaseService.getDatabase(), FirebaseService.getUserId()]).then(([database, userId]) => {
      const LOG_PREFIX = `${LOG_METHOD} - user($userId)`;
      const path = role === 'global' ? `/${role}/list/${type}` : `/${role}/${userId}/list/${type}`;
      console.log(`${LOG_PREFIX} - path(${path}) - about to get an item`);
      database.getValue(path).then(item => {
        console.log(`${LOG_PREFIX} -  got join list`);
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

export { FirebaseService, globalAddItem, globalAddJoins, globalDeleteItem, globalDeleteJoins, globalGetItem, globalGetJoins, globalGetList, globalSyncItem, globalSyncJoins, globalUpdateItem, guestAddItem, guestAddJoins, guestDeleteItem, guestDeleteJoins, guestGetItem, guestGetJoins, guestGetList, guestSyncItem, guestSyncJoins, guestUpdateItem, hostAddItem, hostAddJoins, hostDeleteItem, hostDeleteJoins, hostGetItem, hostGetJoins, hostGetList, hostSyncItem, hostSyncJoins, hostUpdateItem };
