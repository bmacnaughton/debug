/* eslint-env mocha */

const assert = require('assert');
const debug = require('./src');
const util = require('util');

describe('debug', () => {
	it('passes a basic sanity check', () => {
		const log = debug('test');
		log.enabled = true;
		log.log = () => {};

		assert.doesNotThrow(() => log('hello world'));
	});

	it('allows namespaces to be a non-string value', () => {
		const log = debug('test');
		log.enabled = true;
		log.log = () => {};

		assert.doesNotThrow(() => debug.enable(true));
	});

	it('honors global debug namespace enable calls', () => {
		assert.deepStrictEqual(debug('test:12345').enabled, false);
		assert.deepStrictEqual(debug('test:67890').enabled, false);

		debug.enable('test:12345');
		assert.deepStrictEqual(debug('test:12345').enabled, true);
		assert.deepStrictEqual(debug('test:67890').enabled, false);
	});

	it('uses custom log function', () => {
		const log = debug('test');
		log.enabled = true;

		const messages = [];
		log.log = (...args) => messages.push(args);

		log('using custom log function');
		log('using custom log function again');
		log('%O', 12345);

		assert.deepStrictEqual(messages.length, 3);
	});

	describe('extend namespace', () => {
		it('should extend namespace', () => {
			const log = debug('foo');
			log.enabled = true;
			log.log = () => {};

			const logBar = log.extend('bar');
			assert.deepStrictEqual(logBar.namespace, 'foo:bar');
		});

		it('should extend namespace with custom delimiter', () => {
			const log = debug('foo');
			log.enabled = true;
			log.log = () => {};

			const logBar = log.extend('bar', '--');
			assert.deepStrictEqual(logBar.namespace, 'foo--bar');
		});

		it('should extend namespace with empty delimiter', () => {
			const log = debug('foo');
			log.enabled = true;
			log.log = () => {};

			const logBar = log.extend('bar', '');
			assert.deepStrictEqual(logBar.namespace, 'foobar');
		});

		it('should keep the log function between extensions', () => {
			const log = debug('foo');
			log.log = () => {};

			const logBar = log.extend('bar');
			assert.deepStrictEqual(log.log, logBar.log);
		});
	});

	describe('rebuild namespaces string (disable)', () => {
		it('handle names, skips, and wildcards', () => {
			debug.enable('test,abc*,-abc');
			const namespaces = debug.disable();
			assert.deepStrictEqual(namespaces, 'test,abc*,-abc');
		});

		it('handles empty', () => {
			debug.enable('');
			const namespaces = debug.disable();
			assert.deepStrictEqual(namespaces, '');
			assert.deepStrictEqual(debug.names, []);
			assert.deepStrictEqual(debug.skips, []);
		});

		it('handles all', () => {
			debug.enable('*');
			const namespaces = debug.disable();
			assert.deepStrictEqual(namespaces, '*');
		});

		it('handles skip all', () => {
			debug.enable('-*');
			const namespaces = debug.disable();
			assert.deepStrictEqual(namespaces, '-*');
		});

		it('names+skips same with new string', () => {
			debug.enable('test,abc*,-abc');
			const oldNames = [...debug.names];
			const oldSkips = [...debug.skips];
			const namespaces = debug.disable();
			assert.deepStrictEqual(namespaces, 'test,abc*,-abc');
			debug.enable(namespaces);
			assert.deepStrictEqual(oldNames.map(String), debug.names.map(String));
			assert.deepStrictEqual(oldSkips.map(String), debug.skips.map(String));
		});
	});

	describe('custom formatters', () => {

		it('handles formatters', () => {
			const log = debug('test');
			debug.formatters.x = (v) => (v ** 2).toString();
			log.enabled = true;

			const messages = [];
			const escSeqs = /\x1b\[(.+?)\d+m/g;
			log.log = (...args) => {
				args[0] = args[0].replace(escSeqs, '');
				messages.push(util.format.apply(null, args));
			};

			const tests = [
				['pretty-print single line %o', {single: 'line'}],
				['insert a string %s', 'here'],
				['insert a number %d', 42],
				['insert json %j', {json: {object: 'here'}}],
				['insert a single %% sign'],
				['format something else %x', 12],
			];
			const expected = [
				'pretty-print single line {single: \'line\'}',
				'insert a string here',
				'insert a number 42',
				'insert json {"json": {"object": "here"}}',
				'insert a single % sign',
				'format something else 144',
			];

			for (let i = 0; i < tests.length; i++) {
				log.apply(null, tests[i]);
				assert.deepStrictEqual(messages[i], expected[i]);
			}
		});
	});
});
