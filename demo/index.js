import '../src/index.js';

import {html, render} from "../public/web_modules/lit-html.js";

import {firebaseConfig} from "../firebase-config.js";

render(html`
    <style>
        body {
          background-color: lightgray;
          padding: 0;
          margin: 0;
        } 
    </style>
    <tm-firebase-user .config="${firebaseConfig}"></tm-firebase-user>
`, document.querySelector('body'));