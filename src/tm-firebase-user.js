import {html} from 'lit-html';
import {LitElement, css} from 'lit-element';

import '@wonkytech/material-elements'

import {loadFirebaseCDN, loadFirebaseEmbedded, loadLink} from '@wonkytech/tm-script-loader';

loadLink("https://fonts.googleapis.com/icon?family=Material+Icons");

const LOG_PREFIX = 'TM-FIREBASE-USER';

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
        this.config = undefined;
        this.userDetails = undefined;
    }

    // noinspection JSUnusedGlobalSymbols
    connectedCallback() {
        super.connectedCallback();

        this._loginListener = () => this.login();
        this._logoutListener = () => this.logout();
        document.addEventListener('user-login', this._loginListener);
        document.addEventListener('user-logout', this._logoutListener);
    }

    // noinspection JSUnusedGlobalSymbols
    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('user-login', this._loginListener);
        document.removeEventListener('user-logout', this._logoutListener);
        this._loginListener = undefined;
        this._logoutListener = undefined;
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

                console.log(LOG_PREFIX + ' - TAB ACTION:',e);
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
        console.log(LOG_PREFIX + ' - Firebase is now available.');
        this.firebase = firebase;

        document.dispatchEvent(createEvent('firebase-ready'));

        firebase.auth().onAuthStateChanged((user) => {
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
                            document.dispatchEvent(createEvent('user-logged-in', {...constructedUser}));
                        }).catch(error => {
                            console.error(`${LOG_PREFIX} - onAuthStateChanged - Could not construct new user, with extra details.`, error);
                        });
                    }, 5000);
                } else {
                    this.constructUser(userId).then((constructedUser) => {
                        this.user = constructedUser;
                        window.user = constructedUser;
                        document.dispatchEvent(createEvent('user-logged-in', {...constructedUser}));
                    }).catch(error => {
                        console.error(`${LOG_PREFIX} - onAuthStateChanged - Could not construct new user.`, error);
                    });
                }
            } else {
                if (this.user !== undefined) {
                    console.log(LOG_PREFIX + ' - User has logged out.');
                    const user = {...this.user};
                    this.firstName = undefined;
                    this.lastName = undefined;
                    this.user = undefined;
                    window.user = undefined;
                    document.dispatchEvent(createEvent('user-logged-out', {...user}));
                }
            }
        });
    }

    constructUser(userId, userDetails) {
        console.log(LOG_PREFIX + ` - Retrieving user details from the database: uid(${userId}), User Details: `, userDetails);
        return new Promise((resolve, reject) => {
            Promise.all([
                this.retrieveUser(userId),
                this.retrieveStatus(userId)
            ]).then(([user,status]) => {
                if (userDetails) {
                    this.saveSaveUser(userId, Object.assign({...user}, userDetails)).then(() => {
                        const constructedUser = Object.assign({...user}, status, userDetails);
                        console.log(LOG_PREFIX + ` - New user details have been saved, and user constructed: uid(${userId}), ConstructedUser: `, userDetails);
                        resolve(constructedUser);
                    }).catch(error => reject(error));
                } else {
                    const constructedUser = Object.assign({...user}, status);
                    console.log(LOG_PREFIX + ` - User constructed: uid(${userId}), ConstructedUser: `, userDetails);
                    resolve(constructedUser);
                }
            }).catch(error => reject(error));
        });
    }

    // noinspection JSUnusedGlobalSymbols
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
                    
                    <mwc-button class="action last" @click="${() => this.submit()}" slot="primaryAction" dialogAction="ok">submit</mwc-button>
                    <mwc-button class="action" slot="secondaryAction" dialogAction="cancel">cancel</mwc-button>                    
                </mwc-dialog>
            </div>
        `;
    }

    getUser() {
        return {...this.user};
    }

    submit() {
        const {loginAction} = this;
        if (loginAction === "login") {
            this.loginWithEmail();
        } else if (loginAction === "create") {
            this.createAccount();
        } else if (loginAction === "forgot") {
            this.forgotPassword();
        }
    }

    loginWithEmail() {
        const email = this.shadowRoot.querySelector('#email').value;
        const password = this.shadowRoot.querySelector('#password').value;

        console.log(LOG_PREFIX + ` - Firebase login with email has been requested: Email(${email})`);

        // noinspection JSUnresolvedVariable,JSUnresolvedFunction
        this.firebase.auth().signInWithEmailAndPassword(email, password).then((response) => {
            console.log(LOG_PREFIX + ` - Login with email was successful: Email(${email})`, response);
            this.storeUserLocally({email: email, password: password});
        }).catch((error) => {
            console.log(LOG_PREFIX + ` - Login with email failed: Email(${email})`, error);
        });
    }

    createAccount() {
        const email = this.shadowRoot.querySelector('#email').value;
        const password = this.shadowRoot.querySelector('#password').value;
        const firstName = this.shadowRoot.querySelector('#firstName').value;
        const lastName = this.shadowRoot.querySelector('#lastName').value;

        console.log(LOG_PREFIX + ` - Requesting new account to be created: Email(${email})`);
        this.newAccount = true;
        // noinspection JSUnresolvedVariable,JSUnresolvedFunction
        this.firebase.auth().createUserWithEmailAndPassword(email, password).then((response) => {
            if (response) {
                const user = this.firebase.auth().currentUser;
                const userId = user.uid;
                const email = user.email;
                this.userDetails = {
                    firstName: firstName,
                    lastName: lastName,
                    name: (firstName + (firstName && lastName ? ' ' : '') + lastName)
                };
                console.log(LOG_PREFIX + ` - Account has been created in firebase: User(${userId}), Email(${email})`, user);
                user.updateProfile({
                    displayName: this.userDetails.name,
                    firstName: (firstName ? firstName : ''),
                    lastName: (lastName ? lastName : ''),
                }).then((s) => {
                    console.log(`${LOG_PREFIX} - First and last name have been added to profile: User(${userId}), Email(${email}), FirstName(${firstName}), LastName(${lastName})`, user);
                }).catch(error => {
                    console.error(`${LOG_PREFIX} - Could not add First and Last name to the user profile: User(${userId}), Email(${email}), FirstName(${firstName}), LastName(${lastName})`, error);
                });
                this.storeUserLocally({email: email, password: password});
            } else {
                console.log(`$LOG_PREFIX} - There was an issue creating the account: Email(${email})`);
            }
        }).catch((error) => {
            console.error(LOG_PREFIX + ` - There was an issue creating the user: ${email}`, error);
        });
    }

    forgotPassword() {
        const email = this.shadowRoot.querySelector('#email').value;

        console.log(LOG_PREFIX + ` - Requesting password reset email: Email(${email})`);

        // noinspection JSUnresolvedVariable,JSUnresolvedFunction
        this.firebase.auth().sendPasswordResetEmail(email).then(() => {
            console.log(LOG_PREFIX + ` - Password reset email has been sent. Email(${email})`);
        }).catch((e) => {
            console.log(LOG_PREFIX + ` - Password reset email failed: Email(${email})`, e);
        });
    }

    login() {
        console.log('Opening the login dialog.');
        this.shadowRoot.querySelector('#dialog').open = true;
    }

    logout() {
        const email = this.user.email;
        console.log(LOG_PREFIX + ` - Signing out user: Email(${email})`, this.user);
        // noinspection JSUnresolvedVariable,JSUnresolvedFunction
        this.firebase.auth().signOut().then(function() {
            console.log(LOG_PREFIX + ` - User has been signed out: Email(${email})`);
        }, function(error) {
            console.error(LOG_PREFIX + ` - There was a problem signing out the user: Email(${email})`, error);
        });
    }

    generateName(user) {
        const firstName = (user.firstName ? user.firstName  : '');
        const lastName = (user.lastName ? user.lastName  : '');
        return (firstName.length > 0 && lastName.length > 0 ? `${firstName} ${lastName}` : (firstName.length > 0 ? firstName : lastName));
    }

    retrieveUser(userId) {
        console.log(LOG_PREFIX + ` - Retrieving user from the database: uid(${userId})`);
        return new Promise((resolve, reject) => {
            // noinspection JSUnresolvedVariable,JSUnresolvedFunction
            this.firebase.database().ref('users/' + userId).once('value', (snapshot) => {
                let user = snapshot.val();
                console.log(LOG_PREFIX + ` - Retrieved user from database: Email(${user.email}), uid(${userId})`, user);
                resolve(user);
            }, (error) => {
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
            }).catch((error) => {
                console.error(LOG_PREFIX + ` - There was an error saving the user into the database: Email(${user.email}), uid(${userId})`, error);
                reject(error);
            });

        });
    }

    storeUserLocally(user) {
        localStorage.setItem("user", JSON.stringify(user));
    }

    retrieveUserLocally() {
        let data = localStorage.getItem("user");
        return (data ? JSON.parse(data) : {email:"",password:""});
    }
});


function createEvent(eventName, payload) {
    const options = {
        bubbles: true,
        cancelable: true,
    };
    return (payload
        ? new CustomEvent(eventName, {...options, detail: payload})
        : new CustomEvent(eventName, {...options}));
}