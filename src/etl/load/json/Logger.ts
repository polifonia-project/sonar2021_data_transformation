import { Service } from "typedi";
import { IPublisher } from "../IPublisher";
import logger from "node-color-log"


export enum LogLevelEnum {
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error"
}

/**
 * Valid agent colors:
 *      black, red, green, yellow, blue, magenta, cyan, white
 */
export type LoggerInput = {
    data? : any[]
    msg : string
    agent? : {
        name: string,
        color: any
    }
    logLevel: LogLevelEnum 
}

@Service()
export class Logger implements IPublisher<LoggerInput, void> {

    async write(input: LoggerInput) : Promise<void> {

        switch (input.logLevel) {
            case LogLevelEnum.Debug:
                logger.debug(this.prependAgent(input.msg,input.agent?.name))
                break
            case LogLevelEnum.Info:
                logger.color(input.agent?.color || "blue").log(this.prependAgent(input.msg,input.agent?.name))
            break
            case LogLevelEnum.Warn:
                logger.warn(this.prependAgent(input.msg,input.agent?.name))
                break
            case LogLevelEnum.Error:
                logger.error(this.prependAgent(input.msg,input.agent?.name))
                break
            default: 
                logger.color(input.agent?.color || "blue").log(this.prependAgent(input.msg,input.agent?.name))

        }
    }

    prependAgent( msg : string, agent : string | undefined) {
        if (agent) { 
            return "[" + agent + "]" + " " + msg
        } else {
            return msg
        }
    }

}