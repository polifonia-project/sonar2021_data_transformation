import 'reflect-metadata';

import { Container } from 'typedi';

import { FilePublisher } from '../etl/load/json/FilePublisher';
import { FileReader } from '../etl/extract/file/FileReader';
import { Logger, LogLevelEnum } from '../etl/load/json/Logger';
import { MergerCli, MergerCliRunInput } from './MergerCli';

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
    songs: any[]
    annotations: any[]
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

const cleanDuplicates = (data : any[]) => {
    const set = new Set(data.map(item => JSON.stringify(item)));
    return [...set].map(item => JSON.parse(item));
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

           let mergedAnnotations = mergePolifoniaAnnotations(jsons)
        
           logger.write({
                       msg : "Merged annotations" + files,
                       agent : AGENT,
                       logLevel : LogLevelEnum.Info
           })
           logger.write({
               msg : `Songs count: ${mergedAnnotations.songs.length}\tAnnotations count: ${mergedAnnotations.annotations.length}`,
               agent : AGENT,
               logLevel : LogLevelEnum.Info
           })
        
   
   
           mergedAnnotations = {
               songs: cleanDuplicates(mergedAnnotations.songs),
               annotations: cleanDuplicates(mergedAnnotations.annotations)
           }
       
   
           logger.write({
               msg : "Cleaning annotations",
               agent : AGENT,
               logLevel : LogLevelEnum.Info
           })
           logger.write({
               msg : `Songs count: ${mergedAnnotations.songs.length}\tAnnotations count: ${mergedAnnotations.annotations.length}`,
               agent : AGENT,
               logLevel : LogLevelEnum.Info
           })
   
           // write new json static file
           filePublisher.write(mergedAnnotations, {
               destination: input.out
           });
           
           logger.write({
               msg : "Output file written to " + input.out,
               agent : AGENT,
               logLevel : LogLevelEnum.Info
           })
   
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