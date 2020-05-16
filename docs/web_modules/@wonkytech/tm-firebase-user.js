import './material-elements.js';
import { h as html } from '../common/lit-html-0e66f29e.js';
import { LitElement, css } from '../lit-element.js';

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
  console.log('Checking script exists: ' + script);

  const scriptElement = _getScriptByName(script);

  if (scriptElement === undefined) {
    return new Promise((resolve, reject) => {
      console.log('Loading script: ' + script);
      let newScript = document.createElement("script");
      newScript.defer = true;
      newScript.status = 'loading';
      newScript.TMScriptLoader = {
        src: script,
        status: 'loading'
      };

      newScript.onload = event => {
        console.log('Script has been loaded: ' + script);
        newScript.TMScriptLoader.status = 'loaded';
        resolve();
      };

      newScript.onerror = error => {
        console.error(`There was an issue loading script: url(${script}):`, error);
        newScript.TMScriptLoader.status = 'failed';
        reject(error);
      };

      document.getElementsByTagName('head')[0].append(newScript);
      newScript.src = script.toString();
    });
  } else {
    const scriptStatus = scriptElement.TMScriptLoader ? scriptElement.TMScriptLoader.status : undefined;

    if (scriptStatus === 'loaded') {
      console.log('Script was already loaded:' + script);
      return new Promise((resolve, reject) => {
        resolve();
      });
    } else if (scriptStatus === 'loading') {
      console.log('Script had already started loading:' + script);
      return new Promise((resolve, reject) => {
        scriptElement.addEventListener('load', () => {
          resolve();
        }, e => {
          reject(e);
        });
      });
    } else {
      console.warn('Script is already there, but unknown status:' + script);
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
            reject(new Error("Script took to long to load."));
          }
        }, 500);
      });
    }
  }
} // TODO: need to add logic to test if the link has already been added.


function loadLink(link) {
  const newLink = document.createElement("link");
  newLink.setAttribute("rel", "stylesheet");
  newLink.setAttribute("href", link);

  newLink.onload = event => {
    console.log('Script has been loaded successfully: ' + link);
  };

  newLink.onerror = error => {
    console.error(`There was an issue loading link(${link}):`, error);
  };

  document.getElementsByTagName('head')[0].append(newLink);
}

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
    load: ['https://www.gstatic.com/firebasejs/7.4.0/firebase-app.js', 'https://www.gstatic.com/firebasejs/7.4.0/firebase-analytics.js', 'https://www.gstatic.com/firebasejs/7.4.0/firebase-auth.js'],
    then: {
      load: ['https://www.gstatic.com/firebasejs/7.4.0/firebase-database.js', 'https://www.gstatic.com/firebasejs/7.4.0/firebase-messaging.js', 'https://www.gstatic.com/firebasejs/7.4.0/firebase-storage.js']
    },
    payload: () => window.firebase
  });
}

loadLink("https://fonts.googleapis.com/icon?family=Material+Icons");
const LOG_PREFIX = 'TM-FIREBASE-USER';
window.customElements.define('tm-firebase-user', class extends LitElement {
  // noinspection JSUnusedGlobalSymbols
  static get properties() {
    return {
      user: {
        type: Object
      },
      config: {
        type: Object
      },
      activeIndex: {
        type: Number
      },
      remember: {
        type: Boolean
      },
      errorMessage: {
        type: String
      }
    };
  }

  constructor() {
    super();
    this.user = undefined;
    this.config = undefined;
    this.userDetails = undefined;
    this.activeIndex = 0;
    this.remember = false;
  } // noinspection JSUnusedGlobalSymbols


  connectedCallback() {
    super.connectedCallback();

    this._loginListener = () => this.login();

    this._logoutListener = () => this.logout();

    document.addEventListener('user-login', this._loginListener);
    document.addEventListener('user-logout', this._logoutListener);
  } // noinspection JSUnusedGlobalSymbols


  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('user-login', this._loginListener);
    document.removeEventListener('user-logout', this._logoutListener);
    this._loginListener = undefined;
    this._logoutListener = undefined;
  } // noinspection JSUnusedGlobalSymbols


  firstUpdated(_changedProperties) {
    super.firstUpdated(_changedProperties);
    const user = this.retrieveUserLocally();
    this.remember = user.remember;
    const tabBar = this.shadowRoot.querySelector('#tabBar');
    const email = this.shadowRoot.querySelector('#email');
    const password = this.shadowRoot.querySelector('#password');
    const firstName = this.shadowRoot.querySelector('#firstName');
    const lastName = this.shadowRoot.querySelector('#lastName');
    const remember = this.shadowRoot.querySelector('#remember');
    const rememberMe = this.shadowRoot.querySelector('#rememberMe');
    email.classList.remove('hidden');
    password.classList.add('hidden');
    firstName.classList.add('hidden');
    lastName.classList.add('hidden');
    rememberMe.classList.add('hidden');

    remember.onchange = () => {
      this.remember = this.shadowRoot.getElementById('remember').checked;
    };

    if (this.config === undefined) {
      loadFirebaseEmbedded().then(firebase => {
        this.initFirebase(firebase);
      });
    } else {
      loadFirebaseCDN().then(firebase => {
        firebase.initializeApp(this.config);
        this.initFirebase(firebase);
      });
    }

    tabBar.addEventListener('MDCTabBar:activated', e => {
      if (email && password && firstName && lastName && remember) {
        console.log(LOG_PREFIX + ' - TAB ACTION:', e);
        const index = e.detail.index;
        const tabs = tabBar.getElementsByTagName('mwc-tab');
        const name = tabs[index].getAttribute("name");
        this.loginAction = name;
        email.value = '';
        password.value = '';
        firstName.value = '';
        lastName.value = '';
        console.log(LOG_PREFIX + ' - Enabling fields for action: :' + this.loginAction);

        if (name === 'create') {
          email.classList.remove('hidden');
          password.classList.remove('hidden');
          firstName.classList.remove('hidden');
          lastName.classList.remove('hidden');
          rememberMe.classList.remove('hidden');
        } else if (name === 'forgot') {
          email.value = this.remember ? user.email : '';
          email.classList.remove('hidden');
          password.classList.add('hidden');
          firstName.classList.add('hidden');
          lastName.classList.add('hidden');
          rememberMe.classList.add('hidden');
        } else if (name === 'login') {
          email.value = this.remember ? user.email : '';
          password.value = this.remember ? user.password : '';
          email.classList.remove('hidden');
          password.classList.remove('hidden');
          firstName.classList.add('hidden');
          lastName.classList.add('hidden');
          rememberMe.classList.remove('hidden');
        }
      }
    });
  }

  initFirebase(firebase) {
    console.log(LOG_PREFIX + ' - Firebase is now available.');
    this.firebase = firebase;
    document.dispatchEvent(createEvent('firebase-ready'));
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        console.log(LOG_PREFIX + ' - User has logged in: ', user);
        const userId = user.uid;

        if (this.userDetails) {
          // TODO: this timeout needs to be remove, and replaced by waiting for when the user records have been created.
          setTimeout(() => {
            this.constructUser(userId, this.userDetails).then(constructedUser => {
              this.userDetails = undefined;
              this.user = constructedUser;
              window.user = constructedUser;
              document.dispatchEvent(createEvent('user-logged-in', { ...constructedUser
              }));
            }).catch(error => {
              console.error(`${LOG_PREFIX} - onAuthStateChanged - Could not construct new user, with extra details.`, error);
            });
          }, 5000);
        } else {
          this.constructUser(userId).then(constructedUser => {
            this.user = constructedUser;
            window.user = constructedUser;
            document.dispatchEvent(createEvent('user-logged-in', { ...constructedUser
            }));
          }).catch(error => {
            console.error(`${LOG_PREFIX} - onAuthStateChanged - Could not construct new user.`, error);
          });
        }
      } else {
        if (this.user !== undefined) {
          console.log(LOG_PREFIX + ' - User has logged out.');
          const user = { ...this.user
          };
          this.firstName = undefined;
          this.lastName = undefined;
          this.user = undefined;
          window.user = undefined;
          document.dispatchEvent(createEvent('user-logged-out', { ...user
          }));
        }
      }
    });
  }

  constructUser(userId, userDetails) {
    console.log(LOG_PREFIX + ` - Retrieving user details from the database: uid(${userId}), User Details: `, userDetails);
    return new Promise((resolve, reject) => {
      Promise.all([this.retrieveUser(userId), this.retrieveStatus(userId)]).then(([user, status]) => {
        if (userDetails) {
          this.saveSaveUser(userId, Object.assign({ ...user
          }, userDetails)).then(() => {
            const constructedUser = Object.assign({ ...user
            }, status, userDetails);
            console.log(LOG_PREFIX + ` - New user details have been saved, and user constructed: uid(${userId}), ConstructedUser: `, userDetails);
            resolve(constructedUser);
          }).catch(error => reject(error));
        } else {
          const constructedUser = Object.assign({ ...user
          }, status);
          console.log(LOG_PREFIX + ` - User constructed: uid(${userId}), ConstructedUser: `, userDetails);
          resolve(constructedUser);
        }
      }).catch(error => reject(error));
    });
  } // noinspection JSUnusedGlobalSymbols


  static get styles() {
    // language=CSS
    return css`
            :host {
                display: inline-block;
                box-sizing: border-box;
                //width: 50vw;
                
                --dialog-color: var(--firebase-user-dialog-color, #1A73E8);
            }

            div.body {
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
            }
            h2 {
                color: gray;
            }
            .hidden {
                display: none;
            }

            mwc-textfield {
                width: 80%;
                margin-left: 10%;
                margin-right: 10%;
            }

            mwc-dialog {
                display:inline-block;
            }

            div.fields {
                padding-top: 20px;
            }

            div.title {
                display: flex;
                flex-direction: row;
                box-sizing: border-box;
                align-items: center;
                //border: solid white 2px;
            }

            div.username {
                flex: auto;
                display: inline-block;
                box-sizing: border-box;
                font-size: 1.8vh;
                padding-right: 20px;
                color: var(--tm-firebase-user-color, lightgray);
            }

            mwc-button.title {
                flex: 1;
                --mdc-theme-primary: var(--tm-firebase-user-color, lightgray);
                --mdc-theme-on-primary: var(--tm-firebase-user-color, lightgray);
            }
            
            mwc-tab {
                --mdc-theme-primary: var(--dialog-color);
                --mdc-theme-secondary: var(--dialog-color);;
                --mdc-tab-text-label-color-default: var(--dialog-color);;
                --mdc-tab-color-default: var(--dialog-color);;
            }
            
            mwc-button.action {
                --mdc-button-outline-color: var(--dialog-color);;
                --mdc-theme-primary: var(--dialog-color);;
                border: solid var(--dialog-color) 1px;
                margin-bottom: 20px;
            }

            mwc-button.last {
                margin-right: 35px;
            }
            
            mwc-textfield {
                --mdc-theme-primary: var(--dialog-color);;
                ---mdc-text-field-ink-color: var(--dialog-color);;
                ---mdc-text-field-label-ink-color: var(--dialog-color);;
                --mdc-text-field-idle-line-color: var(--dialog-color);;
            }

            #rememberMe {
                display: flex;
                flex-direction: row;
                justify-content: start;
                box-sizing: border-box;
                margin-left: 40px;
                margin-top: 5px;
            }

            #rememberMe > span {
                padding-top: 8px;
            }
        `;
  } // noinspection JSUnusedGlobalSymbols


  render() {
    return html`
            <div class="body">
                <div class="title">
                    ${this.user === undefined ? html`
                        <mwc-button id="title-login" class="title" outlined @click="${() => this.login()}">Login</mwc-button>
                    ` : html`
                        <mwc-button id="title-logout"  class="title" outlined @click="${() => this.logout()}">logout</mwc-button>
                    `}
                </div>
                <mwc-dialog id="dialog">
                    <mwc-tab-bar id="tabBar" activeIndex="${this.activeIndex}">
                      <mwc-tab name="login" label="Login" icon="lock" stacked isMinWidthIndicator ></mwc-tab>
                      <mwc-tab name="create" label="Create Account" icon="create" stacked isMinWidthIndicator></mwc-tab>
                      <mwc-tab name="forgot" label="Forgot Password" icon="email" stacked isMinWidthIndicator></mwc-tab>
                    </mwc-tab-bar>
                    
                    <div class="fields">
                        <mwc-textfield id="email" label="Email Address" type="email"></mwc-textfield>
                        <mwc-textfield id="password" label="Password" type="password"></mwc-textfield>
                        <mwc-textfield id="firstName" label="First Name"></mwc-textfield>
                        <mwc-textfield id="lastName" label="Last Name"></mwc-textfield>
                        <div id="rememberMe">
                            <mwc-checkbox id="remember" ?checked="${this.remember}"></mwc-checkbox>
                            <span>Remember Me</span>
                        </div>
                    </div>
                    
                    <mwc-button class="action last" @click="${() => this.submit()}" slot="primaryAction" dialogAction="ok">submit</mwc-button>
                    <mwc-button class="action" slot="secondaryAction" dialogAction="cancel">cancel</mwc-button>                    
                </mwc-dialog>
                 <mwc-dialog id="errorDialog">
                    <h3>${this.errorMessage}</h3>
                    <mwc-button class="action last" @click="${() => this.clearErrorMessage()}" slot="primaryAction" dialogAction="ok">submit</mwc-button>
                 </mwc-dialog>
            </div>
        `;
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }

  getUser() {
    return { ...this.user
    };
  }

  submit() {
    const {
      loginAction
    } = this;

    if (loginAction === "login") {
      this.loginWithEmail();
    } else if (loginAction === "create") {
      this.createAccount();
    } else if (loginAction === "forgot") {
      this.forgotPassword();
    }
  }

  loginWithEmail() {
    const emailEl = this.shadowRoot.querySelector('#email');
    const passwordEl = this.shadowRoot.querySelector('#password');
    const rememberEl = this.shadowRoot.querySelector('#remember');
    const email = emailEl.value;
    const password = passwordEl.value;
    const remember = rememberEl.checked;
    this.remember = remember;
    console.log(LOG_PREFIX + ` - Firebase login with email has been requested: Email(${email})`); // noinspection JSUnresolvedVariable,JSUnresolvedFunction

    this.firebase.auth().signInWithEmailAndPassword(email, password).then(response => {
      console.log(LOG_PREFIX + ` - Login with email was successful: Email(${email})`, response);

      if (remember) {
        this.storeUserLocally({
          email: email,
          password: password,
          remember: true
        });
      } else {
        this.storeUserLocally({
          remember: false
        });
        emailEl.value = '';
        passwordEl.value = '';
      }
    }).catch(error => {
      console.log(LOG_PREFIX + ` - Login with email failed: Email(${email})`, error);
      this.errorMessage = error;
      this.shadowRoot.getElementById('errorDialog').open = true;
    });
  }

  createAccount() {
    const email = this.shadowRoot.querySelector('#email').value;
    const password = this.shadowRoot.querySelector('#password').value;
    const firstName = this.shadowRoot.querySelector('#firstName').value;
    const lastName = this.shadowRoot.querySelector('#lastName').value;
    const remember = this.shadowRoot.querySelector('#remember').checked;
    console.log(LOG_PREFIX + ` - Requesting new account to be created: Email(${email})`); // noinspection JSUnresolvedVariable,JSUnresolvedFunction

    this.firebase.auth().createUserWithEmailAndPassword(email, password).then(response => {
      if (response) {
        const user = this.firebase.auth().currentUser;
        const userId = user.uid;
        this.userDetails = {
          firstName: firstName,
          lastName: lastName,
          name: firstName + (firstName && lastName ? ' ' : '') + lastName
        };
        console.log(LOG_PREFIX + ` - Account has been created in firebase: User(${userId}), Email(${email})`, user);
        user.updateProfile({
          displayName: this.userDetails.name,
          firstName: firstName ? firstName : '',
          lastName: lastName ? lastName : ''
        }).then(s => {
          console.log(`${LOG_PREFIX} - First, Last and DisplayName have been added to profile: User(${userId}), Email(${email}), FirstName(${firstName}), LastName(${lastName})`, user);
        }).catch(error => {
          console.error(`${LOG_PREFIX} - Could not add First and Last name to the user profile: User(${userId}), Email(${email}), FirstName(${firstName}), LastName(${lastName})`, error);
        });

        if (remember) {
          this.storeUserLocally({
            email: email,
            password: password,
            remember: true
          });
        } else {
          this.storeUserLocally({
            remember: false
          });
        }

        this.activeIndex = 0;
      } else {
        console.error(`$LOG_PREFIX} - There was an issue creating the account: Email(${email})`);
      }
    }).catch(error => {
      console.error(LOG_PREFIX + ` - There was an issue creating the user: ${email}`, error);
      this.errorMessage = error;
      this.shadowRoot.getElementById('errorDialog').open = true;
    });
  }

  forgotPassword() {
    const email = this.shadowRoot.querySelector('#email').value;
    console.log(LOG_PREFIX + ` - Requesting password reset email: Email(${email})`); // noinspection JSUnresolvedVariable,JSUnresolvedFunction

    this.firebase.auth().sendPasswordResetEmail(email).then(() => {
      console.log(LOG_PREFIX + ` - Password reset email has been sent. Email(${email})`);
      this.activeIndex = 0;
    }).catch(e => {
      console.log(LOG_PREFIX + ` - Password reset email failed: Email(${email})`, e);
    });
  }

  login() {
    console.log('Opening the login dialog.');
    this.shadowRoot.querySelector('#dialog').open = true;
  }

  logout() {
    const email = this.user.email;
    console.log(LOG_PREFIX + ` - Signing out user: Email(${email})`, this.user); // noinspection JSUnresolvedVariable,JSUnresolvedFunction

    this.firebase.auth().signOut().then(function () {
      console.log(LOG_PREFIX + ` - User has been signed out: Email(${email})`);
    }, function (error) {
      console.error(LOG_PREFIX + ` - There was a problem signing out the user: Email(${email})`, error);
    });
  }

  generateName(user) {
    const firstName = user.firstName ? user.firstName : '';
    const lastName = user.lastName ? user.lastName : '';
    return firstName.length > 0 && lastName.length > 0 ? `${firstName} ${lastName}` : firstName.length > 0 ? firstName : lastName;
  }

  retrieveUser(userId) {
    console.log(LOG_PREFIX + ` - Retrieving user from the database: uid(${userId})`);
    return new Promise((resolve, reject) => {
      // noinspection JSUnresolvedVariable,JSUnresolvedFunction
      this.firebase.database().ref('users/' + userId).once('value', snapshot => {
        let user = snapshot.val();
        console.log(LOG_PREFIX + ` - Retrieved user from database: Email(${user.email}), uid(${userId})`, user);
        resolve(user);
      }, error => {
        console.error(LOG_PREFIX + ` - There was an error retrieving the user from database: uid(${userId})`, error);
        reject(error);
      });
    });
  }

  retrieveStatus(userId) {
    console.log(LOG_PREFIX + ` - Retrieving user status from the database: uid(${userId})`);
    return new Promise((resolve, reject) => {
      // noinspection JSUnresolvedVariable,JSUnresolvedFunction
      return this.firebase.database().ref('status/' + userId).once('value', snapshot => {
        let userStatus = snapshot.val();
        console.log(LOG_PREFIX + ` - Retrieved user from database: uid(${userId})`, userStatus);
        resolve(userStatus);
      }, error => {
        console.error(LOG_PREFIX + ` - There was an error retrieving the user status from database: uid(${userId})`, error);
        reject(error);
      });
    });
  }

  saveSaveUser(userId, user) {
    console.log(LOG_PREFIX + `Saving user to the database: uid(${userId})`, user);
    return new Promise((resolve, reject) => {
      // noinspection JSUnresolvedVariable,JSUnresolvedFunction
      this.firebase.database().ref('users/' + userId).update(user).then(() => {
        console.log(LOG_PREFIX + ` - Saved the user into the database: Email(${user.email}), uid(${userId})`, user);
        resolve();
      }).catch(error => {
        console.error(LOG_PREFIX + ` - There was an error saving the user into the database: Email(${user.email}), uid(${userId})`, error);
        reject(error);
      });
    });
  }

  storeUserLocally(rememberedUser) {
    localStorage.setItem("user", JSON.stringify(rememberedUser));
  }

  retrieveUserLocally() {
    let data = localStorage.getItem("user");
    const rememberedUser = data ? JSON.parse(data) : {
      email: "",
      password: "",
      remember: false
    };
    return {
      email: rememberedUser.email ? rememberedUser.email : '',
      password: rememberedUser.password ? rememberedUser.password : '',
      remember: rememberedUser.remember ? rememberedUser.remember : false
    };
  }

});

function createEvent(eventName, payload) {
  const options = {
    bubbles: true,
    cancelable: true
  };
  return payload ? new CustomEvent(eventName, { ...options,
    detail: payload
  }) : new CustomEvent(eventName, { ...options
  });
}
