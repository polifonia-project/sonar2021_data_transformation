import { Service } from "typedi";
import { IReader } from "../IReader";
import fs from "fs"
import path from "path"

/**
 * default encoding: utf-8
 */
export interface File {
    path: string,
    encoding?: BufferEncoding
}



@Service()
export class FileReader implements IReader<File, string> {

    read(input: File): string {
        try {
            return fs.readFileSync(input.path, input.encoding ? input.encoding : "utf-8")
        } catch(err) {
           throw new Error(`[!] Error while reading file ${input.path} ${err}`)
        }        
    }
}