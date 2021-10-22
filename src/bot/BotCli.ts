import { Service } from "typedi";

import yargs from "yargs"
import { SourceEnum } from "../etl/extract/sparql/SparqlClient";

export type BotCliRunInput = {
    source : string,
    out?: string,
    query? : string,
    file?: string,
    verbose: boolean,
    sourceType: SourceEnum
}

@Service()
export class BotCli {

    argv: any


    constructor() {
        this.argv = yargs
        .command("run", "Bot extract data from SOURCE with given QUERY or FILE, transform results and save extracted data to OUT (default OUT stdin)")
        .option('source', {
            alias: "s",
            description: "The source of a KG. Remote source or local file accepted",
            type: "string"
        })
        .option('type', {
            alias: "t",
            description: "Source type. []",
            type: "string",
            choices: ["sparql","file","hypermedia","rdfjsSource", "hdtFile", "ostrichFile"]
        })
        .option('out', {
            alias: 'o',
            description: 'The file where output extracted data. If no file specified output to stdin',
            type: 'string',
        })
        .option('file', {
            alias: 'f',
            description: 'The file with query to extract annotations. One of file or query option must be specified',
            type: 'string',
        })
        .option('query', {
            alias: 'q',
            description: 'String with a query to extract annotations. One of file or query option must be specified. This option has priority over file',
            type: 'string',
        })
        .option("log", {
            alias: "v",
            description: "verbose log in the console",
            type: "boolean",
            default: true
        })
        .help()
        .alias('help', 'h')
        .demandCommand(1, 'You need at least one command before moving on')
        .demandOption(["source", "type"], "Please provide a source to query and an output file")
        .argv;

    }

    run(main: (input : BotCliRunInput) => any) {
        if (this.argv) {
            main({
                source: this.argv.source,
                out: this.argv.out,
                query: this.argv.query,
                file: this.argv.file,
                verbose: this.argv.log,
                sourceType: this.argv.type
            })
        }
    }
}