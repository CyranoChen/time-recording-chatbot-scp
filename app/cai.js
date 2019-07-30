const req = require('request');

const config = require('./config');

module.exports = {
    context
};

const _configs = config.getConfigs();

const headers = {
    'Authorization': 'Token ' + _configs.RECASTAI.APIKEY,
    'Content-Type': 'application/json'
};

async function context(session, employee, content) {
    return new Promise((resolve, reject) => {
        req.post(_configs.RECASTAI.DIALOG_ENDPOINTS, {
            body: {
                "message": {
                    "content": content,
                    "type": "text"
                },
                "conversation_id": session
            },
            json: true,
            headers: headers
        }, (err, res, body) => {
            if (err) { reject(err); }
            resolve(body);
        });
    });
}