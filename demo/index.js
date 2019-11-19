import '../src/index.js';

import {html, render} from "../public/web_modules/lit-html.js";

import {firebaseConfig} from "../firebase-config.js";

document.addEventListener('firebase-ready', (event) => {
    console.log('DEMO - Firebase is ready to use.');
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