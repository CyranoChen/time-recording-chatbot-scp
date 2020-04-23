const req = require('request');
const fs = require('fs');

const config = require('./config');

module.exports = {
    employeeList,
    projectList,
    stageList,
    recordTime,
    processProjectList,
    processStageList,
    processDataset,
};

const _configs = config.getConfigs();

var _cookieString;
var _cookieStringTimeout;
function getCookies() {
    return new Promise((resolve, reject) => {
        req.post(_configs.BUSINESSONE.SERVICELAYER_APIURL + '/Login', {
            body: {
                "UserName": _configs.BUSINESSONE.USERNAME,
                "Password": _configs.BUSINESSONE.PASSWORD,
                "CompanyDB": _configs.BUSINESSONE.COMPANYDB
            },
            json: true,
            rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            if (body && body.hasOwnProperty('SessionId')) {
                // B1SESSION=b1c5df78-5e69-11e9-8000-02ea2c070d68
                _cookieString = `B1SESSION=${body.SessionId};HttpOnly;`;
                _cookieStringTimeout = Date.now();
                console.log(_cookieString, _cookieStringTimeout);
                resolve(_cookieString);
            } else {
                resolve(null);
            }
        });
    });
}

async function employeeList() {
    if (!_cookieString || (Date.now() - _cookieStringTimeout) > 10 * 60 * 1000) {// 10 mins timeout
        const cookie = await getCookies();
        if (!cookie) { return null; }
    }

    return new Promise((resolve, reject) => {
        const j = req.jar();
        const cookie = req.cookie(_cookieString);
        const url = _configs.BUSINESSONE.SERVICELAYER_APIURL + '/EmployeesInfo';
        j.setCookie(cookie, url);
        req.get(url, {
            qs:
            {
                '$select': 'ApplicationUserID,EmployeeID,FirstName,LastName,Picture'
            },
            headers:
            {
                'Prefer': 'odata.maxpagesize=0'
            },
            json: true,
            jar: j,
            rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(body);
        });
    });
}

async function projectList() {
    if (!_cookieString || (Date.now() - _cookieStringTimeout) > 10 * 60 * 1000) {// 10 mins timeout
        const cookie = await getCookies();
        if (!cookie) { return null; }
    }

    return new Promise((resolve, reject) => {
        const j = req.jar();
        const cookie = req.cookie(_cookieString);
        const url = _configs.BUSINESSONE.SERVICELAYER_APIURL + '/Projects';
        j.setCookie(cookie, url);
        req.get(url, {
            headers:
            {
                'Prefer': 'odata.maxpagesize=0'
            },
            json: true,
            jar: j,
            rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(body);
        });
    });
}

async function stageList() {
    if (!_cookieString || (Date.now() - _cookieStringTimeout) > 10 * 60 * 1000) {// 10 mins timeout
        const cookie = await getCookies();
        if (!cookie) { return null; }
    }

    return new Promise((resolve, reject) => {
        const j = req.jar();
        const cookie = req.cookie(_cookieString);
        const url = _configs.BUSINESSONE.SERVICELAYER_APIURL + '/ProjectManagementConfigurationService_GetStageTypes';
        j.setCookie(cookie, url);
        req.post(url, {
            headers:
            {
                'Prefer': 'odata.maxpagesize=0'
            },
            json: true,
            jar: j,
            rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(body);
        });
    });
}

async function timeSheetList(employee) {
    if (!_cookieString || (Date.now() - _cookieStringTimeout) > 10 * 60 * 1000) {// 10 mins timeout
        const cookie = await getCookies();
        if (!cookie) { return null; }
    }

    return new Promise((resolve, reject) => {
        const j = req.jar();
        const cookie = req.cookie(_cookieString);
        const url = _configs.BUSINESSONE.SERVICELAYER_APIURL + '/ProjectManagementTimeSheet';
        j.setCookie(cookie, url);
        req.get(url, {
            qs:
            {
                '$select': 'AbsEntry,DocNumber,DateFrom,DateTo',
                '$filter': `UserID eq ${employee}`
            },
            json: true, jar: j, rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(body);
        });
    });
}

async function postTimeSheet(employee) {
    return new Promise((resolve, reject) => {
        const j = req.jar();
        const cookie = req.cookie(_cookieString);
        const url = _configs.BUSINESSONE.SERVICELAYER_APIURL + '/ProjectManagementTimeSheet';
        j.setCookie(cookie, url);
        req.post(url, {
            body: {
                "DateFrom": '2020-01-01',
                "UserID": employee
            }, json: true, jar: j, rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(body);
        });
    });
}

async function recordTime(employee, datetime, startTime, endTime, projectId, stageId) {
    if (!_cookieString || (Date.now() - _cookieStringTimeout) > 10 * 60 * 1000) {// 10 mins timeout
        const cookie = await getCookies();
        if (!cookie) { return null; }
    }

    var timeSheetId = -1;
    var result = await timeSheetList(employee);
    if (result && result.hasOwnProperty('value') && result.value.length > 0) {
        for (let item of result.value) {
            if (Date.parse(item.DateFrom) <= new Date().getTime() && item.DateTo == null) {
                timeSheetId = item.DocNumber;
                break;
            }
        }
    }

    if (timeSheetId < 0) {
        // Create a new timesheet
        var result = await postTimeSheet(employee);
        if (result && result.hasOwnProperty('DocNumber') && result.DocNumber > 0) {
            timeSheetId = result.DocNumber;
        } else {
            console.log(result);
            return result;
        }
    }

    console.log('timesheet id:', timeSheetId);
    // var projectId = 'NSI-C20000' // todo, hardcode, should be got by project name
    // var stageId = '1' // todo, hardcode, should be got by stage name

    console.log('recording time:', employee, datetime, startTime, endTime, projectId, stageId);

    return new Promise((resolve, reject) => {
        const j = req.jar();
        const cookie = req.cookie(_cookieString);
        const url = _configs.BUSINESSONE.SERVICELAYER_APIURL + `/ProjectManagementTimeSheet(${timeSheetId})`;
        j.setCookie(cookie, url);
        req.patch(url, {
            body: {
                "PM_TimeSheetLineDataCollection": [
                    {
                        "ActivityType": "1",
                        "Date": datetime,
                        "EndTime": endTime,
                        "StartTime": startTime,
                        "FinancialProject": projectId,
                        "StageID": stageId
                    }
                ]
            }, json: true, jar: j, rejectUnauthorized: false
        }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(body);
        });
    });
}

async function employeeImage(employeeID, itemPic) {
    const j = req.jar();
    const cookie = req.cookie(_cookieString);
    const url = _configs.BUSINESSONE.SERVICELAYER_APIURL + `/EmployeeImages(${employeeID})/$value`;
    j.setCookie(cookie, url);
    return new Promise((resolve, reject) => {
        req.get(url, { jar: j, rejectUnauthorized: false })
            .pipe(fs.createWriteStream(`./app/label/pictures/b1/${itemPic}`)).on('close', resolve).on('error', reject);
    });
}

// async function employeeImage(itemPic) {
//     if (!_cookieString || (Date.now() - _cookieStringTimeout) > 10 * 60 * 1000) {// 10 mins timeout
//         const cookie = await getCookies();
//         if (!cookie) { return null; }
//     }

//     return new Promise((resolve, reject) => {
//         const j = req.jar();
//         const cookie = req.cookie(_cookieString);
//         const url = _configs.BUSINESSONE.SERVICELAYER_APIURL + `/EmployeeImages('${itemPic}')/$value`;
//         j.setCookie(cookie, url);
//         req.get(url, {
//             jar: j,
//             rejectUnauthorized: false,
//             gzip: true
//         }).pipe(fs.createWriteStream(`./app/label/pictures/b1/${itemPic}`)).on('close', resolve).on('error', reject);
//     });
// }

async function processDataset(raw) {
    let results = [];
    if (raw && raw.hasOwnProperty('value') && raw.value.length > 0) {
        if (!fs.existsSync('./app/label/pictures')) {
            fs.mkdirSync('./app/label/pictures');
        }

        if (!fs.existsSync('./app/label/pictures/b1')) {
            fs.mkdirSync('./app/label/pictures/b1');
        }

        for (let item of raw.value) {
            if (item.Picture && item.Picture != '') {
                results.push(
                    {
                        "ApplicationUserID": item.ApplicationUserID,
                        "EmployeeID": item.EmployeeID,
                        "FirstName": item.FirstName,
                        "LastName": item.LastName,
                        "Picture": item.Picture
                    }
                )

                await employeeImage(item.EmployeeID, item.Picture);
            }
        }
    }

    return results;
}

function processProjectList(raw, status = true) {
    let results = [];
    if (raw && raw.hasOwnProperty('value') && raw.value.length > 0) {
        for (let item of raw.value) {
            if (status && item.Active != 'tYES') {
                continue; // remove the project inactive
            }

            // add the return array
            results.push(item.Name);
        }

        // label.setEntities('projects', projects, 'b1');
    }

    return [...new Set(results)];
}

function processStageList(raw) {
    let results = [];
    if (raw && raw.hasOwnProperty('value') && raw.value.length > 0) {
        for (let item of raw.value) {
            // add the return array
            results.push(item.StageName);
        }

        // label.setEntities('stages', stages, 'b1');
    }

    return [...new Set(results)];
}