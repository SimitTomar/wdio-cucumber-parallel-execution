const fs_extra = require('fs-extra');
const featureFileSplitter = require('./featureFileSplitter');
const tmpFeatureFiles = new featureFileSplitter;


let setup = function () {

    /**
     * Compile and create splitted files
     * @param {string} options.sourceSpecDirectory - glob expression for sourceSpecDirectory
     * @param {string} options.tmpSpecDirectory - Path to temp folder containing the Temporary Feature Files
     * @param {string} options.parallelExecutionReportDirectory - Path to Parallel Execution Report Directory where all the Reports will be saved 
     * @param {string} [options.tagExpression] - Tag expression to parse
     * @param {string} [options.ff] - Feature File Name to parse
     * @param {string} [options.lang] - Language of sourceSpecDirectory
     *
     * @return {Promise<void>}
     */

    this.performSetup = function (options) {

        try {
            //Remove Tmp Spec  Directory & Create One
            fs_extra.removeSync(options.tmpSpecDirectory);
            fs_extra.ensureDirSync(options.tmpSpecDirectory);

            //Remove JSON Tmp Report Directory & Create One
            fs_extra.removeSync(`${options.parallelExecutionReportDirectory}/jsonTmpReports`);
            fs_extra.ensureDirSync(`${options.parallelExecutionReportDirectory}/jsonTmpReports`);

            //Compile and Create Split Feature Files
            tmpFeatureFiles.compile({
                sourceSpecDirectory: options.sourceSpecDirectory,
                tmpSpecDirectory: options.tmpSpecDirectory,
                tagExpression: options.tagExpression,
                ff: options.ff,
                lang: options.lang
            });
        } catch (e) {
            console.log('Error: ', e);
        }
    }
}

module.exports = setup;