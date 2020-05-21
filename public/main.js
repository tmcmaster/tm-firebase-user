import {html, render} from "./web_modules/lit-html.js";

document.addEventListener('firebase-ready', (event) => {
    console.log('PUBLIC - Firebase is ready to use.');
});

document.addEventListener('user-logged-in', (event) => {
    console.log('PUBLIC - User logged in.', event.detail);
    document.getElementById('user').innerText = event.detail.displayName;
});

document.addEventListener('user-logged-out', (event) => {
    console.log('PUBLIC - User logged out.', event);
    document.getElementById('user').innerText = 'Logged Out';
});

render(html`
    <style>
        html {
            /*--tm-firebase-user-color: grey;*/
        }
        body {
            background-color: white;
        } 
        
        main {
            box-sizing: border-box;
            display: flex;
            flex-direction: row;
            justify-content: start;
        }

        div {
            margin-left: 20px;
            padding-top: 10px;
        }
    </style>
    <main>
        <tm-firebase-user id="login"></tm-firebase-user>
        <div id="user">Logged Out</div>
    </main>
`, document.querySelector('body'));