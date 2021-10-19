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


// Bot configuration:
//  Logging agent
const AGENT = {
    name : "harmonic-bot",
    color: "green"
}


// read query from file
// in this way you don't need to rebuild the bot for changing query

const harmonicQueryPath = "./queries/harmonic-annotations.sparql"

const getAnnotationsQuery = fileReader.read({
    path:  path.join(__dirname, harmonicQueryPath)
})

if (!getAnnotationsQuery) {
    logger.write({
        msg : "Cannot find query at " + harmonicQueryPath,
        agent : AGENT,
        logLevel : LogLevelEnum.Error
    })
    throw new Error()
}

// add IDs to annotations
const hydrateHarmonicAnnotationIDs = (a: any) => {
    a.id = nanoid()
    return a
};

// add relationships to single annotation
const hydrateHarmonicAnnotationRel = (a: any, _index:number, array: any[]) => {
    let relationshipsHarmonic = array
        .filter(anotherA => anotherA.harmSim == a.harmSim && anotherA.id !== a.id && anotherA.sourceRecordingID == a.targetRecordingID )
        .map(anotherA => {
            return {
                annotationID: anotherA.id,
                type: "harmonic",
                score: parseFloat(a.simScore),
            }
        })
    a.relationships = relationshipsHarmonic
    return a
};

// map sparqlRow to data format expected by Sonar demo app
const toSonarHarmonicAnnotation = (sparqlRow:any) => {
    return {
        id: sparqlRow.id,
        type: "harmonic",
        songID: sparqlRow.sourceRecordingID,
        timestamp: sparqlRow.startInRecording,
        metadata: {
            chordProgression: sparqlRow.chordProgression,
            startInRecording: sparqlRow.startInRecording,
            endInRecording: sparqlRow.endInRecording,
            targetRecordingID: sparqlRow.targetRecordingID,
            harmSim: sparqlRow.harmSim,
        },
        relationships: sparqlRow.relationships
    }
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
        msg : "Extracting similarities",
        agent : AGENT,
        logLevel : LogLevelEnum.Info
    })

    // launch job
    sparqlETL.run({
        
        query: getAnnotationsQuery,
        sources: sources

    }).then((annotationResults) => {

        // log when extraction of annotation is complete
        logger.write({
            msg : "Extracting annotations complete",
            agent : AGENT,
            logLevel : LogLevelEnum.Info
        })

        // remove duplicates and map to App Entities
        const annotationResultsWithIDs = annotationResults.map(hydrateHarmonicAnnotationIDs);
        const annotationResultsWithRels = annotationResults.map(hydrateHarmonicAnnotationRel);
        const sonarAnnotations = annotationResultsWithRels.map(toSonarHarmonicAnnotation);

        // write new json static file
        filePublisher.write({
            annotations: sonarAnnotations,
        }, {
            destination: input.out
        });

        // log when transformation is complete
        logger.write({
            msg : "Output file written to " + (input.out || "stdin"),
            agent : AGENT,
            logLevel : LogLevelEnum.Info
        })    
    }).catch(err => {

        logger.write({
            msg: `Harmonic annotation ETL\nSource: ${input.source}\nSource type:${input.sourceType}\nOut file: ${input.out || "stdin"}\n${err}`,
            agent: AGENT,
            logLevel: LogLevelEnum.Error 
        })

    });
}

// run main
const botCli = new BotCli()
botCli.run(main)