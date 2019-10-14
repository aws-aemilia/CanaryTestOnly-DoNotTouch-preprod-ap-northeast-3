const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const aws = require('aws-sdk');
const proxy = require('http-proxy-middleware');
const accounts = require('./extensions/accounts');
const businessMetrics = require('./extensions/businessMetrics');
const {getEvent} = require('./event');
const patchSdk = require('./extensions/sdkpatcher');
const {getAccountId} = require('./extensions/accounts');
const Metering = require('./extensions/metering');

const allowedUsers = [
    'anatonie',
    'loganch',
    'lisirui',
    'snimakom',
    'shufakan',
    'hzhenmin',
    'nsswamin',
    'haoyujie',
    'litwjaco'
];

const app = express();
let username;

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Headers', 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token');
    const options = 'OPTIONS';
    if (req.method !== options) {
        username = undefined;
        const event = getEvent();
        if (event.requestContext && event.requestContext.identity && event.requestContext.identity.cognitoAuthenticationProvider) {
            const cognitoAuthenticationProvider = event.requestContext.identity.cognitoAuthenticationProvider;
            const parts = cognitoAuthenticationProvider.split(':');
            username = parts[parts.length - 1];
        }
        if (!username || allowedUsers.indexOf(username) < 0) {
            res.status(403);
            res.json({message: username ? `Unauthorized: User ${username} is unauthorized` : `Unauthorized: Midway identifier not found`})
        } else {
            next();
        }
    } else {
        // next();
        res.send(200);
    }
});

const proxyOptions = {
    target: 'https://oncall-api.corp.amazon.com', // target host
    // changeOrigin: true, // needed for virtual hosted sites
    // ws: true, // proxy websockets
    pathRewrite: {
        '^/proxy/oncall': '/' // remove base path
    }
};
app.use('/proxy/oncall', proxy(proxyOptions));

app.get('/username', async (req, res) => res.send(username));

app.get('/regions', (req, res) => res.json(accounts.getRegions()));

app.post('/metering/delete', Metering.deleteMessage);

app.get('/metering/get', Metering.getMessages);

app.get('/api/metrics/builds/failed', async (req, res) => {
    let query = '';
    if (req.param('accountId')) {
        query = `select * from main where accountid = '${req.param('accountId')}' order by timestamp desc`;
    } else if (req.param('appId')) {
        query = `select * from main where appid = '${req.param('appId')}' order by timestamp desc`;
    } else if (req.param('days')) {
        query = `select * from main where jobstatus = \'FAILED\' and failedstep = \'BUILD\' and timestamp > current_date - interval '${req.param('days')} day';`;
    } else if (req.param('daysFrom') && req.param('daysTo')) {
        query = `select * from main where jobstatus = \'FAILED\' and failedstep = \'BUILD\' and timestamp > current_date - interval '${req.param('daysFrom')} day' and timestamp < current_date - interval '${req.param('daysTo')} day' order by timestamp desc;`;
    } else {
        query = 'select * from main where jobstatus = \'FAILED\' and failedstep = \'BUILD\' order by timestamp desc limit 500';
    }
    if (query) {
        try {
            const data = await businessMetrics(query);
            res.json(data);
        } catch (error) {
            res.status(500);
            res.json(error);
        }
    } else {
        res.status(400);
        res.end('Invalid request');
    }
});

app.get('/api/metrics/builds/succeed', async (req, res) => {
    let query = '';
    if (req.param('accountId')) {
        query = `select * from main where accountid = '${req.param('accountId')}' and jobid is not null order by timestamp desc`;
    } else if (req.param('appId')) {
        query = `select * from main where appid = '${req.param('appId')}' and jobid is not null order by timestamp desc`;
    } else if (req.param('days')) {
        query = `select * from main where timestamp > current_date - interval '${req.param('days')} day and jobid is not null';`;
    } else if (req.param('daysFrom') && req.param('daysTo')) {
        query = `select * from main where timestamp > current_date - interval '${req.param('daysFrom')} day' and timestamp < current_date - interval '${req.param('daysTo')} day' and jobid is not null order by timestamp desc;`;
    } else {
        query = 'select * from main where jobid is not null order by timestamp desc limit 500';
    }
    if (query) {
        try {
            const data = await businessMetrics(query);
            res.json(data);
        } catch (error) {
            res.status(500);
            res.json(error);
        }
    } else {
        res.status(400);
        res.end('Invalid request');
    }
});

app.post('/api/builds', async (req, res) => {
    try {
        const codebuild = await patchSdk('prod', req.body.region, aws.CodeBuild);
        let builds = [];

        let buildIds = await codebuild.listBuildsForProject({
            'projectName': req.body.project,
            'nextToken': req.body.token ? req.body.token : undefined
        }).promise();
        let codebuildBuilds = await codebuild.batchGetBuilds({'ids': buildIds['ids']}).promise();
        let token = buildIds.nextToken;

        builds = builds.concat(codebuildBuilds.builds);

        res.end(JSON.stringify({'builds': builds, token}));
    } catch (err) {
        console.log('error calling codebuild');
        console.log(err);
        res.status(400);
        res.end(JSON.stringify({'error': err}));
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        const cloudwatchlogs = await patchSdk('prod', req.query['region'], aws.CloudWatchLogs);
        cloudwatchlogs.getLogEvents({
            'logGroupName': req.query['logGroupName'],
            'logStreamName': req.query['logStreamName']
        }, function (err, data) {
            if (err) res.end(JSON.stringify(err)); // an error occurred
            else res.end(JSON.stringify(data)); // successful response
        });
    } catch (err) {
        res.end(JSON.stringify({'error': err}));
    }

});

app.get('/api/logsbyprefix', async (req, res) => {
    try {
        const cloudwatchlogs = await patchSdk('prod', req.query['region'], aws.CloudWatchLogs);

        let nextToken = undefined;
        let builds = [];
        do {
            let result = await cloudwatchlogs.describeLogStreams({
                'logGroupName': req.query['logGroupName'],
                'logStreamNamePrefix': req.query['logStreamNamePrefix'],
                'limit': 50,
                nextToken
            }).promise();

            builds = builds.concat(result.logStreams);
        } while (!!nextToken);

        res.end(JSON.stringify(builds));
    } catch (err) {
        res.end(JSON.stringify({'error': err}));
    }
});

app.get('/api/cachemeta', async (req, res) => {
    try {
        const appId = req.query['appId'];
        const branchName = req.query['branchName'];
        const region = req.query['region'];
        accounts.setAWSConfig(region);
        const params = {
            Bucket: 'aws-amplify-prod-' + region + '-artifacts',
            Key: appId + '/' + branchName + '/BUILD/cache.tar'
        };
        await patchSdk('prod', region, aws.S3).headObject(params, function (err, data) {
            if (err) {
                console.log('error in s3');
                console.log(err);
                res.end(JSON.stringify({'error': err}))
            } else {
                console.log(data);
                res.end(JSON.stringify(data))
            }
        });
    } catch (err) {
        console.log('error');
        res.end(JSON.stringify({'error': err}))
    }
});

app.get('/cwlogs/groups', async (req, res) => {
    const stage = req.query['stage'];
    const region = req.query['region'];
    const sdkRegion = req.query['sdkRegion'];
    try {
        const client = await patchSdk(stage, region, aws.CloudWatchLogs, sdkRegion);
        let nextToken = undefined;
        let logGroups = [];
        do {
            const result = await client.describeLogGroups({limit: 50, nextToken}).promise();
            nextToken = result.nextToken;
            logGroups = [
                ...logGroups,
                ...result.logGroups
            ]
        } while (!!nextToken);
        res.json(logGroups);
    } catch (e) {
        console.log('error getting cloudwatch log groups');
        console.log(e);
        res.status(400);
        res.json(e);
    }
});

app.post('/cwlogs/events/filter', async (req, res) => {
    const {stage, region, sdkRegion, ...params} = req.body;
    try {
        const client = await patchSdk(stage, region, aws.CloudWatchLogs, sdkRegion);
        const result = await client.filterLogEvents(params).promise();
        res.json(result);
    } catch (e) {
        console.log('error filtering cloudwatch log events');
        console.log(e);
        res.status(400);
        res.json(e);
    }
});

app.post('/cwlogs/events/get', async (req, res) => {
    const {stage, region, sdkRegion, ...params} = req.body;
    try {
        const client = await patchSdk(stage, region, aws.CloudWatchLogs, sdkRegion);
        const result = await client.getLogEvents(params).promise();
        res.json(result);
    } catch (e) {
        console.log('error getting cloudwatch log events');
        console.log(e);
        res.status(400);
        res.json(e);
    }
});

// Handles any requests that don't match the ones above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/../client/build/index.html'));
});

// app.listen(config.port);
// console.log('App is listening on port ' + config.port);
module.exports = app;
