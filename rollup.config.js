import typescript from '@rollup/plugin-typescript';
import commonjs from 'rollup-plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import resolve from 'rollup-plugin-node-resolve';
import url from 'rollup-plugin-url';
import svgr from '@svgr/rollup';
import pkg from './package.json';

export default {
	input: 'src/index.ts',
	output: [
		{
			file: pkg.main,
			format: 'cjs',
			exports: 'named',
			sourcemap: true
		},
		{
			file: pkg.module,
			format: 'es',
			exports: 'named',
			sourcemap: true
		}
	],
	external: ['uuid'],
	plugins: [
		external(),
		url(),
		svgr(),
		resolve(),
		typescript(),
		commonjs()
	]
};
