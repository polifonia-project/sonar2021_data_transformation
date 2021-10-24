import 'reflect-metadata';

import { Container } from 'typedi';

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
    name : "song-bot",
    color: "yellow"
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


function main(input : BotCliRunInput) {


        /** READ QUERY */

        let getSongsQuery : any

        if (!input.file && !input.query) {
    
            logger.write({
                msg : "You must specify a query to extract annotations",
                agent : AGENT,
                logLevel : LogLevelEnum.Error
            })
        }
    
    
        if (input.file) {
             /** Try from file */
             getSongsQuery = fileReader.read({
                path:  input.file
            })
            if (!getSongsQuery) {
                logger.write({
                    msg : "Cannot find query at " + input.file,
                    agent : AGENT,
                    logLevel : LogLevelEnum.Error
                })
    
            }    
        }
        /** Query from cli */
        if (input.query) {
            getSongsQuery = input.query
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
        msg : "Extracting songs",
        agent : AGENT,
        logLevel : LogLevelEnum.Info
    })



    // launch get annotation job
    sparqlETL.run({
        
        query: getSongsQuery,
        sources: sources

    }).then((songsResults) => {

        // log when extraction of annotation is complete
        logger.write({
            msg : "Extracting songs complete",
            agent : AGENT,
            logLevel : LogLevelEnum.Info
        })

        // remove duplicates and map to App Entities
        let sonarSongs = (songsResults.map(toSonarSongAnnotation))


        // write new json static file
        filePublisher.write({
            songs: sonarSongs,
            annotations: songsResults,
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
            msg: `Songs ETL\nSource: ${input.source}\nSource type:${input.sourceType}\nOut file: ${input.out || "stdin"}\n${err}`,
            agent: AGENT,
            logLevel: LogLevelEnum.Error 
        })

    });

}


// run main
const botCli = new BotCli()
botCli.run(main)