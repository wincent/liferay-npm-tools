/**
 * © 2019 Liferay, Inc. <https://liferay.com>
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

const fs = require('fs');
const path = require('path');
const filterGlobs = require('../utils/filterGlobs');
const getMergedConfig = require('../utils/getMergedConfig');
const log = require('../utils/log');
const spawnSync = require('../utils/spawnSync');

const DEFAULT_OPTIONS = {
	check: false
};

/**
 * File extensions that we want Prettier to process.
 */
const EXTENSIONS = ['.js', '.scss'];

/**
 * Prettier wrapper.
 */
function format(options = {}) {
	const {check} = {
		...DEFAULT_OPTIONS,
		...options
	};

	const config = check
		? getMergedConfig('npmscripts', 'check')
		: getMergedConfig('npmscripts', 'fix');

	const globs = filterGlobs(config, ...EXTENSIONS);

	if (!globs.length) {
		const extensions = EXTENSIONS.join(', ');

		log(
			`No globs applicable to ${extensions} files specified: globs can be configured via npmscripts.config.js`
		);

		return;
	}

	console.log('testing');
	const preprocessGlob = require('../utils/preprocessGlob');
	const expandGlobs = require('../utils/expandGlobs');
	const IGNORES = require('../utils/readIgnoreFile')('.prettierignore');
	// have to add node_modules because prettier does tt by default
	IGNORES.unshift('node_modules/**');
	console.log(IGNORES);
	const g = [];
	console.log('preproc');
	globs.forEach(gl => g.push(...preprocessGlob(gl)));
	console.log(g);
	const start = Date.now();
	const results = expandGlobs(g, IGNORES);
	console.log('got', results.length, 'in', Date.now() - start, 'ms');
	// got 1442 in 2230 ms
	// visited count 81907
	// without pruning:
	// got 1442 in 2117 ms (high variance between runs)
	// visited count 80215

	const prettier = require('prettier');
	const opts = getMergedConfig('prettier');
	console.log('opts', opts);
	// fuller test...
	const ok = results.map(r => {
		// console.log(r);
		try {
			return prettier.check(fs.readFileSync(r).toString(), {...opts, filepath: r})
		} catch (e) {
			console.log('caught');
			return false
		}
	});
	console.log('at end', Date.now() - start, ok.filter(Boolean).length);
	// got 35k files... in 3771ms --- nope, needed to ignore node_modules
	// checked them in: about 35s, claims 1407 good out of 1473 checked
	// some may be syntax erros (the catch)... there were 3 of those
	return;

	const CONFIG_PATH = path.join(process.cwd(), 'TEMP-prettier-config.json');

	fs.writeFileSync(CONFIG_PATH, JSON.stringify(getMergedConfig('prettier')));

	try {
		const args = [
			'--config',
			CONFIG_PATH,
			check ? '--check' : '--write',
			...globs
		];

		spawnSync('prettier', args);
	} finally {
		fs.unlinkSync(CONFIG_PATH);
	}
}

module.exports = format;
