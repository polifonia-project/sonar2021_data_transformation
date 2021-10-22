import 'reflect-metadata';

import { Container } from 'typedi';
import { nanoid } from "nanoid"

import { SparqlETL } from "../etl/SparqlETL"
import { FilePublisher } from '../etl/load/json/FilePublisher';
import { FileReader } from '../etl/extract/file/FileReader';
import { BotCli, BotCliRunInput } from './BotCli';
import { Logger, LogLevelEnum } from '../etl/load/json/Logger';
import { MergerCli, MergerCliRunInput } from './MergerCli';

const sparqlETL = Container.get(SparqlETL)
const filePublisher = Container.get(FilePublisher)
const logger = Container.get(Logger)
const fileReader = Container.get(FileReader)


// Bot configuration:
//  Logging agent
const AGENT = {
    name : "merger-bot",
    color: "blue"
}


type PolifoniaInput = {
    songs: []
    annotations: []
}

const mergePolifoniaAnnotations = (jsons : PolifoniaInput[]) => {
    return jsons.reduce((j, e) => {
        return {
            songs : [...j.songs, ...e.songs ],
            annotations: [...j.annotations, ...e.annotations]
        }
    }, {
        songs: [],
        annotations: []
    })
}

function main(input : MergerCliRunInput) {

        if (!input.list) {

            logger.write({
                msg : "You must specify a list of file to be merged separated by space",
                agent : AGENT,
                logLevel : LogLevelEnum.Error
            })
        }

        /** READ QUERY */

        const files = input.list.split(" ")

        if (files.length < 2) {
            logger.write({
                msg : "Input at least two files to be merged. Done.",
                agent : AGENT,
                logLevel : LogLevelEnum.Info
            })
            process.exit(0)
        }

        const jsons : PolifoniaInput[] = files.map((f:string) => {return fileReader.read({
                path: f,
                json: true
            })
        })
        
    logger.write({
        msg : "Start Merging " + files,
        agent : AGENT,
        logLevel : LogLevelEnum.Info
    })

    try {



        const mergedAnnotations = mergePolifoniaAnnotations(jsons)


                // write new json static file
                filePublisher.write(mergedAnnotations, {
                    destination: input.out
                });
        

    } catch (err) {


        logger.write({
            msg : "Failed to merge annotations: " + files + err,
            agent : AGENT,
            logLevel : LogLevelEnum.Error
        })

    }

}


// run main
const botCli = new MergerCli()
botCli.run(main)