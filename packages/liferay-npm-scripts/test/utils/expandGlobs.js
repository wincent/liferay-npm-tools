/**
 * © 2019 Liferay, Inc. <https://liferay.com>
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const expandGlobs = require('../../src/utils/expandGlobs');
const preprocessGlob = require('../../src/utils/preprocessGlob');

const FIXTURES = `
	.eslintrc.js
	.prettierrc.js
	apps/app-builder/app-builder-web/.eslintrc.js
	apps/change-tracking/change-tracking-change-lists-configuration-web/src/main/resources/META-INF/resources/css/main.scss
	apps/change-tracking/change-tracking-change-lists-indicator-web/src/main/resources/META-INF/resources/js/ChangeListsIndicator.es.js
	apps/document-library/document-library-preview-image/src/main/resources/META-INF/resources/preview/css/main.scss
	apps/document-library/document-library-web/build/npm/npmRunBuild/outputs/META-INF/resources/document_library/js/main.js
	apps/document-library/document-library-web/classes/META-INF/resources/node_modules/document-library-web$uuid@3.3.2/lib/v35.js
	apps/fragment/fragment-demo-data-creator-impl/src/main/resources/com/liferay/fragment/demo/data/creator/internal/dependencies/fragment1/demo.js
	apps/fragment/fragment-test/src/testIntegration/resources/com/liferay/fragment/dependencies/fragments/fragments/card/index.js
	apps/frontend-css/frontend-css-web/classes/META-INF/resources/taglib/_header.scss
	apps/frontend-css/frontend-css-web/src/main/resources/META-INF/resources/main.scss
	apps/frontend-js/frontend-js-web/src/main/resources/META-INF/resources/misc/swfobject.js
	apps/frontend-theme-porygon/frontend-theme-porygon/build/css/_clay_custom.scss
	apps/frontend-theme-porygon/frontend-theme-porygon/build/css/clay/components/_input-groups.scss
	apps/journal/journal-web/build/npm/npmRunBuild/outputs/META-INF/resources/js/DDMTemplatesManagementToolbarDefaultEventHandler.es.js
	apps/journal/journal-web/classes/META-INF/resources/node_modules/journal-web$lodash.escape@4.0.1/index.js
	apps/journal/journal-web/src/main/resources/META-INF/resources/js/DDMStructuresManagementToolbarDefaultEventHandler.es.js
	apps/layout/layout-content-page-editor-web/src/main/resources/META-INF/resources/js/actions/updateRowColumnsNumber.es.js
	apps/portal-portlet-bridge/portal-portlet-bridge-soy-impl/src/test/resources/com/liferay/portal/portlet/bridge/soy/internal/dependencies/ES6Command.es.js
	node_modules/domain-browser/.eslintrc.js
	node_modules/pako/lib/zlib/gzheader.js
	node_modules/worker-farm/lib/farm.js
	npmscripts.config.js
	sdk/gradle-plugins-theme-builder/src/gradleTest/classic/src/main/webapp/css/liferay-font-awesome/scss/_path-alloy.scss
	util/portal-tools-soy-builder/src/test/resources/com/liferay/portal/tools/soy/builder/commands/dependencies/build_soy/expected/hello_world.soy.js
	util/sass-compiler-jni/src/test/resources/com/liferay/sass/compiler/jni/internal/dependencies/sass-spec/35_varargs_false/input.scss
`
	.trim()
	.split(/\s+/);

const PORTAL_GLOBS = [
	'/*.js',
	'/.*.js',
	'/apps/*/*/*.js',
	'/apps/*/*/.*.js',
	'/apps/*/*/{src,test}/**/*.es.js',
	'/apps/*/*/{src,test}/**/*.js',
	'/apps/*/*/{src,test}/**/*.scss'
].reduce((acc, glob) => acc.concat(preprocessGlob(glob)), []);

const PORTAL_IGNORE_GLOBS = [
	'*.js',
	'!*.es.js',
	'!.eslintrc.js',
	'!npmscripts.config.js',
	'!.prettierrc.js',
	'*.soy.js',
	'build/**',
	'classes/**',
	'css/clay/**',
	'node_modules/**',
	'zippableResources/**',
	'sdk/**',
	'/copyright.js',
	'apps/portal-portlet-bridge/portal-portlet-bridge-soy-impl/src/test/resources/com/liferay/portal/portlet/bridge/soy/internal/dependencies/**/*.js',
	'apps/fragment/fragment-demo-data-creator-impl/src/main/resources/com/liferay/fragment/demo/data/creator/internal/dependencies/**/*.js',
	'apps/fragment/fragment-test/src/testIntegration/resources/com/liferay/fragment/dependencies/**/*.js',
	'/yarn-*.js'
];

describe('expandGlobs()', () => {
	let cwd;

	beforeAll(() => {
		cwd = process.cwd();

		const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scripts-'));
		process.chdir(directory);

		FIXTURES.forEach(fixture => {
			const dirname = path.dirname(fixture);

			fs.mkdirSync(dirname, {recursive: true});

			fs.writeSync(fs.openSync(fixture, 'w'), '');
		});
	});

	afterAll(() => {
		process.chdir(cwd);
	});

	it('can match all files', () => {
		const matches = expandGlobs(['*']);

		expect(matches).toEqual(FIXTURES);
	});

	it('can match a subset of files', () => {
		const matches = expandGlobs(['.eslintrc.js']);

		expect(matches).toEqual([
			'.eslintrc.js',
			'apps/app-builder/app-builder-web/.eslintrc.js',
			'node_modules/domain-browser/.eslintrc.js'
		]);
	});

	it('excludes ignored files', () => {
		const matches = expandGlobs(['*'], ['sdk/**']);

		const filtered = FIXTURES.filter(entry => !entry.startsWith('sdk'));

		expect(matches).toEqual(filtered);
	});

	it('respects negated ignore patterns', () => {
		const matches = expandGlobs(['*.js'], ['*.js', '!*.es.js']);

		const filtered = FIXTURES.filter(entry => entry.endsWith('.es.js'));

		expect(matches).toEqual(filtered);
	});

	it('treats negated match patterns as non-negated ignores', () => {
		const matches = expandGlobs(['*.js', '!*.js'], ['!*.es.js']);

		const filtered = FIXTURES.filter(entry => entry.endsWith('.es.js'));

		expect(matches).toEqual(filtered);
	});

	it('handles complex arrays of globs and negations', () => {
		const matches = expandGlobs(PORTAL_GLOBS, PORTAL_IGNORE_GLOBS);

		expect(matches).toEqual([
			'.eslintrc.js',
			'.prettierrc.js',
			'apps/app-builder/app-builder-web/.eslintrc.js',
			'apps/change-tracking/change-tracking-change-lists-configuration-web/src/main/resources/META-INF/resources/css/main.scss',
			'apps/change-tracking/change-tracking-change-lists-indicator-web/src/main/resources/META-INF/resources/js/ChangeListsIndicator.es.js',
			'apps/document-library/document-library-preview-image/src/main/resources/META-INF/resources/preview/css/main.scss',
			'apps/frontend-css/frontend-css-web/src/main/resources/META-INF/resources/main.scss',
			'apps/journal/journal-web/src/main/resources/META-INF/resources/js/DDMStructuresManagementToolbarDefaultEventHandler.es.js',
			'apps/layout/layout-content-page-editor-web/src/main/resources/META-INF/resources/js/actions/updateRowColumnsNumber.es.js',
			'npmscripts.config.js'
		]);
	});
});
