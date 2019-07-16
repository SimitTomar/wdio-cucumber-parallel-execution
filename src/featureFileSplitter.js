const fs = require('fs');
const Gherkin = require("gherkin");
const glob = require("glob");
const parser = new (require("cucumber-tag-expressions").TagExpressionParser)();
const path = require("path");
const _ = require("lodash");
const chalk = require('chalk');


let featureFileSplitter = function () {

    /**
     * Compile and create splitted files
     * @param {string} options.sourceSpecDirectory - glob expression for sourceSpecDirectory
     * @param {string} options.tmpSpecDirectory - path to temp folder
     * @param {string} [options.tagExpression] - tag expression to parse
     * @param {string} [options.lang] - language of sourceSpecDirectory
     *
     * @return {Promise<void>}
     */
    this.compile = function (options) {
        try {


            if (!options.sourceSpecDirectory) {
                throw new Error("Features paths are not defined");
            }
            if (!options.tmpSpecDirectory) {
                throw new Error("Output dir path is not defined");
            }
            options.tagExpression = options.tagExpression || "";
            options.lang = options.lang || "en";

            let filePaths = [];
            if (options.ff == undefined) {
                filePaths = glob.sync(`${options.sourceSpecDirectory}/*.feature`);
            } else {
                const featureFile = `${options.sourceSpecDirectory}/${options.ff}.feature`;
                filePaths.push(featureFile);
            }

            const featureTexts = this.readFiles(filePaths);
            const asts = this.parseGherkinFiles(featureTexts, options.lang);
            var i = 1;
            var fileSequence = 0;
            var scenariosWithTagFound = false;
            asts.forEach(ast => {
                if(ast.feature!=undefined || ast.feature!=null){
                const featureTemplate = this.getFeatureTemplate(ast);
                const features = this.splitFeature(ast.feature.children, featureTemplate);
                const filteredFeatures = this.filterFeaturesByTag(features, options.tagExpression);
                if (filteredFeatures.length > 0) {
                    scenariosWithTagFound = true;
                }
                filteredFeatures.forEach(splitFeature => {
                    const splitFilePath = (filePaths[fileSequence]).split("/");
                    let parentFileName = splitFilePath[splitFilePath.length - 1];
                    parentFileName = parentFileName.replace(".feature", "_");
                    const fileName = parentFileName + i + '.feature';
                    i++;
                    fs.writeFileSync(path.resolve(`${options.tmpSpecDirectory}/${fileName}`), this.writeFeature(splitFeature.feature), "utf8");
                });
                fileSequence++;
            }});

            if (scenariosWithTagFound == false) {
                console.log(chalk.bold.hex('#7D18FF')(`No Feature File found for tha Tag Expression: ${options.tagExpression}`));
            }
        } catch (e) {
            console.log('Error: ', e);
        }
    }


    /**
     * Read file content by provided paths
     * @private
     * @param filePaths
     * @return {Array}
     */
    this.readFiles = function (filePaths) {
        try {
            return filePaths.map(filePath => fs.readFileSync(filePath, "utf8"))
        } catch (e) {
            console.log('Error: ', e);
        }
    }

    /**
     * Parse gherkin files to ASTs
     * @private
     * @param features - features to parse
     * @param lang - language to parse
     * @return {Array}
     */
    this.parseGherkinFiles = function (features, lang) {
        try {
            const parser = new Gherkin.Parser();
            const matcher = new Gherkin.TokenMatcher(lang);

            return features.map(feature => {
                const scanner = new Gherkin.TokenScanner(feature);
                return parser.parse(scanner, matcher)
            });
        } catch (e) {
            console.log('Error: ', e);
        }
    }

    /**
     * Get feature template for splitting
     * @private
     * @param feature
     * @return {*}
     */
    this.getFeatureTemplate = function (feature) {
        try {
            const featureTemplate = _.cloneDeep(feature);
            featureTemplate.feature.children = featureTemplate.feature.children.filter(scenario => scenario.type === "Background");
            return featureTemplate
        } catch (e) {
            console.log('Error: ', e);
        }
    }

    /**
     * Split feature
     * @param {Array} scenarios - list of scenarios
     * @param {Object} featureTemplate - template of feature
     * @return {Array} - list of features
     * @private
     */
    this.splitFeature = function (scenarios, featureTemplate) {

        try {
            const scenarioOutline = scenarios
                .filter(scenario => scenario.type !== "Background")
                .map(scenario => {
                    if (scenario.type === "ScenarioOutline") {
                        const scenarioTemplate = _.cloneDeep(scenario);
                        if(scenario.examples[0]==undefined || scenario.examples[0]==null ){
                            console.log("Gherkin syntax error : Missing examples for Scenario Outline :",scenario.name);
                            process.exit(0);
                        }
                        return scenario.examples[0].tableBody.map(row => {
                            const modifiedScenario = _.cloneDeep(scenarioTemplate);
                            modifiedScenario.examples[0].tableBody = [row];
                            return modifiedScenario;
                        })
                    } else return scenario
                });

            return _.flatten(scenarioOutline)
                .map(scenario => {
                    const feature = _.cloneDeep(featureTemplate);
                    const updatedScenario = _.cloneDeep(scenario);
                    updatedScenario.tags = [...scenario.tags].concat(featureTemplate.feature.tags);
                    feature.feature.children.push(updatedScenario);
                    return feature
                })
        } catch (e) {
            console.log('Error: ', e);
        }
    }

    /**
     * Write features to files
     * @param feature
     * @return {string}
     * @private
     */
    this.writeFeature = function (feature) {
        try {
            const LINE_DELIMITER = "\n";

            let featureString = "";

            if (feature.tags) {
                feature.tags.forEach(tag => {
                    featureString += `${tag.name}${LINE_DELIMITER}`
                });
            }
            featureString += `${feature.type}: ${feature.name}${LINE_DELIMITER}`;

            feature.children.forEach(scenario => {
                if (scenario.tags) {
                    scenario.tags.forEach(tag => {
                        featureString += `${tag.name}${LINE_DELIMITER}`
                    });
                }
                featureString += `${scenario.keyword}: ${scenario.name}${LINE_DELIMITER}`;
                scenario.steps.forEach(step => {
                    if (step.argument != undefined) {
                        featureString += `${step.keyword}${step.text}${LINE_DELIMITER}`;
                        if (step.argument.type==='DataTable'){
                            step.argument.rows.forEach(row => {
                                var cellData = '|';
                                row.cells.forEach(cell => {
                                    cellData += cell.value + '|'
                                });
                                featureString += `${cellData}${LINE_DELIMITER}`;
                            })}
                        if (step.argument.type==='DocString'){
                            featureString +=  "\"\"\"" + `${LINE_DELIMITER}` + step.argument.content + `${LINE_DELIMITER}` + "\"\"\"" + `${LINE_DELIMITER}`;

                        }
                    } else {
                        featureString += `${step.keyword}${step.text}${LINE_DELIMITER}`;
                    }
                });

                if (scenario.examples) {
                    const example = scenario.examples[0];
                    featureString += `Examples:${LINE_DELIMITER}`;
                    featureString += `|${example.tableHeader.cells.map(cell => `${cell.value}|`).join("")}${LINE_DELIMITER}`;
                    example.tableBody.forEach(tableRow => {
                        featureString += `|${tableRow.cells.map(cell => `${cell.value}|`).join("")}${LINE_DELIMITER}`;
                    })
                }
            });

            return featureString;
        } catch (e) {
            console.log('Error: ', e);
        }
    }

    /**
     * Filter features by tag expression
     * @param features
     * @param tagExpression
     * @return {Array}
     * @private
     */
    this.filterFeaturesByTag = function (features, tagExpression) {
        try {
            const expressionNode = parser.parse(tagExpression);
            return features.filter(feature => {
                return feature.feature.children.some(scenario => {
                    if (scenario.tags) {
                        return expressionNode.evaluate(scenario.tags.map(tag => tag.name))
                    }
                })
            });
        } catch (e) {
            console.log('Error: ', e);
        }
    }

}


module.exports = featureFileSplitter;
