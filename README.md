# Sonar App ETL

ETL and services to extract data from Polifonia KG and transform them for Sonar2021 app.

Latest version of extracted Polifonia KG data is available at [/data-out/polifonia-kg-places-latest-demo.json](https://github.com/polifonia-project/sonar2021_data_transformation/blob/master/data-out/polifonia-kg-places-latest-demo.json).

Progressive versions are available at [/data-out/versions](https://github.com/polifonia-project/sonar2021_data_transformation/tree/master/data-out/versions).

## Related work

Data transformation from raw source files to Polifonia KG is being developed in [polifonia-project/polifonia_KG_data_transformation](https://github.com/polifonia-project/polifonia_KG_data_transformation).

Sonar Demo application is being developed in [polifonia-project/sonar2021_demo](https://github.com/polifonia-project/sonar2021_demo/).



## Run Bots

Every bot can be controlled via cli.

Run following command to show bot help:

```
node .\path\to\bot.js --help
```

Helps for spatial bot:

```
Commands:
  spatial-bot.js run  Bot query SOURCE, transform results and save extracted
                      data to OUT

Options:
      --version  Show version number                                   [boolean]
  -s, --source   The source of a KG. Remote source or local file accepted
                                                             [string] [required]
  -t, --type     Source type. []
    [string] [required] [choices: "sparql", "file", "hypermedia", "rdfjsSource",
                                                       "hdtFile", "ostrichFile"]
  -o, --out      The file where output extracted data        [string] [required]
  -v, --log      verbose log in the console           [boolean] [default: false]
  -h, --help     Show help                                             [boolean]
```



An example to extract spatial annotations from polifonia knowledge graph and save them to data-out folder.

```
node .\build\bot\spatial-bot.js run --source "https://raw.githubusercontent.com/polifonia-project/sonar2021_demo/datasets/polifonia_places_etl/kg/versions/polifonia-kg-places-0.0.1.ttl" --type "file" -out "./data-out/example.json" --log
```


## Installation

To install dependencies run

```
$ npm install
```

## Build
Source code run 

```
$npm run build
```

## Sparql ETL

You can extract SPARQL data with `SparqlETL`. `SparqlETL` takes care of query RDF source and transform bindings in a raw json object.

```js
import 'reflect-metadata';
import { Container } from 'typedi';
import { SparqlETL } from "./etl/SparqlETL"

// typedi container is available to resolve dependency
const sparqlETL = Container.get(SparqlETL)

// SPARQL sources
const sources = [{
    type: SourceEnum.File,
    value: "https://raw.githubusercontent.com/polifonia-project/sonar2021_demo/develop/src/assets/data/data_v2.jsonld"
}]

const query = "SELECT ?s ?p ?o WHERE {?s ?p ?o }"

sparqlETL.run({
   query: query,
   sources: sources
}).then((results) => {
    console.log(results)
})

/*
Output: [
 {
   s: ...,
   p: ...,
   o: ...
 }
  ...
]
*/
```
