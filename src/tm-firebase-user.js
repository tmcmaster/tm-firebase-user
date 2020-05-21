import {html} from 'lit-html';
import {LitElement, css} from 'lit-element';

import '@wonkytech/material-elements'

import {Firebase} from "@wonkytech/tm-firebase-service";

import {loadLink} from '@wonkytech/tm-script-loader';

loadLink("https://fonts.googleapis.com/icon?family=Material+Icons");

const LOG_PREFIX = 'TM-FIREBASE-USER';

window.customElements.define('tm-firebase-user', class extends LitElement {

    // noinspection JSUnusedGlobalSymbols
    static get properties() {
        return {
            user: {type: Object},
            config: {type: Object},
            activeIndex: {type: Number},
            remember: {type: Boolean},
            errorMessage: {type: String}
        }
    }

    constructor() {
        super();
        this.user = undefined;
        this.config = undefined;
        this.activeIndex = 0;
        this.remember = false;

        document.addEventListener('user-logged-out', (user) => {
            console.log( + `${LOG_PREFIX} - User logged out:`, user);
            this.user = undefined;
        });
        document.addEventListener('user-logged-in', (user) => {
            console.log( + `${LOG_PREFIX} - User logged in:`, user);
            this.user = user;
        });
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

        tabBar.addEventListener('MDCTabBar:activated', (e) => {

            if (email && password && firstName && lastName && remember) {

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
                    rememberMe.classList.remove('hidden');
                } else if (name === 'forgot') {
                    email.value = (this.remember ? user.email : '');
                    email.classList.remove('hidden');
                    password.classList.add('hidden');
                    firstName.classList.add('hidden');
                    lastName.classList.add('hidden');
                    rememberMe.classList.add('hidden');
                } else if (name === 'login') {
                    email.value = (this.remember ? user.email : '');
                    password.value = (this.remember ? user.password : '');
                    email.classList.remove('hidden');
                    password.classList.remove('hidden');
                    firstName.classList.add('hidden');
                    lastName.classList.add('hidden');
                    rememberMe.classList.remove('hidden');
                }
            }
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
                color: var(--tm-firebase-user-color, gray);
            }

            mwc-button.title {
                flex: 1;
                --mdc-theme-primary: var(--tm-firebase-user-color, gray);
                --mdc-theme-on-primary: var(--tm-firebase-user-color, gray);
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
        const emailEl = this.shadowRoot.querySelector('#email');
        const passwordEl = this.shadowRoot.querySelector('#password');
        const rememberEl = this.shadowRoot.querySelector('#remember');

        const email = emailEl.value;
        const password = passwordEl.value;
        const remember = rememberEl.checked;

        this.remember = remember;

        console.log(LOG_PREFIX + ` - Firebase login with email has been requested: Email(${email})`);

        Firebase.login(email, password).then((user) => {
            console.log(LOG_PREFIX + ` - Login with email was successful: Email(${email}), User:`, user);
            if (remember) {
                this.storeUserLocally({email: email, password: password, remember: true});
            } else {
                this.storeUserLocally({remember: false});
                emailEl.value = '';
                passwordEl.value = '';
            }
        }).catch((error) => {
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

        console.log(LOG_PREFIX + ` - Requesting new account to be created: Email(${email})`);

        Firebase.createUser(email, password, firstName, lastName).then(user => {
            if (remember) {
                this.storeUserLocally({email: email, password: password, remember: true});
            } else {
                this.storeUserLocally({remember: false});
            }
            this.activeIndex = 0;
        }).catch((error) => {
            console.error(LOG_PREFIX + ` - There was an issue creating the user: ${email}`, error);
            this.errorMessage = error;
            this.shadowRoot.getElementById('errorDialog').open = true;
        });
    }

    forgotPassword() {
        const email = this.shadowRoot.querySelector('#email').value;
        console.log(`${LOG_PREFIX} - forgotPassword - Requesting password reset email: Email(${email})`);
        Firebase.forgotPassword(email).then(() => {
            console.log(`${LOG_PREFIX} - forgotPassword - Password reset email has been sent. Email(${email})`);
            this.activeIndex = 0;
        }).catch((error) => {
            console.log(`${LOG_PREFIX} - forgotPassword - Password reset email failed: Email(${email})`, error);
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
        Firebase.logout().then(user => {
            console.log(LOG_PREFIX + ` - User has been signed out: Email(${email}): `, user);
        }).catch(error => console.error(`${LOG_PREFIX} - logout - could not logout: Email(${email}): `, error));
    }

    storeUserLocally(rememberedUser) {
        localStorage.setItem("user", JSON.stringify(rememberedUser));
    }

    retrieveUserLocally() {
        let data = localStorage.getItem("user");
        const rememberedUser = (data ? JSON.parse(data) : {email:"",password:"",remember:false});
        return {
            email: (rememberedUser.email ? rememberedUser.email : ''),
            password: (rememberedUser.password ? rememberedUser.password : ''),
            remember: (rememberedUser.remember ? rememberedUser.remember : false)
        };
    }
});