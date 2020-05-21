import './web_modules/@wonkytech/tm-firebase-user.js';
import {Firebase} from "./web_modules/@wonkytech/tm-firebase-service.js";

Firebase.init().then(() => {
    console.log('Firebase initialised.');
}).catch(error => console.error('Could not initialise firebase: ', error));

import './main.js';