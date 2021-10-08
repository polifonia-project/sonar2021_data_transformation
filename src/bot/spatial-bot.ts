import 'reflect-metadata';

import path from "path"

import { Container } from 'typedi';

import { SparqlETL } from "../etl/SparqlETL"
import { SourceEnum } from '../etl/extract/sparql/SparqlClient';
import { FilePublisher } from '../etl/load/json/FilePublisher';
import { FileReader } from '../etl/extract/file/FileReader';
import { config } from './config';

const sparqlETL = Container.get(SparqlETL)
const filePublisher = Container.get(FilePublisher)
const fileReader = Container.get(FileReader)



const sources = [{
    type: SourceEnum.File,
    value: config.kgSource

}]

const getSongsQuery = fileReader.read({
    path: path.join(__dirname, "./queries/songs.sparql")
})

const getAnnotationsQuery = fileReader.read({
    path:  path.join(__dirname, "./queries/spatial-annotations.sparql")
})

if (!getSongsQuery || !getAnnotationsQuery) {
    throw new Error("[!] Cannot find query")
}


const toSonarSongAnnotation = (sparqlRow: any) => {
    return {
        name: sparqlRow.recordingTitleLabel,
        artist: sparqlRow.performerLabel,
        artistId: sparqlRow.performerID,
        id: sparqlRow.recordingID,
        youtubeID: sparqlRow.youtubeID,
    };
};

const toSonarAppAnnotation = (sparqlRow: any) => {
    return {
        id: sparqlRow.id,
        type: "spatial",
        songID: sparqlRow.recordingID,
        timestamp: getRandomInt(0, 60),
        metadata: {
            long: sparqlRow.placeLong,
            lat: sparqlRow.placeLat,
            placeName: sparqlRow.placeLabel
        },
        relationships: sparqlRow.relationships
    }
};

// remove duplicates with same id
const withoutDuplicates = (data: any[]) => {
    return data.filter((v : any,i : any,a : any) => a.findIndex((t : any)=>(t.id === v.id))===i)
}

// get random integer between min and max
const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

// add IDs to annotations
const hydrateAnnotationIDs = (data: any[]) => {
    let i = 0;
    return data.map(a => {
        i++
        a.id = i
        return a
    });
};

// add relationships to annotations
const hydrateAnnotationRels = (data: any[], maxRelationships: number) => {
    return data.map(a => hydrateAnnotationRel(a, data, maxRelationships));
};

// add relationships to single annotation
const hydrateAnnotationRel = (a: any, data: any[], maxRelationships: number) => {
    let relationshipsSpatial = data
        .filter(anotherA => anotherA.placeID == a.placeID && anotherA.id !== a.id)
        .map(anotherA => {
            return {
                annotationID: anotherA.id,
                type: "spatial",
                score: 1,
            }
        })
    a.relationships = relationshipsSpatial.slice(0, maxRelationships)
    return a;
};


function main() {
    // launch get songs job
    const getSongs = sparqlETL.run({
        query: getSongsQuery,
        sources: sources
    });
    // launch get annotation jobs
    const getAnnotations = sparqlETL.run({
        query: getAnnotationsQuery,
        sources: sources
    });
    // run queries in parallel
    Promise.all([getSongs, getAnnotations]).then(([songsResults, annotationResults]) => {
        const MAX_RELATIONSHIPS = 3;
        // remove duplicates and map to App Entities
        const sonarSongs = withoutDuplicates(songsResults.map(toSonarSongAnnotation))
        const annotationResultsWithID = hydrateAnnotationIDs(annotationResults);
        const annotationResultsWithRels = hydrateAnnotationRels(annotationResultsWithID, MAX_RELATIONSHIPS);
        const sonarAnnotations = annotationResultsWithRels.map(toSonarAppAnnotation);

        // write new json static file
        const targetFileName = "polifonia-kg-places-0.0.1-demo.json";
        filePublisher.write({
            songs: sonarSongs,
            annotations: sonarAnnotations,
        }, {
            destination: `./data-out/${targetFileName}`,
            msg: "[*] File written to: " + `./data-out/${targetFileName}`
        });
    });
}

main()