import { Service } from "typedi";

import yargs from "yargs"

export type MergerCliRunInput = {
    list: string
    out?: string,
    verbose: boolean,
}

@Service()
export class MergerCli {

    argv: any


    constructor() {
        this.argv = yargs
        .command("run", "Bot merges sonar annotations produced by different bots")
        .option('list', {
            alias: "l",
            description: "Space separated list of file paths to sonar annotations",
            type: "string"
        })
        .option('out', {
            alias: 'o',
            description: 'The file where output extracted data. If no file specified output to stdin',
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
        .demandOption(["list"], "Please provide a a list of file paths")
        .argv;

    }

    run(main: (input : MergerCliRunInput) => any) {
        if (this.argv) {
            main({
                list: this.argv.list,
                out: this.argv.out,
                verbose: this.argv.log,
            })
        }
    }
}