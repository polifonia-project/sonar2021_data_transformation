import 'reflect-metadata';

import path from "path"

import { Container } from 'typedi';
import { nanoid } from "nanoid"

import { SparqlETL } from "../etl/SparqlETL"
import { FilePublisher } from '../etl/load/json/FilePublisher';
import { FileReader } from '../etl/extract/file/FileReader';
import { BotCli, BotCliRunInput } from './BotCli';
import { Logger, LogLevelEnum } from '../etl/load/json/Logger';

import {uniqWith, uniqBy} from "lodash"

const sparqlETL = Container.get(SparqlETL)
const filePublisher = Container.get(FilePublisher)
const logger = Container.get(Logger)
const fileReader = Container.get(FileReader)


// Bot configuration:
//  Logging agent
const AGENT = {
    name : "harmonic-bot",
    color: "magenta"
}


// add IDs to annotations
const hydrateHarmonicAnnotationIDs = (a: any) => {
    a.id = nanoid()
    return a
};

// convert KG timeString to seconds based timestamp
const timeStringToSeconds = (timeString: string) => {
    let [hours, minutes, seconds] = timeString.split(':').map(parseFloat)
    return Math.round(hours * 60 * 60 + minutes * 60 + seconds)
};



// ?recordingTitleLabel
// ?performerLabel
// ?performerID
// ?youtubeID

// ?harmonicSimIRI
// ?recordingAIRI
// ?recordingBIRI
// ?chordProgressionAIRI 
// ?chordProgressionBIRI
// ?simScore
// ?beginCPA 
// ?endCPA
// ?cProgrALabel


// add relationships to single annotation
const hydrateHarmonicAnnotationRel = (a: any, _index:number, annotations: any[]) => {
    let relationshipsHarmonic = annotations
        .filter(b => 
            b.harmonicSimIRI == a.harmonicSimIRI 
            && b.id !== a.id 
            && b.recordingAIRI == a.recordingBIRI
        )
        .map(b => {
            return {
                annotationID: b.id,
                type: "harmonic",
                score: parseFloat(parseFloat(a.simScore).toFixed(3))
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
            longestChordProgression : sparqlRow.cProgrALabel
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


        const cleanDuplicateAnnotations= (data : any[]) => {
            return uniqWith(data, function(arrVal, othVal) {
                return (arrVal.songID == othVal.songID) && (arrVal.metadata.chordProgressionAIRI === othVal.metadata.chordProgressionAIRI) && (arrVal.metadata.recordingBIRI === othVal.metadata.recordingBIRI)
            })
        }

        // remove duplicates and map to App Entities
        const annotationResultsWithIDs = annotationResults.map(hydrateHarmonicAnnotationIDs);


        const annotationResultsWithRels = annotationResultsWithIDs.map(hydrateHarmonicAnnotationRel);

        const sonarAnnotationsWithEmptyRels = annotationResultsWithRels.map(toSonarHarmonicAnnotation);

        const withoutDuplicatesAnnotations =  cleanDuplicateAnnotations(sonarAnnotationsWithEmptyRels)
        const cleanDuplicateRelationships = (annotations: any[]) => {
            return annotations.map(a   => {

                const uniqueRelations = uniqBy(a.relationships, "score")
                // .filter((r : any) => {
                //     return  a.songID != r.songID
                // })
                a.relationships = uniqueRelations

                return a
            })
        }
        const withoutDuplicateRelationships = cleanDuplicateRelationships(withoutDuplicatesAnnotations)

        const removeAnnotationsWithoutRelationshipsAndNotRelationOfAnotherAnnotation = (annotations: any[]) => {

            annotations.filter((a, index, annotations) => {

                // remove case where there's no relation to show

                const hasTargetAnnotation = annotations.some(target => target.relationships && target.relationships[0].annotationID === a.id )
                const isTargetOfAnotherAnnotation = annotations.some(anotherA => a.relationships && a.relationships[0].annotationID === anotherA.id )

                return hasTargetAnnotation && isTargetOfAnotherAnnotation
            })

        }

        // write new json static file
        filePublisher.write({
            songs : [],
            annotations: withoutDuplicateRelationships,
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