import 'reflect-metadata';
import { Container } from 'typedi';


import { SparqlETL } from "../etl/SparqlETL"
import { SourceEnum } from '../etl/extract/sparql/SparqlClient';
import { FilePublisher } from '../etl/load/json/FilePublisher';

const sparqlETL = Container.get(SparqlETL)
const filePublisher = Container.get(FilePublisher)


const sources = [{
    type: SourceEnum.File,
    value: "https://raw.githubusercontent.com/polifonia-project/sonar2021_demo/datasets/polifonia_places_etl/kg/versions/polifonia-kg-places-0.0.1.ttl"
}]

const getSongsQuery = `
PREFIX core:  <https://w3id.org/polifonia/ON/core/>
PREFIX pr:    <https://w3id.org/polifonia/resource/>
PREFIX fx:    <http://sparql.xyz/facade-x/ns/>
PREFIX mp:    <https://w3id.org/polifonia/ON/musical-performance/>
PREFIX rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX xyz:   <http://sparql.xyz/facade-x/data/>
PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?recordingID ?performerID ?performerLabel ?recordingTitleLabel ?sessionType ?placeLabel ?youtubeID
WHERE {
  ?recordingID rdf:type mp:Recording ;
      core:hasTitle ?title ;
      core:hasYoutubeID ?youtubeID ;
      mp:hasRecordingPerformer ?performerID ;
      mp:isRecordingProducedBy ?recordingProcess
  .
  ?title rdfs:label ?recordingTitleLabel.
  ?performerID rdfs:label ?performerLabel.
  ?recordingProcess mp:hasSession ?session.
  ?session core:hasPlace ?place ;
           core:hasType ?sessionType.
  ?place rdfs:label ?placeLabel.
  
}
`

// TODO: adjust to latest KG model
const getAnnotationsQuery = `
        
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX poli-mp: <https://w3id.org/polifonia/ON/musical-performance/>
        PREFIX poli-core:  <https://w3id.org/polifonia/ON/core/>

        SELECT ?id 
               ?type 
               ?songID
               ?timestamp

               ?relatedSongID
               ?placeName
               ?description

               ?lat
               ?long

               WHERE {
            
          ?id rdf:type poli-core:SpatialAnnotation ;
              poli-mp:hasDescription ?description ;
              poli-mp:hasTimeStamp ?timestamp ;
              poli-mp:hasType ?type ;
              poli-mp:aboutRecording ?songID ;
              poli-mp:hasSpatialSimilarityToRecording ?relatedSongID ;
              poli-mp:hasLat ?lat;
              poli-mp:hasLng ?long ;
              poli-mp:aboutPlaceName ?placeName .
            }
`

const toSonarAppAnnotation =  (sparqlRow : any) => {
    return {
        id: sparqlRow.id,
        type: sparqlRow.type,
        description: sparqlRow.description,
        songID: sparqlRow.songID,
        metadata: {
            long: sparqlRow.long,
            lat: sparqlRow.lat,
            placeName: sparqlRow.placeName
        },
        relationships: [{
            songID: sparqlRow.relatedSongID,
            type: sparqlRow.type,
            score: Math.random()
        }]

    }
}

const toSonarSongAnnotation = (sparqlRow: any) => {

    return {
        name      : sparqlRow.recordingTitleLabel,
        artist    : sparqlRow.performerLabel,
        artistId  : sparqlRow.performerID,
        id        : sparqlRow.recordingID,
        youtubeID : sparqlRow.youtubeID,
    }
}

// remove duplicates with same id
const withoutDuplicates = (data: any[]) => {
    return data.filter((v : any,i : any,a : any) => a.findIndex((t : any)=>(t.id === v.id))===i)
}


function main() {
    
    // launch get songs job
    const getSongs = sparqlETL.run({
        query: getSongsQuery,
        sources: sources
    })
    
    // launch get annotation jobs
    const getAnnotations = sparqlETL.run({
        query: getAnnotationsQuery,
        sources: sources
    })
    

    // run query in parallel
    // Promise.all([getSongs, getAnnotations]).then(([songsResults, annotationResults]) => {
    
    //     // remove duplicates and map to App Entities
    //     const sonarAnnotations = withoutDuplicates(annotationResults.map(toSonarAppAnnotation))
    //     const songAnnotations = withoutDuplicates(songsResults.map(toSonarSongAnnotation))

    //     // write new json static file
    //     filePublisher.write({
    //         songs: songAnnotations,
    //         annotations: sonarAnnotations
    //     }, {
    //         destination: "./data_v3.json",
    //         msg: "[*] File written to: " + "./data_v3.json"
    //     })
        
    // })

    // run query in parallel
    Promise.all([getSongs]).then(([songsResults]) => {
    
        // remove duplicates and map to App Entities
        const songAnnotations = withoutDuplicates(songsResults.map(toSonarSongAnnotation))

        // write new json static file
        const targetFileName = "polifonia-kg-places-0.0.1-4demo.json"
        filePublisher.write({
            songs: songAnnotations,
        }, {
            destination: `./data-out/${targetFileName}`,
            msg: "[*] File written to: " + `./data-out/${targetFileName}`
        })
        
    })
}

main()