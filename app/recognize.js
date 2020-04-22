const fs = require('fs');

const config = require('./config');
const azure = require('./azure');
// const leon = require('./leonardo');
const label = require('./label')

module.exports = {
    //search: searchFace,
    search: findSimilarFace,
    //score: similarityScoring,
    export: exportResult
};

const _configs = config.getConfigs();

async function findSimilarFace(filename, dataset = _configs.GENERAL.DATASETS) {
    var result = await azure.faceDetect(filename);
    console.log('face detect:', result);

    if (result && result.length > 0 && result[0].hasOwnProperty('faceId')) {
        var result = await azure.faceFindSimilar(result[0].faceId, dataset)

        console.log('face similar found:', result);
        if (result && result.length > 0) {
            var condinates = [];
            for (let item of result) {
                if (item['confidence'] > _configs.GENERAL.THRESHOLD_SIMILAR) {
                    condinates.push(item)
                }
            }

            return condinates;
        }
    }

    return [];
}


async function searchFace(filename) {
    var result = await leon.faceFeatureExtraction(filename);
    console.log('face feature extraction:', result);

    if (result && result.hasOwnProperty('predictions') && result.predictions[0].hasOwnProperty('faces') && result.predictions[0].numberOfFaces > 0 &&
        result.predictions[0].faces[0].hasOwnProperty('face_feature') && result.predictions[0].faces[0].hasOwnProperty('face_location')) {
        var condinates = [];
        const labels = label.getLabels();
        for (let k in labels) {
            if ((labels[k].application.toLowerCase() == _configs.GENERAL.DATASETS) || (_configs.GENERAL.DATASETS.toLowerCase() === 'all')) {
                condinates.push({ "id": k, "vector": labels[k].faceFeature });
            }
        }

        const vectors = {
            "0": [{ "id": filename, "vector": result.predictions[0].faces[0].face_feature }],
            "1": condinates
        };
        console.log(vectors);

        let numSimilarVectors = vectors["1"].length > _configs.GENERAL.THRESHOLD_NUM_SIMILAR ? _configs.GENERAL.THRESHOLD_NUM_SIMILAR : vectors["1"].length;
        return await leon.similarityScoring(vectors, numSimilarVectors = numSimilarVectors);
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
    // raw
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

    var results = [];

    for (r of raw) {
        let item = label.getLabels(r.persistedFaceId);

        if (item) {
            results.push({
                sid: item.systemId,
                eid: item.id,
                name: item.name,
                app: item.application,
                score: r.confidence,
                image: `/library/${item.application}/${item.image}`,
                faceid: r.persistedFaceId
            });
        }
    }

    results.sort((a, b) => { a.score > b.score });
    return results;
}
