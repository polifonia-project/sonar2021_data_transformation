import 'reflect-metadata';

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
    name : "spatial-bot",
    color: "green"
}


const toSonarAppAnnotation = (sparqlRow: any) => {
    return {

        id: sparqlRow.id,
        type: "lyrics",
        songID: sparqlRow.recordingID,
        timestamp: getRandomInt(0, 60),
        metadata: {
            lyricLine: sparqlRow.lineLabel 
        },
        relationships: sparqlRow.relationships
    }
};


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
const hydrateAnnotationRels = (data: any[]) => {
    return data.map(a => hydrateAnnotationRel(a, data));
};

// add relationships to single annotation
const hydrateAnnotationRel = (a: any, data: any[]) => {
    let relationshipsLyrics = data
        .filter(anotherA => anotherA.lyricSimilarityID == a.lyricSimilarityID && anotherA.id !== a.id)
        .map(anotherA => {
            return {
                annotationID: anotherA.id,
                songID : anotherA.recordingID,
                type: "lyrics",
                score: 1,
            }
        })
    a.relationships = relationshipsLyrics
    return a;
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
        msg : "Extracting annotations",
        agent : AGENT,
        logLevel : LogLevelEnum.Info
    })



    // launch get annotation job
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

        const cleanAnnotationsWithSameLyricLineLabelAtDifferentTimeIntervals = (data : any[]) => {
            return uniqWith(data, function(arrVal, othVal) {
                return (arrVal.songID == othVal.songID) && (arrVal.metadata.lyricLine == othVal.metadata.lyricLine) && (arrVal.relationships.songID == othVal.relationships.songID)
            })
        }
        const cleanRelationships = (annotations : any[]) => {

            return annotations.map(a   => {

                const uniqueRelations = uniqBy(a.relationships, "songID").filter((r : any) => {
                    return  a.songID != r.songID
                })

                a.relationships = uniqueRelations

                return a
            })
        }
        const annotationResultsWithID = hydrateAnnotationIDs(annotationResults);
        const annotationResultsWithRels = hydrateAnnotationRels(annotationResultsWithID);
        const sonarAnnotations = annotationResultsWithRels.map(toSonarAppAnnotation);
        const sonarAnnotationsWithoutDuplicates = cleanAnnotationsWithSameLyricLineLabelAtDifferentTimeIntervals(sonarAnnotations)
        const sonarAnnotationsWithoutDuplicateRelationships = cleanRelationships(sonarAnnotationsWithoutDuplicates)

        

        // write new json static file
        filePublisher.write({
            songs: [],
            annotations: sonarAnnotationsWithoutDuplicateRelationships,
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
            msg: `Spatial annotation ETL\nSource: ${input.source}\nSource type:${input.sourceType}\nOut file: ${input.out || "stdin"}\n${err}`,
            agent: AGENT,
            logLevel: LogLevelEnum.Error 
        })

    });

}


// run main
const botCli = new BotCli()
botCli.run(main)