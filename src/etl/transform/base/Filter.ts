import { Service } from "typedi";
import { IDataMapper } from "../IDataMapper";


export type FilterInput = {
    collection: any[],
    condition: (i: any) => any
}

@Service()
export class Filter implements IDataMapper<FilterInput, any> {

    transform(input: FilterInput) {
        input.collection.filter(input.condition)
    }
    
}