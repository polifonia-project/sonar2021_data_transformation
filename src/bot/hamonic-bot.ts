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


// add IDs to annotations
const hydrateHarmonicAnnotationIDs = (a: any) => {
    a.id = nanoid()
    return a
};

// convert KG timeString to seconds based timestamp
const timeStringToSeconds = (timeString: string) => {
    let [hours, minutes, seconds] = timeString.split(':').map(parseFloat)
    return hours * 60 * 60 + minutes * 60 + seconds
};

// add relationships to single annotation
const hydrateHarmonicAnnotationRel = (a: any, _index:number, array: any[]) => {
    let relationshipsHarmonic = array
        .filter(b => 
            b.harmonicSimIRI == a.harmonicSimIRI 
            && b.id !== a.id 
            && b.recordingAIRI == a.recordingBIRI 
        )
        .map(b => {
            return {
                annotationID: b.id,
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
        songID: sparqlRow.recordingAIRI,
        timestamp: timeStringToSeconds(sparqlRow.beginCPA),
        metadata: {
            chordProgressionAIRI: sparqlRow.chordProgressionAIRI,
            beginCPA: timeStringToSeconds(sparqlRow.beginCPA),
            endCPA: timeStringToSeconds(sparqlRow.endCPA),
            recordingBIRI: sparqlRow.recordingBIRI,
            harmonicSimIRI: sparqlRow.harmonicSimIRI,
        },
        relationships: sparqlRow.relationships
    }
};

function main(input : BotCliRunInput) {


    /** READ QUERY */

    let getAnnotationsQuery : any

    if (!input.file && !input.query) {

        logger.write({
            msg : "You must specify a query to extract annotations",
            agent : AGENT,
            logLevel : LogLevelEnum.Error
        })
    }


    if (input.file) {
         /** Try from file */
         getAnnotationsQuery = fileReader.read({
            path:  input.file
        })
        if (!getAnnotationsQuery) {
            logger.write({
                msg : "Cannot find query at " + input.file,
                agent : AGENT,
                logLevel : LogLevelEnum.Error
            })

        }    
    }
    /** Query from cli */
    if (input.query) {
        getAnnotationsQuery = input.query
   }


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
        const sonarAnnotationsWithEmptyRels = annotationResultsWithRels.map(toSonarHarmonicAnnotation);
        const sonarAnnotations = sonarAnnotationsWithEmptyRels.filter(a => a.relationships.length);

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