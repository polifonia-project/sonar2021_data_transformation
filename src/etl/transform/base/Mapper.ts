import { Service } from "typedi";
import { IDataMapper } from "../IDataMapper";


/**
 * projection is run on every element of the collection
 */
export type MapperInput  = {
    collection: any[]
    projection: (i: any) => any
}

@Service()
export class Mapper implements IDataMapper<MapperInput, any> {

    transform(input: MapperInput) {
        // this implementation can be later changed promisfying input.projection
        // and running the map in parallel
        // if faster pipe is required
        return input.collection.map(input.projection)
    }

}