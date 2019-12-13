import {LitElement, html, css} from 'lit-element';

import '@wonkytech/material-elements'

import {loadFirebaseCDN, loadFirebaseEmbedded, loadLink} from '@wonkytech/tm-script-loader';

loadLink("https://fonts.googleapis.com/icon?family=Material+Icons");

const LOG_PREFIX = 'TM-FIREBASE-USER: ';

window.customElements.define('tm-firebase-user', class extends LitElement {

    // noinspection JSUnusedGlobalSymbols
    static get properties() {
        return {
            user: {type: Object},
            config: {type: Object}
        }
    }

    constructor() {
        super();
        this.user = undefined;

    }

    // noinspection JSUnusedGlobalSymbols
    firstUpdated(_changedProperties) {
        super.firstUpdated(_changedProperties);

        const tabBar = this.shadowRoot.querySelector('#tabBar');
        const email = this.shadowRoot.querySelector('#email');
        const password = this.shadowRoot.querySelector('#password');
        const firstName = this.shadowRoot.querySelector('#firstName');
        const lastName = this.shadowRoot.querySelector('#lastName');

        email.classList.remove('hidden');
        password.classList.add('hidden');
        firstName.classList.add('hidden');
        lastName.classList.add('hidden');

        console.log(LOG_PREFIX + 'Elements: ', tabBar,email,password,firstName,lastName);

        if (this.config === undefined) {
            loadFirebaseEmbedded().then((firebase) => {
                this.initFirebase(firebase);
            });
        } else {
            loadFirebaseCDN().then((firebase) => {
                firebase.initializeApp(this.config);
                this.initFirebase(firebase);
            });
        }


        tabBar.addEventListener('MDCTabBar:activated', (e) => {
            const user = this.retrieveUserLocally();

            if (email && password && firstName && lastName) {

                console.log(LOG_PREFIX + 'TAB ACTION:',e);
                const index = e.detail.index;
                const tabs = tabBar.getElementsByTagName('mwc-tab');
                const name = tabs[index].getAttribute("name");
                this.loginAction = name;

                email.value = '';
                password.value = '';
                firstName.value = '';
                lastName.value = '';

                console.log(LOG_PREFIX + 'Enabling fields for action: :' + this.loginAction);

                if (name === 'create') {
                    email.classList.remove('hidden');
                    password.classList.remove('hidden');
                    firstName.classList.remove('hidden');
                    lastName.classList.remove('hidden');
                } else if (name === 'forgot') {
                    email.value = (user !== undefined ? user.email : '');
                    email.classList.remove('hidden');
                    password.classList.add('hidden');
                    firstName.classList.add('hidden');
                    lastName.classList.add('hidden');
                } else if (name === 'login') {
                    email.value = (user !== undefined ? user.email : '');
                    password.value = (user !== undefined ? user.password : '');
                    email.classList.remove('hidden');
                    password.classList.remove('hidden');
                    firstName.classList.add('hidden');
                    lastName.classList.add('hidden');
                }
            }
        });

    }

    initFirebase(firebase) {
        console.log(LOG_PREFIX + 'Firebase is now available.');
        this.firebase = firebase;

        this.dispatchEventGlobal('firebase-ready');

        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                console.log(LOG_PREFIX + 'User has logged in: ', user);
                const userId = user.uid;
                const email = user.email;
                console.log(LOG_PREFIX + `Retrieving user details from the database: Email(${email}), uid(${userId})`);
                this.retrieveUser(userId).then((user) => {
                    this.user = {...user, uid: userId};
                    console.log(LOG_PREFIX + 'User retrieved from database: ', this.user);
                    this.dispatchEventGlobal('user-logged-in', {detail: {...this.user}});
                }).catch(error => {
                    console.error(LOG_PREFIX + 'There was an issue getting user: ' + userId, error);
                });
            } else {
                if (this.user !== undefined) {
                    console.log(LOG_PREFIX + 'User has logged out.');
                    const user = {...this.user};
                    this.user = undefined;
                    this.dispatchEventGlobal('user-logged-out', {detail: user});
                } else {
                    console.warn(LOG_PREFIX + 'User was already logged out.');
                }
            }
        });
    }

    // noinspection JSUnusedGlobalSymbols
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
    }

    // noinspection JSUnusedGlobalSymbols
    render() {
        return html`
            <div class="body">
                <div class="title">
                    ${(this.user === undefined ? html`
                        <mwc-button id="title-login" class="title" outlined @click="${() => this.login()}">Login</mwc-button>
                    ` : html`
                        <mwc-button id="title-logout"  class="title" outlined @click="${() => this.logout()}">logout</mwc-button>
                    `)}
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

    getUser() {
        return {...this.user};
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
        const email = this.shadowRoot.querySelector('#email').value;
        const password = this.shadowRoot.querySelector('#password').value;

        console.log(LOG_PREFIX + `Firebase login with email has been requested: Email(${email})`);

        this.firebase.auth().signInWithEmailAndPassword(email, password).then((response) => {
            console.log(LOG_PREFIX + `Login with email was successful: Email(${email})`, response);
            this.storeUserLocally({email: email, password: password});
        }).catch((error) => {
            console.log(LOG_PREFIX + `Login with email failed: Email(${email})`, error);
        });
    }

    createAccount() {
        const email = this.shadowRoot.querySelector('#email').value;
        const password = this.shadowRoot.querySelector('#password').value;
        const firstName = this.shadowRoot.querySelector('#firstName').value;
        const lastName = this.shadowRoot.querySelector('#lastName').value;

        console.log(LOG_PREFIX + `Requesting new account to be created: Email(${email})`);

        this.firebase.auth().createUserWithEmailAndPassword(email, password).then((response) => {
            console.log(LOG_PREFIX + `Account has been created in firebase: Email(${email})`, response);
            let user = {
                firstName: firstName,
                lastName: lastName,
                email: email
            };
            let userId = response.user.uid;
            this.saveSaveUser(userId, user).then(() => {
                this.user = {...user, uid: userId};
                console.log(LOG_PREFIX + 'User has been created in the database: ', this.user);
                this.storeUserLocally({email: email, password: password});
                console.log(LOG_PREFIX + 'Remember login details, by storing them in local storage: ', this.user);
            }).catch((error) => {
                console.error(LOG_PREFIX + `Could not create the new user: Email(${email}), uid(${userId})`, error);
            });

        }).catch((error) => {
            console.error(LOG_PREFIX + `There was an issue creating the user: ${email}`, error);
        });
    }

    forgotPassword() {
        const email = this.shadowRoot.querySelector('#email').value;

        console.log(LOG_PREFIX + `Requesting password reset email: Email(${email})`);

        this.firebase.auth().sendPasswordResetEmail(email).then(() => {
            console.log(LOG_PREFIX + `Password reset email has been sent. Email(${email})`);
        }).catch((e) => {
            console.log(LOG_PREFIX + `Password reset email failed: Email(${email})`, e);
        });
    }

    login() {
        console.log('Opening the login dialog.');
        this.shadowRoot.querySelector('#dialog').open = true;
    }

    logout() {
        const email = this.user.email;
        console.log(LOG_PREFIX + `Signing out user: Email(${email})`, this.user);
        this.firebase.auth().signOut().then(function() {
            console.log(LOG_PREFIX + `User has been signed out: Email(${email})`);
        }, function(error) {
            console.error(LOG_PREFIX + `There was a problem signing out the user: Email(${email})`, error);
        });
    }

    retrieveUser(userId) {
        console.log(LOG_PREFIX + `Retrieving user from the database: uid(${userId})`);
        return new Promise((resolve, reject) => {
            return this.firebase.database().ref('users/' + userId).once('value', snapshot => {
                let user = snapshot.val();
                console.log(LOG_PREFIX + `Retrieved user from database: Email(${user.email}), uid(${userId})`, user);
                resolve(user);
            }, (error) => {
                console.error(LOG_PREFIX + `There was an error retrieving the user from database: uid(${userId})`, error);
                reject(error);
            });
        });
    }

    saveSaveUser(userId, user) {
        console.log(LOG_PREFIX + `Saving user to the database: uid(${userId})`, user);
        return new Promise((resolve, reject) => {
            this.firebase.database().ref('users/' + userId).set(user).then(() => {
                console.log(LOG_PREFIX + `Saved the user into the database: Email(${user.email}), uid(${userId})`, user);
                resolve();
            }).catch((error) => {
                console.error(LOG_PREFIX + `There was an error saving the user into the database: Email(${user.email}), uid(${userId})`, error);
                reject(error);
            });

        });
    }

    storeUserLocally(user) {
        localStorage.setItem("user", JSON.stringify(user));
    }

    retrieveUserLocally() {
        let data = localStorage.getItem("user");
        return (data ? JSON.parse(data) : {email:"",password:"",firstName: "", lastName: ""});
    }

    dispatchEventLocal(eventName, payload) {
        dispatchEvent(createEvent(eventName, payload), this);
    }

    dispatchEventGlobal(eventName, payload) {
        dispatchEvent(createEvent(eventName, payload), document);
    }
});

function dispatchEvent(event, destination) {
    (destination ? destination : document).dispatchEvent(event);
}
function createEvent(eventName, payload) {
    return (payload
        ? new CustomEvent(eventName, {detail: payload})
        : new CustomEvent(eventName));
}