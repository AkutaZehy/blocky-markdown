// Loads a class from the framework-free source files for testing.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function loadClass (relativePath, className) {
    const src = fs.readFileSync(
        path.join(__dirname, '..', '..', relativePath),
        'utf8'
    );
    return new Function(`${src}; return ${className};`)();
}

module.exports = { loadClass };
