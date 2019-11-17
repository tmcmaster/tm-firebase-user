import {html, render} from "./web_modules/lit-html.js";

let firebaseConfig = {
    apiKey: "AIzaSyAdD4sU6LgbaGbzJPcxjFdIifJ03WbRe6U",
    authDomain: "respect-my-inbox.firebaseapp.com",
    databaseURL: "https://respect-my-inbox.firebaseio.com",
    projectId: "respect-my-inbox",
    storageBucket: "respect-my-inbox.appspot.com",
    messagingSenderId: "850234517372",
    appId: "1:850234517372:web:598d7bd8a26f805d7866f9",
    measurementId: "G-MGDCS99DWX"
};

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