const dir = require('node-dir');
const fs = require('fs-extra');
const chalk = require('chalk');

let jsonConsolidatedData = function () {

    /**
     * Get Consolidated JSON Report Array
     * @param {string} options.parallelExecutionReportDirectory - Path to Parallel Execution Report Directory where all the Reports will be saved
     * @return {Array}
     */
    this.getConsolidatedArray = function (options) {

        try {

            let jsonArray = [];
            let jsonReportPaths = dir.files(`${options.parallelExecutionReportDirectory}/jsonTmpReports`, { sync: true });

            if (jsonReportPaths != null) {
                for (let value of jsonReportPaths) {
                    let content = fs.readFileSync(value, 'utf8');
                    let data = JSON.parse(content);
                    jsonArray = [...jsonArray, ...data];
                }

                let filteredArray = [];
                jsonArray.forEach((item) => {
                    var existing = filteredArray.filter((element) => {
                        return element.id == item.id;
                    });
                    if (existing.length) {
                        var existingIndex = filteredArray.indexOf(existing[0]);
                        filteredArray[existingIndex].elements = filteredArray[existingIndex].elements.concat(item.elements);
                    } else {
                        filteredArray.push(item);
                    }
                })

                return filteredArray;
            } else {
                console.log(chalk.bold.hex('#7D18FF')(`No JSON Files found in ${options.parallelExecutionReportDirectory}/jsonTmpReports`));

            }

        } catch (e) {
            console.log('Error: ', e);
        }




    }

}

module.exports = jsonConsolidatedData;