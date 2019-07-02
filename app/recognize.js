const fs = require('fs');

const config = require('./config');
const leon = require('./leonardo');
const label = require('./label')

module.exports = {
    search: searchFace,
    //score: similarityScoring,
    export: exportResult
};

const _configs = config.getConfigs();

async function searchFace(filename) {
    var result = await leon.faceFeatureExtraction(filename);
    console.log('face feature extraction:', result);

    if (result && result.hasOwnProperty('predictions') && result.predictions[0].hasOwnProperty('faces') && result.predictions[0].numberOfFaces > 0 &&
        result.predictions[0].faces[0].hasOwnProperty('face_feature') && result.predictions[0].faces[0].hasOwnProperty('face_location')) {
        var condinates = [];
        const labels = label.getLabels();
        for (let k in labels) {
            if (labels[k].application.toLowerCase() == _configs.GENERAL.DATASETS) {
                condinates.push({ "id": k, "vector": labels[k].faceFeature });
            }
        }

        const vectors = {
            "0": [{ "id": filename, "vector": result.predictions[0].faces[0].face_feature }],
            "1": condinates
        };
        console.log(vectors);

        return await leon.similarityScoring(vectors);
    } else {
        return [];
    }
}

function similarityScoring(v, numSimilarVectors = 1) {
    // if len(v['0']) > 0 and len(v['1']) > 0:
    //     ret_values = []
    //     for a in v['0']:
    //         similar_vectors = [{'id': b['id'], 'score': utils.cosine_similarity(a['vector'], b['vector'])} for b in
    //                            v['1']]
    //         similar_vectors.sort(key=lambda x: x['score'], reverse=True)
    //         ret_values.append({'id': a['id'], 'similarVectors': similar_vectors[:numSimilarVectors]})
    //     return ret_values
    // return []

    return;
}

function exportResult(raw) {
    var results = [];
    for (r of raw) {
        let item = label.getLabels(r.id);
        if (item) {
            results.push({
                id: r.id,
                eid: item.id,
                name: item.name,
                app: item.application,
                score: r.score,
                image: `/library/${item.application}/${r.id}.jpg`
            });
        }
    }

    results.sort((a, b) => { a.score > b.score });
    return results;
}
