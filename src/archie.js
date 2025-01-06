const archieml = require('archieml');
const md = require('markdown-it')({ html: true });
const BaseTask = require('./base.js');

module.exports = class Archie extends BaseTask {
  constructor (opts) {
    super(opts);

    this.key = this.keys.archie;

    // Default Google Doc ID is that listed
    // in package.json. An ID can also be
    // passed as an option to use a different
    // document.
    this.id = this.opts.id || this.pkg.archie;
    if (!this.id) {
      throw new Error('No archie file ID found in package.json');
    }
    // Data is stored in src/data/archie.json
    // by default. A different filename
    // can be passed as an option.
    this.filename = this.opts.filename || `${this.cwd}/src/data/archie.json`;
  }

  run () {
    return this.exportFromDrive(this.id)
      .then((response) => {
        const tabs = response.data.tabs;

        return tabs.map(tab => {
          const title = tab.tabProperties.title;
          const id = tab.tabProperties.tabId;
          const tabContent = tab.documentTab.body.content;
          const text = tabContent.map(d => {
            const paragraph = d.paragraph;
            const text = paragraph?.elements.map(x => {
              const textRun = x.textRun;
              if (!textRun) return '';
              const textContent = x.textRun.content;
              const textStyle = x.textRun.textStyle;
              // TODO: determine here if we want any styles to map to html coding automatically
              if (textStyle?.bold) return `<strong>${textContent}</strong>`;
              return textContent;
            }).filter(x => x).join("");
            return `${paragraph?.bullet ? '* ' : ''}${text}`;
          })
          .filter(d => d).join("");
          return { title, id, archie: this.process(text) }
        })
      })
      .then((processed) => this.saveJson(processed, this.filename))
      .catch((err) => {
        throw (err);
      });
  }

  /*
   * Parse the contents of the Google Doc
   * using Markdown and ArchieML.
   */
  process (content) {
    const pattern = /\+([\w-_]+):([\s\S]*?)\s*:end/g;
    const extras = {};
    const res = content.replace(pattern, (match, name, contents) => {
      extras[name] = md.render(contents);
      return '';
    });
    const json = Object.assign(this.markdownify(archieml.load(res)), extras);
    return json;
  }

  markdownify (s) {
    if (typeof s === 'string') {
      return md.renderInline(s).trim();
    }

    Object.keys(s).forEach((k) => {
      s[k] = this.markdownify(s[k]);
    });
    return s;
  }
};
