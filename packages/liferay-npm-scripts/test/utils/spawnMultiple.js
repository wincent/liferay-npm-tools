/**
 * © 2019 Liferay, Inc. <https://liferay.com>
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

describe('spawnMultiple()', () => {
	let log;
	let spawnMultiple;
	let SpawnError;

	beforeEach(() => {
		jest.mock('../../src/utils/log');

		log = require('../../src/utils/log');
		spawnMultiple = require('../../src/utils/spawnMultiple');
		({SpawnError} = require('../../src/utils/spawnSync'));
	});

	it('succeeds when all jobs succeed', () => {
		expect(() => spawnMultiple(() => {}, () => {})).not.toThrow();
	});

	it('allows all jobs to run even if one fails', () => {
		const jobs = [
			jest.fn(),
			jest.fn(() => {
				throw new SpawnError('Boom');
			}),
			jest.fn()
		];

		expect(() => spawnMultiple(...jobs)).toThrow(SpawnError);

		expect(jobs[0]).toBeCalled();
		expect(jobs[1]).toBeCalled();
		expect(jobs[2]).toBeCalled();
	});

	it('aborts immediately given a non-SpawnError error', () => {
		const jobs = [
			jest.fn(),
			jest.fn(() => {
				throw new Error('Boom');
			}),
			jest.fn()
		];

		expect(() => spawnMultiple(...jobs)).toThrow(Error);

		expect(jobs[0]).toBeCalled();
		expect(jobs[1]).toBeCalled();
		expect(jobs[2]).not.toBeCalled();
	});

	it('logs the text of a SpawnError', () => {
		expect(() =>
			spawnMultiple(() => {
				throw new SpawnError('Foo');
			})
		).toThrow();

		expect(log).toBeCalledWith('Foo');
	});

	it('re-throws a SpawnError containing a summary', () => {
		expect(() =>
			spawnMultiple(
				() => {},
				() => {
					throw new SpawnError('Boom');
				}
			)
		).toThrow(/1 of 2 jobs failed/);
	});
});
