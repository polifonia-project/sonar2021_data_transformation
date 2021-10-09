import 'reflect-metadata';
import { Container } from 'typedi';


import { SparqlETL } from "../etl/SparqlETL"
import { SourceEnum } from '../etl/extract/sparql/SparqlClient';
import { FilePublisher } from '../etl/load/json/FilePublisher';
import { FileReader } from '../etl/extract/file/FileReader';
import { Mapper } from '../etl/transform/base/Mapper';

const sparqlETL = Container.get(SparqlETL)
const filePublisher = Container.get(FilePublisher)
const fileReader = Container.get(FileReader)
const mapper = Container.get(Mapper)


// TODO embed in BotCli

const sources = [{
    type: SourceEnum.File,
    value: "value here"
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
            destination: "data_v3.json",
            msg: "[*] File written to: " + "data_v3.json"
        })

    })
}

//main()