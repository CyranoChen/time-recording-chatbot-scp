const express = require("express");
const bodyParser = require("body-parser");

const fs = require('fs');
const uuidv4 = require('uuid/v4');
const http = require('http');
const https = require('https');

const config = require('./app/config');
const label = require('./app/label');
const recognize = require('./app/recognize');
const b1service = require('./app/b1-sl');
const bydservice = require('./app/byd-api');
const cai = require('./app/cai');

// ssl cert
// const credentials = {
//     key: fs.readFileSync('./cert/private.pem', 'utf8'),
//     cert: fs.readFileSync('./cert/client.crt', 'utf8')
// };

// initial config
const _configs = config.getConfigs();
const app = express();
app.use(bodyParser.json({ limit: '20mb' }));

// static files
app.use('/', express.static('./public'));
app.use('/camera', express.static('./public/camera.html'));
app.use('/chat', express.static('./public/chat.html'));
app.use('/console', express.static('./public/console.html'));
app.use('/favicon', express.static('./favicon.ico'));
// app.use('/dist', express.static('./dist'));
// app.use('/node_modules', express.static('./node_modules'));

// photo library file path
app.use('/library', express.static('./app/label/pictures'))
//app.use('/spr_img', express.static('../server/label/b1_items'));

app.post('/api/recognize', async function (req, res, next) {
    console.log('[recognize]', new Date().toISOString());
    if (!req.body || !req.body.hasOwnProperty('filename') || !req.body.hasOwnProperty('image')) {
        res.sendStatus(400);
        return;
    }

    let filename = req.body.filename;
    let filenameUnqiue = uuidv4().split('-').join('') + '.' + filename.split('.').pop();
    console.log('input:', req.body.filename, filenameUnqiue);

    let base64Data = req.body.image.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '');
    // let contentType = req.body.image.substring(0, req.body.image.indexOf(';base64,'));
    // let blob = utils.b64toBlob(base64Data, contentType);

    if (!fs.existsSync('./app/sample')) {
        fs.mkdirSync('./app/sample');
    }

    fs.writeFileSync('./app/sample/' + filenameUnqiue, base64Data, 'base64', function (err) {
        if (err) {
            next(err);
            res.sendStatus(415);
            return;
        }
    });

    var result = await recognize.search(filenameUnqiue);
    console.log('similarity scoring:', result);

    if (result && result.hasOwnProperty('predictions') && result.predictions.length > 0 &&
        result.predictions[0].hasOwnProperty('id') && (result.predictions[0].id == filenameUnqiue) &&
        result.predictions[0].hasOwnProperty('similarVectors') && result.predictions[0].similarVectors.length > 0) {
        var condinates = [];

        for (let item of result.predictions[0].similarVectors) {
            if (item.score > _configs.GENERAL.THRESHOLD_SIMILAR) {
                condinates.push(item);
            }
        }

        if (condinates.length > 0) {
            res.send({ "state": "success", "filename": filenameUnqiue, "data": recognize.export(condinates), "raw": result.predictions[0].similarVectors });
            console.log(condinates);
            console.log('-'.repeat(100));
            return;
        } else {
            res.send({ "state": "success", "filename": filenameUnqiue, "data": [], "raw": result.predictions[0].similarVectors });
            console.log('no condinates');
            console.log('-'.repeat(100));
            return;
        }
    }

    res.send({ "state": "success", "filename": filename, "data": [] });
    console.log('exception on smilarity scoring');
    console.log('-'.repeat(100));
});

app.post('/api/sync/b1/employee', async function (req, res, next) {
    console.log('[syncDatasets b1 employee]', new Date().toISOString());
    var result = await label.syncDatasetsB1();
    res.send(result);
    console.log('-'.repeat(100));
});

app.post('/api/sync/byd/employee', async function (req, res, next) {
    console.log('[syncDatasets byd employee]', new Date().toISOString());
    var result = await label.syncDatasetsByd();
    res.send(result);
    console.log('-'.repeat(100));
});

app.post('/api/sync/b1/project', async function (req, res, next) {
    console.log('[syncDatasets b1 project]', new Date().toISOString());
    var result = label.getEntities('projects', 'b1');
    if (result.length >= 0) {
        result = { "value": result };
        console.log('get b1 projects from cache:', result.value.length);
    } else {
        result = await b1service.projectList();
        console.log('get b1 projects via api:', result.value.length)
    }
    res.send(b1service.processProjectList(result));
    console.log('-'.repeat(100));
});

app.post('/api/sync/b1/stage', async function (req, res, next) {
    console.log('[syncDatasets b1 stage]', new Date().toISOString());
    var result = label.getEntities('stages', 'b1');
    if (result.length >= 0) {
        result = { "value": result };
        console.log('get b1 stages from cache:', result.value.length);
    } else {
        result = await b1service.stageList();
        console.log('get b1 stages via api:', result.value.length)
    }
    res.send(b1service.processStageList(result));
    console.log('-'.repeat(100));
});

app.post('/api/sync/b1/record', async function (req, res, next) {
    console.log('[record b1 employee time]', new Date().toISOString());
    console.log(req.body);
    if (!req.body || !req.body.hasOwnProperty('employee') || !req.body.hasOwnProperty('datetime') ||
        !req.body.hasOwnProperty('startTime') || !req.body.hasOwnProperty('endTime') ||
        !req.body.hasOwnProperty('project') || !req.body.hasOwnProperty('stage')) {
        res.sendStatus(400);
        return;
    }

    let employee = req.body.employee;
    let datetime = req.body.datetime;
    let startTime = req.body.startTime;
    let endTime = req.body.endTime;
    let project = req.body.project;
    let stage = req.body.stage;

    console.log('input:', employee, datetime, startTime, endTime, project, stage);

    let projectId = '-1';
    let projects = label.getEntities('projects', dataset = 'b1');
    if (projects.length > 0) {
        for (let item of projects) {
            if (item.Name.toLowerCase() == project.toLowerCase()) {
                projectId = item.Code.toString();
                break;
            }
        }
    }

    let stageId = '-1';
    let stages = label.getEntities('stages', dataset = 'b1');
    if (stages.length > 0) {
        for (let item of stages) {
            if (item.StageName.toLowerCase().replace('/', ' ') == stage.toLowerCase()) {
                stageId = item.StageID.toString();
            }
        }
    }

    var result = await b1service.recordTime(employee, datetime, startTime, endTime, projectId, stageId);
    res.send(result);
    console.log('-'.repeat(100));
});

app.post('/api/sync/byd/project', async function (req, res, next) {
    console.log('[syncDatasets byd project]', new Date().toISOString());
    console.log(req.query);
    var result = label.getEntities('projects', 'byd');
    if (result.length >= 0) {
        result = { "d": { "results": result } };
        console.log('get byd projects from cache:', result.d.results.length);
    } else {
        result = await bydservice.projectList();
        console.log('get byd projects via api:', result.d.results.length)
    }

    if (req.query && req.query.hasOwnProperty('employee')) {
        if (req.query.hasOwnProperty('status')) {
            res.send(bydservice.processProjectList(result, req.query.employee, req.query.status));
        } else {
            res.send(bydservice.processProjectList(result, req.query.employee));
        }
    } else {
        res.send([]);
    }

    console.log('-'.repeat(100));
});

app.post('/api/sync/byd/task', async function (req, res, next) {
    console.log('[syncDatasets byd task by project]', new Date().toISOString());
    console.log(req.query);
    var result = label.getEntities('projects', 'byd');
    if (result.length >= 0) {
        result = { "d": { "results": result } };
        console.log('get byd projects from cache:', result.d.results.length);
    } else {
        result = await bydservice.projectList();
        console.log('get byd projects via api:', result.d.results.length)
    }

    if (req.query && req.query.hasOwnProperty('employee') && req.query.hasOwnProperty('project')) {
        if (req.query.hasOwnProperty('status')) {
            res.send(bydservice.processTaskList(result, req.query.employee, req.query.project, req.query.status));
        } else {
            res.send(bydservice.processTaskList(result, req.query.employee, req.query.project));
        }
    } else {
        res.send([]);
    }

    console.log('-'.repeat(100));
});

app.post('/api/sync/byd/record', async function (req, res, next) {
    console.log('[record byd employee time]', new Date().toISOString());
    console.log(req.body);
    if (!req.body || !req.body.hasOwnProperty('employee') || !req.body.hasOwnProperty('datetime') || !req.body.hasOwnProperty('duration')) {
        res.sendStatus(400);
        return;
    }

    let employee = req.body.employee;
    let datetime = req.body.datetime;
    let duration = req.body.duration;
    console.log('input:', employee, datetime, duration);

    var result = await bydservice.recordTime(employee, datetime, duration);
    res.send(result);
    console.log('-'.repeat(100));
});

app.post('/api/sync', async function (req, res, next) {
    console.log('[initialEntities]', new Date().toISOString());
    var result = await label.initialEntities(dataset = _configs.GENERAL.DATASETS);
    res.send(result);
    console.log('-'.repeat(100));
});

app.post('/api/train', async function (req, res, next) {
    console.log('[initialLabels]', new Date().toISOString());
    var result = await label.initialLabels(dataset = _configs.GENERAL.DATASETS);
    res.send(result);
    console.log('-'.repeat(100));
});

app.post('/api/train/b1', async function (req, res, next) {
    console.log('[initialLabels]', new Date().toISOString());
    var result = await label.initialLabels(dataset = 'b1');
    res.send(result);
    console.log('-'.repeat(100));
});

app.post('/api/train/byd', async function (req, res, next) {
    console.log('[initialLabels]', new Date().toISOString());
    var result = await label.initialLabels(dataset = 'byd');
    res.send(result);
    console.log('-'.repeat(100));
});

app.post('/api/initial', async function (req, res, next) {
    dataset = _configs.GENERAL.DATASETS.toLowerCase();
    console.log('[initial]', dataset, new Date().toISOString());
    var results = {
        "byd": {
            "employee": [],
            "labels": [],
            "projects": [],
            "tasks": []
        },
        "b1": {
            "employee": [],
            "labels": [],
            "projects": [],
            "stages": []
        }
    };

    // sync employee b1
    if (dataset == 'all' || dataset == 'b1') {
        var result = await label.syncDatasetsB1();
        results.b1.employee = result;
    }

    // sync employee byd
    if (dataset == 'all' || dataset == 'byd') {
        var result = await label.syncDatasetsByd();
        results.byd.employee = result;
    }

    // initial labels
    var result = await label.initialLabels(dataset = _configs.GENERAL.DATASETS);
    var b1Labels = [];
    var bydLabels = [];
    for (let key of Object.keys(result)) {
        if (result[key].application == 'byd') {
            bydLabels.push(result[key]);
        } else if (result[key].application == 'b1') {
            b1Labels.push(result[key]);
        }
    }
    results.b1.labels = b1Labels;
    results.byd.labels = bydLabels;

    // initial entities
    var result = await label.initialEntities(dataset = _configs.GENERAL.DATASETS);
    results.b1.projects = result.b1.projects;
    results.b1.stages = result.b1.stages;
    results.byd.projects = result.byd.projects;
    results.byd.tasks = result.byd.tasks;

    res.send(results);
    console.log('-'.repeat(100));
});

app.post('/api/context', async function (req, res, next) {
    console.log('[cai context]', new Date().toISOString());
    console.log(req.body);
    if (!req.body || !req.body.hasOwnProperty('session') || !req.body.hasOwnProperty('employee') || !req.body.hasOwnProperty('content')) {
        res.sendStatus(400);
        return;
    }

    let session = req.body.session;
    if (session == 'default') {
        session = new Date().getTime(); // new session
    }
    let employee = req.body.employee;
    let content = req.body.content;
    console.log('input:', session, employee, content);

    var result = await cai.context(session, employee, content);
    // if (req.body.session == 'default') { // hardcode the welcome message
    //     result.results.messages[0].content = _configs.RECASTAI.WELCOME_MESSAGE
    // }
    res.send(result);
    console.log('-'.repeat(100));
});

// http / https server
var httpServer = http.createServer(app);
// var httpsServer = https.createServer(credentials, app);

const PORT = 8080;
// const SSLPORT = 9080;

httpServer.listen(PORT, () => {
    console.log('HTTP Server is running on port %s', PORT);
    console.log('-'.repeat(100));
});

// httpsServer.listen(SSLPORT, () => {
//     console.log('HTTPS Server is running on port %s', SSLPORT);
//     console.log('-'.repeat(100));
// });

