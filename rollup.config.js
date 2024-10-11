import babel from 'rollup-plugin-babel';
import ts from 'rollup-plugin-ts';
import { eslint } from 'rollup-plugin-eslint';
import process from 'process';
import { uglify } from 'rollup-plugin-uglify';
import fs from 'fs';
import path from 'path';

const isDev = process.argv.indexOf('-w') !== -1;

const tasks = [];

const dir = './dist'

if (!isDev) {
    tasks.push({
        input: `./src/index.ts`,
        plugins: [
            eslint({
                fix: true
            }),
            ts(),
            babel(),
            uglify()
        ],
        output: {
            file: path.join(dir, 'index.js'),
            format: 'iife',
            sourcemap: false,
            strict: true,
            name: 'index'
        }
    });
    // fs.mkdirSync(dir, { recursive: true });
} else {
    tasks.push({
        input: `./src/index.ts`,
        plugins: [
            eslint({
                fix: true
            }),
            ts(),
            babel()
        ],
        output: {
            file: path.join(dir, 'index.js'),
            format: 'iife',
            sourcemap: false,
            strict: true,
            name: 'index'
        }
    });
}

export default tasks;
