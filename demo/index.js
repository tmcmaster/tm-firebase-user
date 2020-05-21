import '../src/index.js';
import {Firebase} from "@wonkytech/tm-firebase-service";
import {mainConfig, appConfig} from "./firebase-config.js";

Firebase.init({
    appName: 'app',
    appConfig: appConfig,
    mainConfig: mainConfig
}).then(() => {
    console.log('Firebase initialised.');
}).catch(error => console.error('Could not initialise firebase: ', error));

import '../public/main.js';