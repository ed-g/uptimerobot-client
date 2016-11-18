#!/usr/bin/env node

var Promise = require('bluebird');

var fs = require('fs');
var child_process = require ('child_process');
var rp = require('request-promise');
var querystring = require('querystring');

var I = require('immutable');

Promise.promisifyAll(fs);

var clog = console.log;     // for convenience
var cerror = console.error; // for convenience

var CONFIG_FILE = process.env["UPTIME_ROBOT_CLIENT_CONFIG_FILE"] 
    ? process.env["UPTIME_ROBOT_CLIENT_CONFIG_FILE"] 
    : __dirname + '/config/settings.json';

// var SETTINGS = JSON.parse(fs.readFileSync(__dirname + '/config/settings.json', 'utf8'));
var SETTINGS = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

var UPTIME_ROBOT_API_URL = 'https://api.uptimerobot.com/';

cerror("config_settings", SETTINGS);

cerror("apiKey", SETTINGS.uptimeRobotApiKey);
cerror("dest_apiKey", SETTINGS.dest_uptimeRobotApiKey);

var format = 'noJsonCallback=1&format=json';
var apiKey = 'apiKey=' + SETTINGS.uptimeRobotApiKey;

// for destination of copy
var dest_apiKey = 'apiKey=' + SETTINGS.dest_uptimeRobotApiKey;

var subprocess_HTTPie = function (url) {
    child_process.execSync( 
        "http " + "'" + url + "'", 
        {
            stdio: [process.stdin, process.stdout, process.stderr],
            timeout: 10 * 1000 // 10 seconds.
        });
}

var copy_monitor = function (monitor) {
    // create a newMonitor request:
    /*
newMonitor

New monitors of any type can be created using this method.
Parameters

    apiKey - required
    monitorFriendlyName - required
    monitorURL - required
    monitorType - required
    monitorSubType - optional (required for port monitoring)
    monitorPort - optional (required for port monitoring)
    monitorKeywordType - optional (required for keyword monitoring)
    monitorKeywordValue - optional (required for keyword monitoring)
    monitorHTTPUsername - optional
    monitorHTTPPassword - optional
    monitorAlertContacts - optional (the alert contacts to be notified when the monitor goes up/down.Multiple alertContactIDs can be sent like monitorAlertContacts=457_0_0-373_5_0-8956_2_3 where alertContactIDs are seperated with - and threshold + recurrence are seperated with _. For ex: monitorAlertContacts=457_5_0 refers to 457 being the alertContactID, 0 being the threshold and 0 being the recurrence. As the threshold and recurrence is only available in the Pro Plan, they are always 0 in the Free Plan)
    monitorInterval - optional (in minutes)
    */
    
}

var request_and_parse_json = (url) => { 
    // todo: change me to return a continuation /future/promise/whatever.
    //request.getAsync(url, {})
    return rp(url)
        .then((response) => {
            j = JSON.parse(response);
            // console.log("JSON.parse(body): ", JSON.parse(body));
            // console.log("response: ", response);
            // console.log("j.stat: ", j.stat);
            if (j.stat.valueOf() == 'ok') {
                //console.log("j.stat is ok");
                return j;
            } else {
                //console.log("j.stat is NOT ok");
                return null;
            }
        })
        .then ( j => {
            if (j && j.monitors.monitor) {
                //console.log("j.monitors.monitor: ", j.monitors.monitor);
            }
            return j
        })
        .catch( (err) => {
            console.error('Request to URL: ', url, ' failed with error ', err);
            throw (err);
        });
}

var interval_to_minutes = function (m) {
    // API returns seconds in getMonitors, but asks for minutes when calling newMonitor ;-)
    if (m.has('monitorinterval')) {
        m = m.set('monitorinterval', (m.get('monitorinterval') / 60).toFixed()) ;
    }
    return m;
}

var convert_monitors_to_create_monitor_urls = function (monitors_response) {
    if (!monitors_response || !monitors_response.monitors) return {};
    // console.log('typeof(j.monitors)', typeof(j.monitors));
    //ij = I.fromJS(j);
    var ij = I.fromJS(monitors_response);
    var create_monitors = 
        ij.getIn(["monitors", "monitor"]).map(m => {
            // console.log("m: ", m);
            // TODO: prepend "monitor" to all keys of im, so we can pass results to createMonitor. 
            m = m
                .mapKeys( k => 'monitor'+k.toLowerCase())
                .filter( (v,k) => k !== 'monitorid');

            m = interval_to_minutes(m)

            return m;
        });
    //console.log('create_monitors: ', create_monitors);
    var urls = create_monitors.map(m => querystring.stringify(m.toObject()) );
    //console.log('urls: ', urls);
    return urls;
}


//for (method of ['getaccountdetails', 'getmonitors']) { // test case sensitivity -- looks like not sensitive
// for (method of ['getAccountDetails', 'getMonitors']) {
for (method of ['getMonitors']) {
    var url = UPTIME_ROBOT_API_URL + method + '?' + format + '&' + apiKey
    // clog ("getMonitors url: ", url);
    // subprocess_HTTPie(url);
    request_and_parse_json(url)
        .then( (j) => {
            urls = convert_monitors_to_create_monitor_urls(j)
            return urls;
        }) 
        .then( (urls) => {
            urls.forEach(u => {
                // Print out a shell command which can be used to create a copy of each monitor.
                // If you don't have HTTPie installed, you can use 'curl' or 'wget' instead.
                console.log('http \'https://api.uptimerobot.com/newMonitor?' + dest_apiKey + '&' + format + '&' + u + '\'');
            })
        })
    ;
}


