/**
 * © 2019 Liferay, Inc. <https://liferay.com>
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

const fs = require('fs');
const path = require('path');
const getRegExpForGlob = require('./getRegExpForGlob');

/**
 * Given a list of glob patterns and a list of ignore patterns, returns a list
 * of matching files, searching in the current dirctory.
 */
function expandGlobs(matchGlobs, ignoreGlobs = []) {
	const ignorers = [];
	const matchers = matchGlobs.map(getRegExpForGlob);
	const results = [];

	// If any matchers are negated, move them into the "ignores" list.
	for (let i = matchers.length - 1; i >= 0; i--) {
		if (matchers[i].negated) {
			// Make a copy of the regular expression without the "negated" flag.
			ignorers.unshift(getRegExpForGlob(matchGlobs[i].slice(1)));
		}
	}

	// Make note of index of the last negation. (If a file has been
	// ignored, we can stop testing it as soon as we get past the last
	// negation.)
	let lastNegationIndex = 0;

	ignorers.push(
		...ignoreGlobs.map((glob, index) => {
			const regExp = getRegExpForGlob(glob);

			if (regExp.negated) {
				lastNegationIndex = ignorers.length + index;
			}

			return regExp;
		})
	);

	// As a special case, if we see an ignore glob like "a/b/c/**" past the
	// lastNegationIndex we can short-circuit.
	const prunable = new Map();

	for (let i = lastNegationIndex; i < ignorers.length; i++) {
		const glob = ignorers[i].glob;

		const match = glob.match(/^([^!*]+)\/\*\*$/);

		if (match) {
			const components = match[1].split('/');

			// For fast lookup later on, given "a/b/c", produce this trie:
			//
			//     c -> b -> a -> true
			//
			let current = prunable;

			for (let j = components.length - 1; j >= 0; j--) {
				const component = components[j];

				if (!current.has(component)) {
					if (j) {
						current.set(component, new Map());
					} else {
						// Mark the root with "true".
						current.set(component, true);
					}
				}
				current = current.get(component);
			}
		}
	}

	function traverse(directory) {
		const entries = fs.readdirSync(directory);
		entries.forEach(entry => {
			const file = path.join(directory, entry);

			// Check trie to see whether entire subtree can be pruned.
			let trie = prunable;
			let current = file;

			while (current !== '.') {
				trie = trie.get(path.basename(current));

				if (trie === true) {
					return;
				} else if (!trie) {
					break;
				}

				current = path.dirname(current);
			}

			let ignored = false;

			for (let i = 0; i < ignorers.length; i++) {
				const ignorer = ignorers[i];

				if (ignored ^ ignorer.negated) {
					// File is ignored, but ignorer is not a negation;
					// or file is not ignored, and ignorer is a negation.
					continue;
				}

				if (ignorer.test(file)) {
					if (ignorer.negated) {
						// File got unignored.
						ignored = false;
					} else {
						// File is provisionally ignored, for now.
						ignored = true;
					}
				}

				if (ignored && i >= lastNegationIndex) {
					// File got definitively ignored.
					return;
				}
			}

			const stat = fs.statSync(file);

			if (stat.isDirectory()) {
				traverse(file);
			} else if (matchers.some(matcher => matcher.test(file))) {
				results.push(file);
			}
		});
	}

	traverse('.');

	return results;
}

module.exports = expandGlobs;
