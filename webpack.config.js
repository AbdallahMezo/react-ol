/* eslint-disable */
var path = require('path');
var webpack = require('webpack');
var config = {
	entry: './src/index.ts',
	output: {
		path: path.join(__dirname, 'dist'),
		filename: 'wakecap-ol.umd.js',
		library: 'wakecap-ol',
		libraryTarget: 'umd'
	},
	devtool: 'source-map',
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.json', '.css', '.html'],
		alias: {
			'wakecap-ol': path.join(__dirname, 'src', 'index.ts')
		}
	},
	module: {
		rules: [
			{ test: /\.(ts|tsx)$/, use: 'ts-loader' },
			{ test: /\.css$/, use: [{ loader: 'style-loader' }, { loader: 'css-loader' }] },
			{ test: /\.html/, use: 'html-loader' },
			{ test: /\.tsx?$/, use: 'ts-loader' }
		]
	}
};

module.exports = config;
