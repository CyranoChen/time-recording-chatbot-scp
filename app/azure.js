const req = require('request');
const fs = require('fs');

const config = require('./config');

module.exports = {
    faceListCreate,
    faceListDelete,
    faceListAddFace,
    faceDetect,
    faceFindSimilar
};

const _configs = config.getConfigs();

const headers = {
    'Ocp-Apim-Subscription-Key': _configs.AZURE.APIKEY,
};

function faceListCreate(dataset = _configs.GENERAL.DATASETS) {
    let h = headers;
    h['Content-Type'] = 'application/json';
    return new Promise((resolve, reject) => {
        req.put(_configs.AZURE.FACE_APIURL + '/facelists/' + dataset, {
            body: {
                name: dataset,
                userData: new Date().toISOString(),
                recognitionModel: "recognition_01"
            },
            json: true,
            headers: h
        }, (err, res, body) => {
            if (err) { 
                reject(err); 
            }
            resolve(body);
        });
    });
}

function faceListDelete(dataset = _configs.GENERAL.DATASETS) {
    let h = headers;
    h['Content-Type'] = 'application/json';
    return new Promise((resolve, reject) => {
        req.delete(_configs.AZURE.FACE_APIURL + '/facelists/' + dataset, {
            json: true,
            headers: h
        }, (err, res, body) => {
            if (err) {
                reject(err);
            }
            resolve(body);
        });
    });
}

function faceListAddFace(filename, filepath = './app/label/pictures/' + _configs.GENERAL.DATASETS + '/', dataset = _configs.GENERAL.DATASETS) {
    console.log(filepath + filename, dataset);
    let h = headers;
    h['Content-Type'] = 'application/octet-stream';
    return new Promise((resolve, reject) => {
        req.post(_configs.AZURE.FACE_APIURL + '/facelists/' + dataset + '/persistedFaces', {
            qs: {
                detectionModel: 'detection_01'
            },
            body: fs.createReadStream(filepath + filename),
            headers: h
        }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(JSON.parse(body));  // { "persistedFaceId": "199d87bf-aae0-424d-9610-da9f74b4582e" }
        });
    });
}

function faceDetect(filename, filepath = './app/sample/') {
    console.log(filepath + filename);
    let h = headers;
    h['Content-Type'] = 'application/octet-stream';
    const url = _configs.AZURE.FACE_APIURL + '/detect';
    return new Promise((resolve, reject) => {
        req.post(url, {
            qs: {
                returnFaceId: 'true',
                returnFaceLandmarks: 'true',
                recognitionModel: 'recognition_01',
                returnRecognitionModel: 'true',
                detectionModel: 'detection_01'
            },
            body: fs.createReadStream(filepath + filename),
            headers: h,
        }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(JSON.parse(body));
            // [
            //     {
            //         "faceId": "5f6f4fcc-98ca-4a58-ad55-cc559e74706e",
            //         "faceRectangle": {
            //             "top": 974,
            //             "left": 515,
            //             "width": 1256,
            //             "height": 1256
            //         },
            //         "faceLandmarks": {},
            //         "recognitionModel": "recognition_01"
            //     }
            // ]
        });
    });
}

function faceFindSimilar(faceId, dataset = _configs.GENERAL.DATASETS) {
    console.log('faceFindSimilar id:', faceId);
    let h = headers;
    h['Content-Type'] = 'application/json';
    return new Promise((resolve, reject) => {
        req.post(_configs.AZURE.FACE_APIURL + '/findsimilars', {
            body: {
                faceId: faceId,
                faceListId: dataset,
                maxNumOfCandidatesReturned: _configs.GENERAL.THRESHOLD_NUM_SIMILAR,
                mode: "matchFace"
            },
            json: true,
            headers: h
        }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(body);
            // [
            //     {
            //         "persistedFaceId": "c5d8fc2b-aaef-4638-882f-20052126ed81",
            //         "confidence": 1.0
            //     },
            //     {
            //         "persistedFaceId": "199d87bf-aae0-424d-9610-da9f74b4582e",
            //         "confidence": 1.0
            //     }
            // ]
        });
    });
}