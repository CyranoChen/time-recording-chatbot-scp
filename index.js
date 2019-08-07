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
    var result = await b1service.projectList();
    res.send(result);
    console.log('-'.repeat(100));
});

app.post('/api/sync/byd/project', async function (req, res, next) {
    console.log('[syncDatasets byd project]', new Date().toISOString());
    console.log(req.query);
    var result = await bydservice.projectList();
    if (req.query && req.query.hasOwnProperty('employee')) {
        if (req.query.hasOwnProperty('status')) {
            res.send(bydservice.processProjectList(result, req.query.employee, req.query.status));
        } else {
            res.send(bydservice.processProjectList(result, req.query.employee));
        }
    } else {
        res.send(result);
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

app.post('/api/train', async function (req, res, next) {
    console.log('[initialLabels]', new Date().toISOString());
    var result = await label.initialLabels(dataset = _configs.GENERAL.DATASET);
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

