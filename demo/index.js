import '../src/index.js';

import {html, render} from "../public/web_modules/lit-html.js";

import {Firebase} from "../node_modules/@wonkytech/tm-firebase-service/dist-web/index.js";
import {mainConfig, appConfig, userLogin} from "../public/firebase-config.js";

Firebase.init({
    appName: 'meetup',
    appConfig: appConfig,
    mainConfig: mainConfig
}).then(() => {
    console.log('Firebase initialised.');
}).catch(error => console.error('Could not initialise firebase: ', error));


document.addEventListener('firebase-auth-ready', (event) => {
    console.log('DEMO - Firebase  auth is ready to use.', window.firebase);
});

document.addEventListener('firebase-database-ready', (event) => {
    console.log('DEMO - Firebase database is ready to use.', window.firebase);
});

document.addEventListener('firebase-ready', (event) => {
    console.log('DEMO - Firebase is ready to use.', window.firebase);
});

document.addEventListener('user-logged-in', (event) => {
    const user = document.getElementById('login').getUser();
    console.log('DEMO - User logged in.', event, user);
});

document.addEventListener('user-logged-out', (event) => {
    console.log('DEMO - User logged out.', event);
});

render(html`
    <style>
        body {
          background-color: white;
          padding: 0;
          margin: 0;
        } 
        tm-firebase-user {
            --tm-firebase-user-color: green;
            clear: both;
            float: right;
            margin:50px;
        }
    </style>
    <tm-firebase-user id="login"></tm-firebase-user>
`, document.querySelector('body'));