import 'reflect-metadata';
import { Container } from 'typedi';


import { SparqlETL } from "../etl/SparqlETL"
import { SourceEnum } from '../etl/extract/sparql/SparqlClient';
import { FilePublisher } from '../etl/load/json/FilePublisher';
import { FileReader } from '../etl/extract/file/FileReader';

const sparqlETL = Container.get(SparqlETL)
const filePublisher = Container.get(FilePublisher)
const fileReader = Container.get(FileReader)



const sources = [{
    type: SourceEnum.File,
    value: "https://raw.githubusercontent.com/polifonia-project/sonar2021_demo/develop/src/assets/data/data_v2.jsonld"
}]

const songQuery = fileReader.read({
    path: "./queries/songs.sparql"
})

console.log(songQuery)

if (!songQuery) {
    throw new Error("[!] Cannot find query")
}

 
const toSonarSongAnnotation = (sparqlRow: any) => {

    const parsedYTURL = sparqlRow.youtubeID.split("/")

    return {
        ...sparqlRow,
        youtubeID : parsedYTURL[parsedYTURL.length - 1]
    }
}

// remove duplicates with same id
const withoutDuplicates = (data: any[]) => {
    return data.filter((v : any,i : any,a : any) => a.findIndex((t : any)=>(t.id === v.id))===i)
}


function main() {
    
    // launch get songs job
    const getSongs = sparqlETL.run({
        query: songQuery,
        sources: sources
    })
    
  

    // run query in parallel
    Promise.all([getSongs]).then(([songsResults]) => {
    
        // remove duplicates and map to App Entities
        const songAnnotations = withoutDuplicates(songsResults.map(toSonarSongAnnotation))

        // write new json static file
        filePublisher.write({
            songs: songAnnotations,
        }, {
            destination: "./data_v3.json",
            msg: "[*] File written to: " + "./data_v3.json"
        })
        
    })
}

// main()