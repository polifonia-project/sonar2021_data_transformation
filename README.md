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
spatial-bot.js <command>

Commands:
  spatial-bot.js run  Bot extract data from SOURCE with given QUERY or FILE,
                      transform results and save extracted data to OUT (default
                      OUT stdin)

Options:
      --version  Show version number                                   [boolean]
  -s, --source   The source of a KG. Remote source or local file accepted
                                                             [string] [required]
  -t, --type     Source type. []
    [string] [required] [choices: "sparql", "file", "hypermedia", "rdfjsSource",
                                                       "hdtFile", "ostrichFile"]
  -o, --out      The file where output extracted data. If no file specified
                 output to stdin                                        [string]
  -f, --file     The file with query to extract annotations. One of file or
                 query option must be specified                         [string]
  -q, --query    String with a query to extract annotations. One of file or
                 query option must be specified. This option has priority over
                 file                                                   [string]
  -v, --log      verbose log in the console            [boolean] [default: true]
  -h, --help     Show help                                             [boolean]
```



An example to extract spatial annotations from polifonia knowledge graph and save them to data-out folder.

on \*nix:
```
node ./build/bot/spatial-bot.js run --source "https://raw.githubusercontent.com/polifonia-project/KG_data_transformation/feature/short-dev-file/polifonia_places_etl/kg/versions/polifonia-kg-places-0.0.2b-limit.ttl" --type "file" --file "./queries/spatial-annotations.sparql" --out "./data-out/example.json" --log
```

on windows:
```
node .\build\bot\spatial-bot.js run --source "https://raw.githubusercontent.com/polifonia-project/KG_data_transformation/feature/short-dev-file/polifonia_places_etl/kg/versions/polifonia-kg-places-0.0.2b-limit.ttl" --type "file" --file ".\queries\spatial-annotations.sparql" --out "./data-out/example.json" --log
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
