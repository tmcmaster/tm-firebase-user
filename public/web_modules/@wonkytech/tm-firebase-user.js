import '../common/tslib.es6-01830ef3.js';
import { h as html } from '../common/lit-html-9957b87e.js';
import { LitElement, css } from '../lit-element.js';
import '../common/ripple-directive-2ad17d44.js';
import '../common/foundation-700cf526.js';
import '../common/class-map-e3b87d8e.js';
import '../@material/mwc-button.js';
import '../@material/mwc-dialog.js';
import '../common/base-element-1a571607.js';
import '../@material/mwc-tab.js';
import '../@material/mwc-tab-bar.js';
import '../@material/mwc-textfield.js';
import { loadLink, loadFirebaseEmbedded, loadFirebaseCDN } from './tm-script-loader.js';

loadLink("https://fonts.googleapis.com/icon?family=Material+Icons");
window.customElements.define('tm-firebase-user', class extends LitElement {
  // noinspection JSUnusedGlobalSymbols
  static get properties() {
    return {
      user: {
        type: Object
      },
      config: {
        type: Object
      }
    };
  }

  constructor() {
    super();
    this.user = undefined;
  } // noinspection JSUnusedGlobalSymbols


  firstUpdated(_changedProperties) {
    super.firstUpdated(_changedProperties);
    const tabBar = this.shadowRoot.querySelector('#tabBar');
    const email = this.shadowRoot.querySelector('#email');
    const password = this.shadowRoot.querySelector('#password');
    const firstName = this.shadowRoot.querySelector('#firstName');
    const lastName = this.shadowRoot.querySelector('#lastName');
    const user = this.retrieveUserLocally();

    if (user !== undefined && user !== null) {
      email.value = user.email;
      password.value = user.password;
      firstName.value = user.firstName;
      lastName.value = user.lastName;
    }

    tabBar.addEventListener('MDCTabBar:activated', e => {
      console.log('TAB ACTION:', e);
      const index = e.detail.index;
      const tabs = tabBar.getElementsByTagName('mwc-tab');
      const name = tabs[index].getAttribute("name");
      this.loginAction = name;

      if (name === 'create') {
        email.classList.remove('hidden');
        password.classList.remove('hidden');
        firstName.classList.remove('hidden');
        lastName.classList.remove('hidden');
      } else if (name === 'forgot') {
        email.classList.remove('hidden');
        password.classList.add('hidden');
        firstName.classList.add('hidden');
        lastName.classList.add('hidden');
      } else if (name === 'login') {
        email.classList.remove('hidden');
        password.classList.remove('hidden');
        firstName.classList.add('hidden');
        lastName.classList.add('hidden');
      }
    });

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
  }

  initFirebase(firebase) {
    console.log('TM-LOGIN: firebase is now available.');
    this.firebase = firebase;
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        console.log('User has logged in: ', user);
      } else {
        console.log('User has logged out: ', user);
      }
    });
  }

  static get styles() {
    //language=CSS
    return css`
            :host {
                display: inline-block;
                box-sizing: border-box;
                //width: 50vw;
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
                --mdc-theme-primary: var(--tm-firebase-user-color, lightgray);;
                --mdc-theme-on-primary: var(--tm-firebase-user-color, lightgray);;
            }
        `;
  } // noinspection JSUnusedGlobalSymbols


  render() {
    return html`
            <div class="body">
                <div class="title">
                    <div class="username">${this.user === undefined ? '' : this.user.firstName + ' ' + this.user.lastName}</div>
                    ${this.user === undefined ? html`
                        <mwc-button id="title-login" class="title" outlined @click="${() => this.login()}">Login</mwc-button>
                    ` : html`
                        <mwc-button id="title-logout"  class="title" outlined @click="${() => this.logout()}">logout</mwc-button>
                    `}
                </div>
                <mwc-dialog id="dialog">
                    <mwc-tab-bar id="tabBar">
                      <mwc-tab name="login" label="Login" icon="lock" stacked isMinWidthIndicator ></mwc-tab>
                      <mwc-tab name="create" label="Create Account" icon="create" stacked isMinWidthIndicator></mwc-tab>
                      <mwc-tab name="forgot" label="Forgot Password" icon="email" stacked isMinWidthIndicator></mwc-tab>
                    </mwc-tab-bar>
                    
                    <div class="fields">
                        <mwc-textfield id="email" label="Email Address" type="email"></mwc-textfield>
                        <mwc-textfield id="password" label="Password" type="password"></mwc-textfield>
                        <mwc-textfield id="firstName" label="First Name"></mwc-textfield>
                        <mwc-textfield id="lastName" label="Last Name"></mwc-textfield>
                    </div>
                    
                    <mwc-button @click="${() => this.submit()}" slot="primaryAction" dialogAction="ok">submit</mwc-button>
                    <mwc-button slot="secondaryAction" dialogAction="cancel">cancel</mwc-button>
                </mwc-dialog>
            </div>
        `;
  }

  submit() {
    if (this.loginAction === "login") {
      this.loginWithEmail();
    } else if (this.loginAction === "create") {
      this.createAccount();
    } else if (this.loginAction === "forgot") {
      this.forgotPassword();
    }
  }

  loginWithEmail() {
    console.log('TM-LOGIN: firebase login requested');
    const email = this.shadowRoot.querySelector('#email').value;
    const password = this.shadowRoot.querySelector('#password').value;
    this.firebase.auth().signInWithEmailAndPassword(email, password).then(response => {
      console.log('Logged In Success: ', response);
      let userId = response.user.uid;
      this.getUser(userId).then(user => {
        this.storeUserLocally({ ...user,
          password: password
        });
        console.log('User retrieved from database: ', user);
        this.user = user;
      }).catch(error => {
        console.error('There was an issue getting user: ', error);
      });
    }).catch(error => {
      console.log('Logged In Error: ', error);
      this.user = undefined;
    });
  }

  createAccount() {
    console.log('TM-LOGIN: firebase create new account requested');
    const email = this.shadowRoot.querySelector('#email').value;
    const password = this.shadowRoot.querySelector('#password').value;
    const firstName = this.shadowRoot.querySelector('#firstName').value;
    const lastName = this.shadowRoot.querySelector('#lastName').value;
    this.firebase.auth().createUserWithEmailAndPassword(email, password).then(response => {
      console.error('Create user: ', response);
      let user = {
        firstName: firstName,
        lastName: lastName,
        email: email
      };
      let userId = response.user.uid;
      this.saveSaveUser(userId, user).then(() => {
        this.storeUserLocally({ ...user,
          password: password
        });
        this.user = user;
        console.log('Created new user: ', user);
      }).catch(error => {
        console.error('Could not create the new user: ', error);
      });
    }).catch(error => {
      console.error('There was an issue creating the user: ', error);
    });
  }

  forgotPassword() {
    console.log('TM-LOGIN: firebase forgot password requested', this.firebase.auth());
    const email = this.shadowRoot.querySelector('#email').value;
    this.firebase.auth().sendPasswordResetEmail(email).then(() => {
      console.log('TM-LOGIN: password reset has been sent', e);
    }).catch(e => {
      console.log('TM-LOGIN: password reset error', e);
    });
  }

  login() {
    console.log('login');
    this.shadowRoot.querySelector('#dialog').open = true;
  }

  logout() {
    this.user = undefined;
  }

  getUser(userId) {
    return new Promise((resolve, reject) => {
      return this.firebase.database().ref('users/' + userId).on('value', snapshot => {
        let user = snapshot.val();
        resolve(user);
      }, error => {
        reject(error);
      });
    });
  }

  saveSaveUser(userId, user) {
    return new Promise((resolve, reject) => {
      this.firebase.database().ref('users/' + userId).set(user).then(() => {
        resolve();
      }).catch(error => {
        reject(error);
      });
    });
  }

  storeUserLocally(user) {
    localStorage.setItem("user", JSON.stringify(user));
  }

  retrieveUserLocally() {
    let data = localStorage.getItem("user");
    return JSON.parse(data);
  }

});
