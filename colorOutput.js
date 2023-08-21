const chalk = require("chalk");
class ColorOutput {
  constructor() {}
  green(str) {
    return chalk.green(str);
  }
  red(str) {
    return chalk.red(str);
  }
  yellow(str) {
    return chalk.yellow(str);
  }
}

module.exports = new ColorOutput();
