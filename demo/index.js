import '../src/index.js';

import {html, render} from "../public/web_modules/lit-html.js";

import {firebaseConfig} from "../firebase-config.js";

document.addEventListener('firebase-ready', (event) => {
    console.log('DEMO - Firebase is ready to use.');
});

document.addEventListener('user-logged-in', (event) => {
    console.log('DEMO - User logged in.', event);
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
    <tm-firebase-user .config="${firebaseConfig}"></tm-firebase-user>
`, document.querySelector('body'));