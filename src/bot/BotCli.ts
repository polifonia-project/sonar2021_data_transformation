import { Service } from "typedi";

import yargs, { string } from "yargs"
import { SourceEnum } from "../etl/extract/sparql/SparqlClient";

export type BotCliRunInput = {
    source : string,
    out: string,
    verbose: boolean,
    sourceType: SourceEnum
}

@Service()
export class BotCli {

    argv: any


    constructor() {
        this.argv = yargs
        .command("run", "Bot query SOURCE, transform results and save extracted data to OUT")
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
            description: 'The file where output extracted data',
            type: 'string',
        })
        .option("log", {
            alias: "v",
            description: "verbose log in the console",
            type: "boolean",
            default: false
        })
        .help()
        .alias('help', 'h')
        .demandCommand(1, 'You need at least one command before moving on')
        .demandOption(["source", "out", "type"], "Please provide a source to query and an output file")
        .argv;
    }

    run(main: (input : BotCliRunInput) => any) {

        if (this.argv) {
            main({
                source: this.argv.source,
                out: this.argv.out,
                verbose: this.argv.log,
                sourceType: this.argv.type
            })
        }
    }
}