import '../src/index.js';

import {html, render} from "../public/web_modules/lit-html.js";

import {firebaseConfig} from "../firebase-config.js";

render(html`
    <style>
        body {
          background-color: white;
          padding: 0;
          margin: 0;
        } 
        tm-firebase-user {
            --tm-firebase-user-color: green;
        }
    </style>
    <tm-firebase-user .config="${firebaseConfig}"></tm-firebase-user>
`, document.querySelector('body'));