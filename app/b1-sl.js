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
        req.get(url, { json: true, jar: j, rejectUnauthorized: false }, (err, res, body) => {
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
        req.get(url, { json: true, jar: j, rejectUnauthorized: false }, (err, res, body) => {
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
        req.post(url, { json: true, jar: j, rejectUnauthorized: false }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(body);
        });
    });
}

async function recordTime(employee, datetime, startTime, endTime, project, stage) {
    if (!_cookieString || (Date.now() - _cookieStringTimeout) > 10 * 60 * 1000) {// 10 mins timeout
        const cookie = await getCookies();
        if (!cookie) { return null; }
    }

    var projectId = 'NSI-C20000' // todo, hardcode, should be got by project name
    var stageId = '1' // todo, hardcode, should be got by stage name

    return new Promise((resolve, reject) => {
        const j = req.jar();
        const cookie = req.cookie(_cookieString);
        const url = _configs.BUSINESSONE.SERVICELAYER_APIURL + '/ProjectManagementTimeSheet';
        j.setCookie(cookie, url);
        req.post(url, {
            body: {
                "DateFrom": datetime,
                "DateTo": datetime,
                "PM_TimeSheetLineDataCollection": [
                    {
                        "ActivityType": "1",
                        "Date": datetime,
                        "EndTime": endTime,
                        "StartTime": startTime,
                        "FinancialProject": projectId,
                        "StageID": stageId
                    }
                ],
                "UserID": employee
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

function processDataset(raw) {
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

                employeeImage(item.EmployeeID, item.Picture);
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

            results.push(item.Name);
        }
    }

    return results;
}

function processStageList(raw) {
    let results = [];
    if (raw && raw.hasOwnProperty('value') && raw.value.length > 0) {
        for (let item of raw.value) {
            results.push(item.StageName);
        }
    }

    return results;
}