import path from 'path';

import {Configuration} from 'webpack';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

const configuration: Configuration = {
    entry: {
        app: path.resolve('src/app.ts'),
        authorizer: path.resolve('src/authorizer.ts'),
        import: path.resolve('src/import.ts'),
        vote: path.resolve('src/vote.ts'),
    },
    resolve: {
        extensions: [
            '.ts',
            '.js',
        ],
    },
    output: {
        path: path.resolve('dist'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    target: 'node',
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    transpileOnly: true,
                },
            },
        ],
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin(),
    ],
};

export default configuration;