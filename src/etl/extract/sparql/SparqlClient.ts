import { Service } from "typedi";

import { IReader } from "../IReader";
import { newEngine as newFileEngine } from "@comunica/actor-init-sparql-file";
import { newEngine } from "@comunica/actor-init-sparql";
import { Bindings } from '@comunica/bus-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { ActorInitSparql } from "@comunica/actor-init-sparql/index-browser";


export enum SourceEnum {
    Sparql = "sparql",
    File = "file",
    Hypermedia = "hypermedia",
    RdfjsSource = "rdfjsSource",
    HdtFile = "hdtFile",
    OstrichFile = "ostrichFile"
}

export type SparqlSource = {
    type: SourceEnum,
    value: string // e.g. sparql endpoint url, file location...
}

// adjust this to comunica such that IDataMapper can be typed
export type SparqlResponse = {
    bindings: any
}

type RequestOptions = any

export interface SparqlRequestInput {
    query: string
    options?: RequestOptions
    sources: SparqlSource[]
    graph? : string
}

@Service()
export class SparqlClient implements IReader<SparqlRequestInput, SparqlResponse> {

    sparqlQueryingEngine: ActorInitSparql;
    factory: any;
    sparqlFileQueryingEngine: ActorInitSparql;
    
    constructor() {
        this.sparqlQueryingEngine = newEngine();
        this.sparqlFileQueryingEngine = newFileEngine()
        this.factory = new DataFactory();
    }

    async read(input: SparqlRequestInput): Promise<SparqlResponse> {

        // choose file engine or sparql engine based on source to be queried 
        // this won0t work if array as different sources
        // you should divide in two or more array by sources let appropriate actor
        // to query its source and then merge results

        const engine : ActorInitSparql = input.sources[0].type == SourceEnum.File ?  this.sparqlFileQueryingEngine : this.sparqlQueryingEngine

        const query = input.query
        let bindings;
        try {
            let comunicaParams = {
                sources: input.sources,
                // bind ?graph variable if not default graph
                ...((input.graph && input.graph !== "default") && {initialBindings: Bindings({
                    '?graph' : this.factory.namedNode(input.graph)
                })})
            }
            const result : any = await engine.query(query, comunicaParams);
            bindings = await result.bindings();
        } catch (e) {
            throw new Error("SparqlClient.sendRequest" + e)
        }
        return {
            bindings: bindings
        };
    }

    async invalidateCache() {
        await this.sparqlQueryingEngine.invalidateHttpCache()
    }

}
