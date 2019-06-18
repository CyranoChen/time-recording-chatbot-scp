const req = require('request');
const fs = require('fs');

const config = require('./config');

module.exports = {
    employeeList,
    processDataset,
};

const _configs = config.getConfigs();

var _token;
var _tokenTimeout;
function getToken() {
    return new Promise((resolve, reject) => {
        req.get(_configs.BYDESIGN.TENANT_HOSTNAME + '/khemployee/$metadata', {
            headers:
            {
                'cache-control': 'no-cache',
                'Authorization': 'Basic ' + new Buffer(_configs.BYDESIGN.USERNAME + ':' + _configs.BYDESIGN.PASSWORD).toString('base64'),
                'x-csrf-token': 'fetch'
            },
            rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            if (res && res.headers.hasOwnProperty('x-csrf-token')) {
                // x-csrf-token=LkJovn22gAJpAjVW2ZFpqw==
                _token = res.headers['x-csrf-token'];
                _tokenTimeout = Date.now();
                console.log(_token, _tokenTimeout);
                resolve(_token);
            } else {
                resolve(null);
            }
        });
    });
}

async function employeeList() {
    return new Promise((resolve, reject) => {
        req.get(_configs.BYDESIGN.TENANT_HOSTNAME + '/khemployee/EmployeeCollection', {
            qs:
            {
                '$expand': 'EmployeeAttachmentFolder',
                '$format': 'json'
            },
            headers:
            {
                'cache-control': 'no-cache',
                'Authorization': 'Basic ' + new Buffer(_configs.BYDESIGN.USERNAME + ':' + _configs.BYDESIGN.PASSWORD).toString('base64'),
                'x-csrf-token': 'fetch'
            },
            json: true,
            rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            if (res && res.headers.hasOwnProperty('x-csrf-token')) {
                // x-csrf-token=LkJovn22gAJpAjVW2ZFpqw==
                _token = res.headers['x-csrf-token'];
                _tokenTimeout = Date.now();
                console.log(_token, _tokenTimeout);
                resolve(body);
            } else {
                resolve(null);
            }
        });
    });
}

function employeeImage(employeeId, employeeImage) {
    fs.writeFile(`./app/label/pictures/byd/${employeeId}.jpg`, employeeImage.Binary, 'base64', function (err) {
        if (err) {
            next(err);
            res.sendStatus(415);
            return;
        }
    });
}

function processDataset(raw) {
    let results = [];
    if (raw && raw.hasOwnProperty('d') && raw.d.hasOwnProperty('results') && raw.d.results.length > 0) {
        if (!fs.existsSync('./app/label/pictures/byd')) {
            fs.mkdirSync('./app/label/pictures/byd');
        }

        for (let item of raw.d.results) {
            if (item.EmployeeAttachmentFolder && item.EmployeeAttachmentFolder.length > 0) {
                results.push(
                    {
                        "InternalID": item.InternalID,
                        "EmployeeID": item.EmployeeID,
                        "GivenName": item.GivenName,
                        "FamilyName": item.FamilyName,
                        "FormattedName": item.FormattedName
                    }
                )
                employeeImage(item.InternalID, item.EmployeeAttachmentFolder[0]);
            }
        }
    }

    return results;
}
