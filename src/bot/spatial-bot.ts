import 'reflect-metadata';

import path from "path"

import { Container } from 'typedi';
import { nanoid } from "nanoid"

import { SparqlETL } from "../etl/SparqlETL"
import { FilePublisher } from '../etl/load/json/FilePublisher';
import { FileReader } from '../etl/extract/file/FileReader';
import { BotCli, BotCliRunInput } from './BotCli';
import { Logger, LogLevelEnum } from '../etl/load/json/Logger';

const sparqlETL = Container.get(SparqlETL)
const filePublisher = Container.get(FilePublisher)
const logger = Container.get(Logger)
const fileReader = Container.get(FileReader)


// Bot configuration

// black, red, green, yellow, blue, magenta, cyan, white
const AGENT = {
    name : "spatial-bot",
    color: "green"
}


const songQueryPath = "./queries/songs.sparql"
const spatialQueryPath = "./queries/spatial-annotations.sparql"

const getSongsQuery = fileReader.read({
    path: path.join(__dirname, songQueryPath)
})

const getAnnotationsQuery = fileReader.read({
    path:  path.join(__dirname, spatialQueryPath)
})

if (!getSongsQuery || !getAnnotationsQuery) {
    logger.write({
        msg : "Cannot find queries at" + songQueryPath  + " " + spatialQueryPath,
        agent : AGENT,
        logLevel : LogLevelEnum.Error
    })
    throw new Error()
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
    return data.map(a => {
        a.id = nanoid()
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


function main(input : BotCliRunInput) {

    logger.write({
        msg : "Start ETL: " + input.source,
        agent : AGENT,
        logLevel : LogLevelEnum.Info
    })

    const sources = [{
        type: input.sourceType,
        value: input.source
    }]
    

    logger.write({
        msg : "Extracting songs and annotations",
        agent : AGENT,
        logLevel : LogLevelEnum.Info
    })

    // launch get songs job
    const getSongs = sparqlETL.run({
        query: getSongsQuery,
        sources: sources
    }).then((getSongs) => {
        logger.write({
            msg : "Extracting songs complete",
            agent : AGENT,
            logLevel : LogLevelEnum.Info
        })
        return getSongs
    });
    // launch get annotation jobs
    const getAnnotations = sparqlETL.run({
        query: getAnnotationsQuery,
        sources: sources
    }).then((getAnnotations) => {
        logger.write({
            msg : "Extracting annotations complete",
            agent : AGENT,
            logLevel : LogLevelEnum.Info
        })    
        return getAnnotations
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
        filePublisher.write({
            songs: sonarSongs,
            annotations: sonarAnnotations,
        }, {
            destination: input.out
        });
        logger.write({
            msg : "Output file written to" + input.out,
            agent : AGENT,
            logLevel : LogLevelEnum.Info
        })    

    });
}


// run main
const botCli = new BotCli()
botCli.run(main)