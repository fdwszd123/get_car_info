const ora = require("ora");
const colorOutput = require("./colorOutput");

class Spinner {
  constructor() {
    this.spinner = ora();
    this.loadHandler = null;
  }
  succeed(str) {
    this.spinner.succeed(colorOutput.green(str));
  }
  fail(str) {
    this.spinner.fail(colorOutput.red(str));
  }
  warn(str) {
    this.spinner.warn(colorOutput.yellow(str));
  }
  startLoading(str) {
    this.loadHandler = ora(str).start();
  }
  /**
   *
   * @param {boolean} flag true成功，error失败
   * @param {*} str
   */
  stopLoading(flag, str) {
    this.loadHandler.stop();
    if (flag) {
      this.loadHandler.succeed(colorOutput.green(str));
    } else {
      this.loadHandler.fail(colorOutput.red(str));
    }
    this.loadHandler = null;
  }
}

module.exports = new Spinner();
