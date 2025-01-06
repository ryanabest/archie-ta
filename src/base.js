const fs = require('fs');
const path = require('path');
const process = require('process');
const google = require('googleapis').google;

module.exports = class BaseTask {
  constructor (opts, ...args) {
    this.opts = opts;
    this.cwd = this.getDir();
    this.keys = this.loadKeys();
    this.pkg = this.loadPkg();
  }

  /*
   * Load the project's package file
   * from its base directory.
   */
  loadPkg () {
    const path = `${this.cwd}/package.json`;
    if (!fs.existsSync(path)) {
      throw new Error('Missing package.json file.');
    }
    return require(path);
  }

  /*
   * Load the project's keys file from
   * its base directory.
   */
  loadKeys () {
    const path = `${this.cwd}/keys.json`;
    if (!fs.existsSync(path)) {
      throw new Error('Missing keys.json file. See https://github.com/fivethirtyeight/docs/wiki/Setting-up-our-tech-stack#credentials');
    }
    return require(path);
  }

  /*
   * Get base directory of the project this
   * is being run in. This traverses directories
   * in reverse, looking for a package.json file.
   * Once the file is found, we assume the
   * directory holding it is the base directory.
   */
  getDir () {
    const maxDirs = 5; // Maximum directories to check
    let cwd = process.cwd();
    for (let i = 0; i < maxDirs; i++) {
      if (fs.existsSync(path.join(cwd, 'package.json'))) {
        break;
      }
      cwd = path.resolve(path.dirname(cwd));
    }
    return cwd;
  }

  /*
   * Get the contents of the Google Drive
   * file using the Google Drive API.
   */
  exportFromDrive (id) {
    const drive = google.drive('v3');
    const scope = ['https://www.googleapis.com/auth/drive'];
    const jwtClient = new google.auth.JWT(this.keys.archie.client_email, null, this.keys.archie.private_key, scope, null);
    return jwtClient.authorize()
      .then(() => {
        const docs = google.docs({ version: 'v1', auth: jwtClient });
        return docs.documents.get({
          documentId: id,
          includeTabsContent: true
        });
      });
  }

  saveJson (data, filename) {
    return fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  }
};
