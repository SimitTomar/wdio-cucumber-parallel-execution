"use strict";

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var fs = require('fs');
var Gherkin = require("gherkin");
var glob = require("glob");
var parser = new (require("cucumber-tag-expressions").TagExpressionParser)();
var path = require("path");
var _ = require("lodash");
var chalk = require('chalk');

var featureFileSplitter = function featureFileSplitter() {

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
        var _this = this;

        try {

            if (!options.sourceSpecDirectory) {
                throw new Error("Features paths are not defined");
            }
            if (!options.tmpSpecDirectory) {
                throw new Error("Output dir path is not defined");
            }
            options.tagExpression = options.tagExpression || "";
            options.lang = options.lang || "en";

            var filePaths = [];
            if (options.ff == undefined) {
                filePaths = glob.sync(options.sourceSpecDirectory + "/*.feature");
            } else {
                var featureFile = options.sourceSpecDirectory + "/" + options.ff + ".feature";
                filePaths.push(featureFile);
            }

            var featureTexts = this.readFiles(filePaths);
            var asts = this.parseGherkinFiles(featureTexts, options.lang);
            var i = 1;
            var fileSequence = 0;
            var scenariosWithTagFound = false;
            asts.forEach(function (ast) {
                if (ast.feature != undefined || ast.feature != null) {
                    var featureTemplate = _this.getFeatureTemplate(ast);
                    var features = _this.splitFeature(ast.feature.children, featureTemplate);
                    var filteredFeatures = _this.filterFeaturesByTag(features, options.tagExpression);
                    if (filteredFeatures.length > 0) {
                        scenariosWithTagFound = true;
                    }
                    filteredFeatures.forEach(function (splitFeature) {
                        var splitFilePath = filePaths[fileSequence].split("/");
                        var parentFileName = splitFilePath[splitFilePath.length - 1];
                        parentFileName = parentFileName.replace(".feature", "_");
                        var fileName = parentFileName + i + '.feature';
                        i++;
                        fs.writeFileSync(path.resolve(options.tmpSpecDirectory + "/" + fileName), _this.writeFeature(splitFeature.feature), "utf8");
                    });
                    fileSequence++;
                }
            });

            if (scenariosWithTagFound == false) {
                console.log(chalk.bold.hex('#7D18FF')("No Feature File found for tha Tag Expression: " + options.tagExpression));
            }
        } catch (e) {
            console.log('Error: ', e);
        }
    };

    /**
     * Read file content by provided paths
     * @private
     * @param filePaths
     * @return {Array}
     */
    this.readFiles = function (filePaths) {
        try {
            return filePaths.map(function (filePath) {
                return fs.readFileSync(filePath, "utf8");
            });
        } catch (e) {
            console.log('Error: ', e);
        }
    };

    /**
     * Parse gherkin files to ASTs
     * @private
     * @param features - features to parse
     * @param lang - language to parse
     * @return {Array}
     */
    this.parseGherkinFiles = function (features, lang) {
        try {
            var _parser = new Gherkin.Parser();
            var matcher = new Gherkin.TokenMatcher(lang);

            return features.map(function (feature) {
                var scanner = new Gherkin.TokenScanner(feature);
                return _parser.parse(scanner, matcher);
            });
        } catch (e) {
            console.log('Error: ', e);
        }
    };

    /**
     * Get feature template for splitting
     * @private
     * @param feature
     * @return {*}
     */
    this.getFeatureTemplate = function (feature) {
        try {
            var featureTemplate = _.cloneDeep(feature);
            featureTemplate.feature.children = featureTemplate.feature.children.filter(function (scenario) {
                return scenario.type === "Background";
            });
            return featureTemplate;
        } catch (e) {
            console.log('Error: ', e);
        }
    };

    /**
     * Split feature
     * @param {Array} scenarios - list of scenarios
     * @param {Object} featureTemplate - template of feature
     * @return {Array} - list of features
     * @private
     */
    this.splitFeature = function (scenarios, featureTemplate) {

        try {
            var scenarioOutline = scenarios.filter(function (scenario) {
                return scenario.type !== "Background";
            }).map(function (scenario) {
                if (scenario.type === "ScenarioOutline") {
                    var scenarioTemplate = _.cloneDeep(scenario);
                    if (scenario.examples[0] == undefined || scenario.examples[0] == null) {
                        console.log("Gherkin syntax error : Missing examples for Scenario Outline :", scenario.name);
                        process.exit(0);
                    }
                    return scenario.examples[0].tableBody.map(function (row) {
                        var modifiedScenario = _.cloneDeep(scenarioTemplate);
                        modifiedScenario.examples[0].tableBody = [row];
                        return modifiedScenario;
                    });
                } else return scenario;
            });

            return _.flatten(scenarioOutline).map(function (scenario) {
                var feature = _.cloneDeep(featureTemplate);
                var updatedScenario = _.cloneDeep(scenario);
                updatedScenario.tags = [].concat(_toConsumableArray(scenario.tags)).concat(featureTemplate.feature.tags);
                feature.feature.children.push(updatedScenario);
                return feature;
            });
        } catch (e) {
            console.log('Error: ', e);
        }
    };

    /**
     * Write features to files
     * @param feature
     * @return {string}
     * @private
     */
    this.writeFeature = function (feature) {
        try {
            var LINE_DELIMITER = "\n";

            var featureString = "";

            if (feature.tags) {
                feature.tags.forEach(function (tag) {
                    featureString += "" + tag.name + LINE_DELIMITER;
                });
            }
            featureString += feature.type + ": " + feature.name + LINE_DELIMITER;

            feature.children.forEach(function (scenario) {
                if (scenario.tags) {
                    scenario.tags.forEach(function (tag) {
                        featureString += "" + tag.name + LINE_DELIMITER;
                    });
                }
                featureString += scenario.keyword + ": " + scenario.name + LINE_DELIMITER;
                scenario.steps.forEach(function (step) {
                    if (step.argument != undefined) {
                        featureString += "" + step.keyword + step.text + LINE_DELIMITER;
                        if (step.argument.type === 'DataTable') {
                            step.argument.rows.forEach(function (row) {
                                var cellData = '|';
                                row.cells.forEach(function (cell) {
                                    cellData += cell.value + '|';
                                });
                                featureString += "" + cellData + LINE_DELIMITER;
                            });
                        }
                        if (step.argument.type === 'DocString') {
                            featureString += "\"\"\"" + ("" + LINE_DELIMITER) + step.argument.content + ("" + LINE_DELIMITER) + "\"\"\"" + ("" + LINE_DELIMITER);
                        }
                    } else {
                        featureString += "" + step.keyword + step.text + LINE_DELIMITER;
                    }
                });

                if (scenario.examples) {
                    var example = scenario.examples[0];
                    featureString += "Examples:" + LINE_DELIMITER;
                    featureString += "|" + example.tableHeader.cells.map(function (cell) {
                        return cell.value + "|";
                    }).join("") + LINE_DELIMITER;
                    example.tableBody.forEach(function (tableRow) {
                        featureString += "|" + tableRow.cells.map(function (cell) {
                            return cell.value + "|";
                        }).join("") + LINE_DELIMITER;
                    });
                }
            });

            return featureString;
        } catch (e) {
            console.log('Error: ', e);
        }
    };

    /**
     * Filter features by tag expression
     * @param features
     * @param tagExpression
     * @return {Array}
     * @private
     */
    this.filterFeaturesByTag = function (features, tagExpression) {
        try {
            var expressionNode = parser.parse(tagExpression);
            return features.filter(function (feature) {
                return feature.feature.children.some(function (scenario) {
                    if (scenario.tags) {
                        return expressionNode.evaluate(scenario.tags.map(function (tag) {
                            return tag.name;
                        }));
                    }
                });
            });
        } catch (e) {
            console.log('Error: ', e);
        }
    };
};

module.exports = featureFileSplitter;