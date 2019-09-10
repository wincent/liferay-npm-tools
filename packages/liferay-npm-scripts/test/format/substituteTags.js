/**
 * © 2019 Liferay, Inc. <https://liferay.com>
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

const substituteTags = require('../../src/format/substituteTags');
const dedent = require('../../support/dedent');
const getFixture = require('../../support/getFixture');

describe('substituteTags()', () => {
	it('turns EL syntax (${}) into identifier placeholders', () => {
		const [transformed, tags] = substituteTags('alert(${expr1}, ${expr2})');

		expect(transformed).toEqual('alert(ʾEL_0__ʿ, ʾEL_1__ʿ)');

		expect(tags).toEqual(['${expr1}', '${expr2}']);
	});

	it('leaves escaped EL syntax (${}) untouched', () => {
		const [transformed, tags] = substituteTags(
			'alert("\\${expr1}, \\${expr2}")'
		);

		expect(transformed).toEqual('alert("\\${expr1}, \\${expr2}")');

		expect(tags).toEqual([]);
	});

	it('turns EL syntax (#{}) into identifier placeholders', () => {
		const [transformed, tags] = substituteTags('alert(#{expr1}, #{expr2})');

		expect(transformed).toEqual('alert(ʾEL_0__ʿ, ʾEL_1__ʿ)');

		expect(tags).toEqual(['#{expr1}', '#{expr2}']);
	});

	it('leaves escaped EL syntax (#{}) untouched', () => {
		const [transformed, tags] = substituteTags(
			'alert("\\#{expr1}, \\#{expr2}")'
		);

		expect(transformed).toEqual('alert("\\#{expr1}, \\#{expr2}")');

		expect(tags).toEqual([]);
	});

	it('turns JSP expressions (<%= ... %>) into identifier placeholders', () => {
		const [transformed, tags] = substituteTags(dedent(3)`
			function create() {
				A.Node.create(
					'<div class="alert"><%= SomeUtil("abc") %></div>'
				);
			}
		`);

		expect(transformed).toEqual(dedent(3)`
			function create() {
				A.Node.create(
					'<div class="alert">ʾJSP_EXPR____________ʿ</div>'
				);
			}
		`);

		expect(tags).toEqual(['<%= SomeUtil("abc") %>']);
	});

	it('turns JSP directives (<%@ ... %>) into comments', () => {
		const [transformed, tags] = substituteTags(dedent(3)`
			<%@ include file="/other.jsp" %>

			var count = 0;
		`);

		expect(transformed).toEqual(dedent(3)`
			/*╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳*/

			var count = 0;
		`);

		expect(tags).toEqual(['<%@ include file="/other.jsp" %>']);
	});

	it('turns single-line JSP scriplets (<% ... %>) into comments', () => {
		const [transformed, tags] = substituteTags(dedent(3)`
			<% FooThing myFoo = new FooThing(); %>

			var description = "<%= myFoo.body() %>";
		`);

		expect(transformed).toEqual(dedent(3)`
			/*╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳*/

			var description = "ʾJSP_EXPR_________ʿ";
		`);

		expect(tags).toEqual([
			'<% FooThing myFoo = new FooThing(); %>',
			'<%= myFoo.body() %>'
		]);
	});

	it('turns multi-line JSP scriplets (<% ... %>) into comments', () => {
		const [transformed, tags] = substituteTags(dedent(3)`
			<%
			if (Liferay.isThing()) {
			%>

			var description = "<%= myFoo.body() %>";

			<%
			}
			%>
		`);

		// TODO: beware inserting multiline comments in places where they can't
		// legitimately go (for example, inside a string); although that might
		// be edge-casey enough that it doesn't matter in practice.
		expect(transformed).toEqual(dedent(3)`
			/*
			╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳
			*/

			var description = "ʾJSP_EXPR_________ʿ";

			/*
			╳
			*/
		`);

		expect(tags).toEqual([
			dedent(3)`<%
			if (Liferay.isThing()) {
			%>`,
			'<%= myFoo.body() %>',
			dedent(3)`<%
			}
			%>`
		]);
		// TODO deal with c:if etc, which would ideally produce `if` blocks etc
	});

	it('turns <portlet:namespace /> tags into identifiers', () => {
		const [transformed, tags] = substituteTags(dedent(3)`
			var calendarList = window.<portlet:namespace />calendarLists[calendarResourceId];
		`);

		expect(transformed).toEqual(dedent(3)`
			var calendarList = window.ʾPORTLET_NAMESPACE__ʿcalendarLists[calendarResourceId];
		`);

		expect(tags).toEqual(['<portlet:namespace />']);
	});

	it('turns JSP tags into comments and conditionals', () => {
		const [transformed, tags] = substituteTags(dedent(3)`
			<some:tag attr="1" />

			<other:tag
				multiline="true"
				self-closing="true"
			/>

			<this:tag>
				alert('done');
			</this:tag>

			<multi:line
				opening="1"
			>
				var x = 1;
			</multi:line>
		`);

		expect(transformed).toEqual(dedent(3)`
			/*╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳*/

			/*╳╳╳╳╳╳╳╳
				╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳
				╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳╳
			*/

			if (ʃʃʃ) {
				alert('done');
			}/*ʅʅʅʅʅʅ*/

			if (ʃʃʃʃ) {
				/*ʃʃʃʃʃʃʃʃʃʃʃ
			ʃ*/
				var x = 1;
			}/*ʅʅʅʅʅʅʅʅ*/
		`);

		expect(tags).toEqual([
			'<some:tag attr="1" />',
			'<other:tag\n' +
				'\tmultiline="true"\n' +
				'\tself-closing="true"\n' +
				'/>',
			'<this:tag>',
			'</this:tag>',
			'<multi:line\n' + '\topening="1"\n' + '>',
			'</multi:line>'
		]);
	});

	it('substitutes in the "configuration.jsp" fixture', async () => {
		const source = await getFixture('format/configuration.jsp');

		expect(substituteTags(source)).toMatchSnapshot();
	});

	it('substitutes in a the "edit_template_display.jspf" fixture', async () => {
		const source = await getFixture('format/edit_template_display.jspf');

		expect(substituteTags(source)).toMatchSnapshot();
	});

	// Disabled because currently choking on JSP expression inside a custom tag
	// attribute.
	it.skip('substitutes in a the "page.jsp" fixture', async () => {
		const source = await getFixture('format/page.jsp');

		expect(substituteTags(source)).toMatchSnapshot();
	});

	it('substitutes in a the "view_calendar_menus.jspf" fixture', async () => {
		const source = await getFixture('format/view_calendar_menus.jspf');

		expect(substituteTags(source)).toMatchSnapshot();
	});
});
