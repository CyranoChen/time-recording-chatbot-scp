const req = require('request');
const fs = require('fs');

const config = require('./config');

module.exports = {
    employeeList,
    projectList,
    processProjectList,
    processTaskList,
    recordTime,
    processDataset,
};

const _configs = config.getConfigs();

var _token;
var _tokenTimeout;

var _cookieString;
var _cookieStringTimeout;

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

async function projectList() {
    return new Promise((resolve, reject) => {
        req.get(_configs.BYDESIGN.TENANT_HOSTNAME + '/khproject/ProjectCollection', {
            qs:
            {
                '$format': 'json',
                '$expand': 'ProjectSummaryTask,Task,Team'
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

async function recordTime(employeeId, datetime, duration) {
    var result = await getTimeAgreement(employeeId);
    console.log('get time argeement:', result);

    if (result && result.d.results.length > 0 && result.d.results[0].UUID) {
        let employeeTimeAgreementItemUUID = result.d.results[0].UUID;

        // startDate = endDate = datetime yyyy/mm/dd
        let startDate = new Date(datetime).toISOString().substr(0, 10) + "T00:00:00.0000000";
        let endDate = new Date(datetime).toISOString().substr(0, 10) + "T00:00:00.0000000";

        var result_record = await createTimeRecording(employeeTimeAgreementItemUUID, startDate, endDate, duration);
        console.log('create time recording:', result_record);

        if (result_record && result_record.d.results && result_record.d.results.ObjectID != '') {
            let employeeTimeObjectID = result_record.d.results.ObjectID;

            var result_submit = await submitTimeRecording(employeeTimeObjectID);
            console.log('submit time recording:', result_submit);

            return result_submit;
        }
    }

    return [];
}

async function getTimeAgreement(employeeId) {
    return new Promise((resolve, reject) => {
        req.get(_configs.BYDESIGN.TENANT_HOSTNAME + '/khtimeagreement/ItemCollection', {
            qs:
            {
                '$format': 'json',
                '$filter': `EmployeeID eq '${employeeId}'`
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
                console.log('token:', _token, _tokenTimeout);

                _cookieString = res.headers['set-cookie'];
                _cookieStringTimeout = Date.now();
                console.log('cookie:', _cookieString, _cookieStringTimeout);
                resolve(body);
            } else {
                resolve(null);
            }
        });
    });
}

async function createTimeRecording(employeeTimeAgreementItemUUID, startDate, endDate, duration) {
    return new Promise((resolve, reject) => {
        req.post(_configs.BYDESIGN.TENANT_HOSTNAME + '/khemployeetime/EmployeeTimeCollection', {
            headers:
            {
                'cache-control': 'no-cache',
                //'Authorization': 'Basic ' + new Buffer(_configs.BYDESIGN.USERNAME + ':' + _configs.BYDESIGN.PASSWORD).toString('base64'),
                'x-csrf-token': _token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cookie': _cookieString.join("; ")
            },
            body: {
                "EmployeeTimeAgreementItemUUID": employeeTimeAgreementItemUUID,
                "EmployeeTimeItem": [
                    {
                        "TypeCode": "US0001",
                        "StartDate": startDate,
                        "EndDate": endDate,
                        "Duration": duration
                    }
                ]
            },
            json: true,
            rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            if (res) {
                resolve(body);
            } else {
                resolve(null);
            }
        });
    });
}

async function submitTimeRecording(employeeTimeObjectID) {
    return new Promise((resolve, reject) => {
        req.post(_configs.BYDESIGN.TENANT_HOSTNAME + '/khemployeetime/SubmitForApproval', {
            qs:
            {
                'ObjectID': `'${employeeTimeObjectID}'`
            },
            headers:
            {
                'cache-control': 'no-cache',
                //'Authorization': 'Basic ' + new Buffer(_configs.BYDESIGN.USERNAME + ':' + _configs.BYDESIGN.PASSWORD).toString('base64'),
                'x-csrf-token': _token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cookie': _cookieString.join("; ")
            },
            json: true,
            rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            if (res) {
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
        if (!fs.existsSync('./app/label/pictures')) {
            fs.mkdirSync('./app/label/pictures');
        }

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

function processProjectList(raw, employee, status = true) {
    let results = [];
    if (raw && raw.hasOwnProperty('d') && raw.d.hasOwnProperty('results') && raw.d.results.length > 0) {
        for (let item of raw.d.results) {
            if (status && item.hasOwnProperty('ProjectLifeCycleStatusCode') && item.ProjectLifeCycleStatusCode > 3) {
                continue; // remove the project with status 4-stopped and 5-closed
            }

            if (item.hasOwnProperty('ProjectSummaryTask') && item.ProjectSummaryTask.ProjectName != '') {
                let projectName = item.ProjectSummaryTask.ProjectName;
                // console.log(item.ProjectSummaryTask.ResponsibleEmployeeID);
                if (item.ProjectSummaryTask.ResponsibleEmployeeID == employee) {
                    results.push(projectName);
                    continue;
                }

                if (item.hasOwnProperty('Team') && item.Team.length > 0) {
                    for (let t of item.Team) {
                        if (t.EmployeeID == employee) {
                            results.push(projectName);
                            break;
                        }
                    }
                }
            }
        }
    }

    return results;
}


function processTaskList(raw, employee, projectName, status = true) {
    let results = [];
    if (raw && raw.hasOwnProperty('d') && raw.d.hasOwnProperty('results') && raw.d.results.length > 0) {
        for (let item of raw.d.results) {
            if (status && item.hasOwnProperty('ProjectLifeCycleStatusCode') && item.ProjectLifeCycleStatusCode > 3) {
                continue; // remove the project with status 4-stopped and 5-closed
            }

            if (item.hasOwnProperty('ProjectSummaryTask') && item.ProjectSummaryTask.ProjectName != '') {
                if (item.ProjectSummaryTask.ProjectName.toLowerCase() != projectName.toLowerCase()) {
                    continue; // skip the project name not matching
                }

                if (item.hasOwnProperty('Task') && item.Task.length > 0) {
                    for (let task of item.Task) {
                        results.push(task.TaskName);
                    }
                    break;
                }
            }
        }
    }

    return results;
}
