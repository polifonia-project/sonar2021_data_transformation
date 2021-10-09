import { Service } from "typedi";
import { IPublisher } from "../IPublisher";
import fs from "fs"
import path from "path"

export enum FileFormatEnum {
    Json = "json",
    JsonLd = "jsonld",
    Ttl = "ttl"
}

export type FilePublisherOptions = {
    format?: FileFormatEnum,
    destination?: string
    msg? : string
}

@Service()
export class FilePublisher implements IPublisher<any, FilePublisherOptions> {

    async write(input: any, options?: FilePublisherOptions) : Promise<void> {


        const jsons =  JSON.stringify(input, null, 2)

        if (!options?.destination) {
            console.log(jsons)
            return 
        }
        
        const destination = options?.destination

        const dir = path.dirname(destination)

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            })
        }

        fs.writeFile(destination , jsons, (err) => {
            if (err) {
                throw new Error("Error" + err)
            }
        })        
    }
}