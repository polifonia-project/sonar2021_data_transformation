import 'reflect-metadata';
import { Container } from 'typedi';


import { SparqlETL } from "../etl/SparqlETL"
import { SourceEnum } from '../etl/extract/sparql/SparqlClient';
import { FilePublisher } from '../etl/load/json/FilePublisher';
import { FileReader } from '../etl/extract/file/FileReader';
import { config } from "./config"
import { Mapper } from '../etl/transform/base/Mapper';

const sparqlETL = Container.get(SparqlETL)
const filePublisher = Container.get(FilePublisher)
const fileReader = Container.get(FileReader)
const mapper = Container.get(Mapper)


const sources = [{
    type: SourceEnum.File,
    value: config.songsSource
}]

const songQuery = fileReader.read({
    path: "./queries/songs.sparql"
})

if (!songQuery) {
    throw new Error("[!] Cannot find query")
}

 
const toSonarSongAnnotation = (sparqlRow: any) => {
    return {
        ...sparqlRow
    }
}

async function main() {
    
    // launch get songs job
    sparqlETL.run({
        query: songQuery,
        sources: sources
    }).then(songs => {
        const sonarSongs = mapper.transform({
            collection: songs,
            projection: toSonarSongAnnotation
        })

        // write new json static file

        filePublisher.write({
            songs: sonarSongs,
        }, {
            destination: config.outputDir + "data_v3.json",
            msg: "[*] File written to: " + config.outputDir + "data_v3.json"
        })

    })
}

main()